const net = require('net')
const url = require('url')
const events = require('events')
const socks = require('socks')
const socks_agent = require('socks-proxy-agent')
const r = require('./r')
const {giftStore} = require('../store/index')

const timeout = 30000
const danmu_port = 8601
const heartbeat_interval = 45000
const fresh_gift_interval = 60*60*1000
const danmu_addr = 'openbarrage.douyutv.com'
const free_gift = {name: '免费礼物', pc: 0, type: 1, id: -1}


class douyu_danmu extends events {

  constructor(opt) {
    super()
    if (typeof opt === 'string') {
      this._roomid = opt
    } else if(typeof opt === 'object') {
      this._roomid = opt.roomid
      this.set_proxy(opt.proxy)
    }
  }

  set_proxy(proxy) {
    const proxy_obj = url.parse(proxy)
    this._agent = new socks_agent(proxy)
    this._proxy_opt = {
      timeout,
      command: 'connect',
      destination: {host: danmu_addr, port: danmu_port},
      proxy: {iparress: proxy_obj.hostname, port: parseInt(proxy_obj.port), type: 5}
    }
    if (proxy_obj.auth) {
      const auth = proxy_obj.auth.split(':')
      this._proxy_opt.userId = auth[0]
      this._proxy_opt.password = auth[1]
    }
  }

  async _get_gift_info() {
    const danmuService = require('../service/danmu')
    try {
      const body_p = r({
        url: `http://open.douyucdn.cn/api/RoomApi/room/${this._roomid}`,
        agent: this._agent
      })
      const res_p = danmuService.getGiftInfo()

      const [body, res] = await Promise.all([body_p, res_p])

      res.forEach(g => giftStore.add(g))

      body.data.gift.forEach(async g => {
        const _g = {name: g.name, pc: g.pc, id: g.id, type: g.type}
        const g1 = giftStore.find(_g)
        if (g1) {
          if (g1.name !== g.name || g1.type !== g.type || g1.pc !== g.pc) {
            await danmuService.updateGiftInfo(_g)
          }
        } else {
          giftStore.add(_g)
          await danmuService.insertGiftInfo(_g)
        }
      })
      return giftStore
    } catch(e) {
      console.log('_get_gift_info 出错', e)
    }
  }

  async _fresh_gift_info() {
    const gift_info = await this._get_gift_info()
    if (!gift_info) {
      this.emit('error', new Error('Fail to fresh room info'))
      this.emit('close')
      return Promise.reject('-------无法获取礼物信息--------')
    }
  }

  async start() {
    if (this._starting) return
    this._starting = true
    await this._fresh_gift_info()
    this._fresh_gift_info_timer = setInterval(this._fresh_gift_info.bind(this), fresh_gift_interval)
    this._start_tcp()
  }

  async _start_tcp() {
    this._all_buf = Buffer.alloc(0)
    if (this._proxy_opt) {
      try {
        const info = await socks.createConnection(this._proxy_opt)
        this._client = info.socket
        this._on_connect()
      } catch (e) {
        this._stop()
        this.emit('close')
        this.emit('error', e)
      }
    } else {
      this._client = new net.Socket()
      this._client.connect(danmu_port, danmu_addr)
      this._client.on('connect', this._on_connect.bind(this))
    }
    if (this._client) {
      this._client.on('error', err => {
        console.log('------------连接出错: ', err)
        this.emit('error', err)
      })
      this._client.on('close', async () => {
        console.log('------------连接关闭-------------')
        this._stop()
        this.emit('close')
      })
      this._client.on('data', this._on_data.bind(this))
    }
  }

  _on_connect() {
    this._login_req()
    this._heartbeat_timer = setInterval(this._heartbeat.bind(this), heartbeat_interval)
    this.emit('connect')
  }

  _login_req () {
    this._send(`type@=loginreq/roomid@=${this._roomid}/`)
  }

  _join_group() {
    this._send(`type@=joingroup/rid@=${this._roomid}/gid@=-9999/`)
  }

  _heartbeat() {
    this._send('type@=mrkl/')
  }

