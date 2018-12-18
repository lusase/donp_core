const danmuService = require('./app/service/danmu')
const douyu_danmu = require('./app/common/danmu')
const ChatHandler = require('./app/common/chatHandler')
const GiftHandler = require('./app/common/giftHandler')

const client = new douyu_danmu('71017')
let inConnect = false
let timer
const monitor = () => {
  if(timer) clearTimeout(timer)
  timer = setTimeout(() => {
    client.restart()
  }, 600000)
}

let chatHandler, giftHandler



client.on('connect', () => {
  console.log('=================弹幕已经连接==================')
  inConnect = true
  !chatHandler && (chatHandler = new ChatHandler(client._roomid))
  !giftHandler && (giftHandler = new GiftHandler(client._roomid))
})


client.on('message', async (msg) => {
  switch (msg.type) {
    case 'chat':
      chatHandler.push(msg)
      break
    case 'gift':
    case 'yuwan':
      giftHandler.push(msg)
      break
  }
  await danmuService.insertOrUpdateUser(msg.from)
  inConnect = true
  monitor()
})

const restartFn = () => {
  if (!inConnect) {
    client.start()
    setTimeout(restartFn, 10000)
  }
}

client.on('error', e => {
  client.stop()
  inConnect = false
  console.log('----------10s 后尝试重连-----------')
  setTimeout(restartFn, 10000)
})

client.on('close', e => {
  inConnect = false
  console.log('----------30s 后尝试重连-----------')
  setTimeout(restartFn, 30000)
})

client.start()