  _on_data(data) {
    this._all_buf = this._all_buf.length === 0 ? data : Buffer.concat([this._all_buf, data])
    while (this._all_buf.length > 8) {
      try {
        const len_0 = this._all_buf.readInt16LE(0)
        const len_1 = this._all_buf.readInt16LE(4)
        const msg_len = len_0 + 4
        if (len_0 !== len_1) return this._all_buf = Buffer.alloc(0)
        if (this._all_buf.length < msg_len) return
        const single_msg = this._all_buf.slice(0, msg_len)
        const single_msg_tail = single_msg[single_msg.length - 1]
        if (single_msg_tail !== 0) return this._all_buf = Buffer.alloc(0)
        this._all_buf = this._all_buf.slice(msg_len)
        const msg_array = single_msg.toString().match(/(type@=.*?)\x00/g)
        if (!msg_array) continue
        msg_array.forEach(msg => {
          msg = msg.replace(/@=/g, '":"')
          msg = msg.replace(/\//g, '","')
          msg = msg.substring(0, msg.length - 3)
          msg = `{"${msg}}`
          this._format_msg(msg)
        })
      } catch (e) {
        this.emit('error', e)
      }
    }
  }

  _format_msg(msg) {
    try {
      msg = JSON.parse(msg.replace(/\\/g, ''))
    }catch (e) { return }
    let msg_obj
    switch(msg.type) {
      case 'chatmsg':
        msg_obj = this._build_chat(msg)
        this.emit('message', msg_obj)
        break
      case 'dgb':
        msg_obj = this._build_gift(msg)
        this.emit('message', msg_obj)
        break
      case 'bc_buy_deserve':
        msg_obj = this._build_deserve(msg)
        this.emit('message', msg_obj)
        break
      case 'loginres':
        this._join_group()
        break
      case 'uenter':
	// console.log('uenter')
	msg_obj = {type: msg.type, from: this._build_user(msg)}
        this.emit('message', msg_obj)
	break
      default:
        //msg_obj = {type: msg.type, from: this._build_user(msg)}
        //this.emit('message', msg_obj)
    }
  }

  _build_user(msg) {
    return {
      name: msg.nn || '',
      rid: msg.uid,
      level: Number(msg.level) || 0,
      nl: Number(msg.nl) || 0,
    }
  }

  _build_chat(msg) {
    let plat = 'pc_web'
    if (msg.ct == '1') {
      plat = 'android'
    } else if(msg.ct == '2') {
      plat = 'ios'
    }
    return {
      type: 'chat',
      time: Date.now(),
      from: Object.assign({plat}, this._build_user(msg)),
      id: msg.cid,
      content: msg.txt
    }
  }

  _build_gift(msg) {
    const gift = giftStore.get(msg.gfid) || free_gift
    const count = parseInt(msg.gfcnt || 1)
    const msg_obj = {
      type: 'gift',
      time: Date.now(),
      name: gift.name,
      from: this._build_user(msg),
      id: `${msg.uid}${msg.rid}${msg.gfid}${msg.hits}${msg.level}`,
      count,
      price: count * gift.pc,
      earn: count * gift.pc,
      isFree: gift.type === 1
    }
    return msg_obj
  }

  _build_deserve(msg) {
    let name = '初级酬勤'
    let price = 15
    if(msg.lev === '2') {
      name = '中级酬勤'
      price = 30
    } else if (msg.lev === '3') {
      name = '高级酬勤'
      price = 50
    }
    let sui = msg.sui
    try {
      sui = sui.replace(/@A=/g, '":"')
      sui = sui.replace(/@S/g, '","')
      sui = sui.substring(0, sui.length - 2)
      sui = `{"${sui}}`
      sui = JSON.parse(sui)
    } catch (e) {
      sui = {
        nick: '',
        id: '',
        level: 0
      }
    }
    return {
      type: 'deserve',
      time: Date.now(),
      name,
      from: this._build_user({
        nn: sui.nick,
        uid: sui.id,
        level: sui.level
      }),
      id: '${sui.id}${msg.rid}${msg.lev}${msg.hits}${sui.level}${sui.exp}',
      count: parseInt(msg.cnt || 1),
      price,
      earn: price
    }
  }

  _send(msg) {
    try {
      const len = Buffer.byteLength(msg) + 9
      const buf = Buffer.concat([Buffer.from([len, 0x00, 0x00, 0x00, len, 0x00, 0x00, 0x00, 0xb1, 0x02, 0x00, 0x00]), Buffer.from(msg), Buffer.from([0x00])])
      this._client.write(buf)
    } catch (e) {
      this.emit('error', e)
    }
  }

  _stop() {
    this._starting = false
    clearInterval(this._heartbeat_timer)
    clearInterval(this._fresh_gift_info_timer)
    try { this._client.destroy() } catch (e) {}
  }

  stop() {
    this.removeAllListeners()
    this._stop()
  }
  restart() {
    this.stop()
    setTimeout(() => this.start())
  }
}

module.exports = douyu_danmu
