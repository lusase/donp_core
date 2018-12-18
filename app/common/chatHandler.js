const timer = require('./timer')
const danmuService = require('../service/danmu')

class ChatHandler {
  constructor(room_id) {
    this.room_id = room_id
    this.dm_amount = 0
    this.g_dm_amount = 0
    this.users = new Set()
    this.startSchedule()
  }
  push(msg) {
    this.dm_amount++
    if(msg.from.nl && msg.from.nl > 2 && msg.from.nl !== 7){
    	this.g_dm_amount++
    	if(msg.from.nl === 6) {
    	    console.log(`${new Date().toLocaleString()} [${msg.from.name}]: ${msg.content}`)
    	}
    }
    this.users.add(msg.from.rid)
  }
  async flush() {
    await danmuService.insertDmCount({
      room_id: this.room_id,
      dm_amount: this.dm_amount,
      g_dm_amount: this.g_dm_amount,
      user_amount: this.users.size,
      create_time: new Date(),
    })
   console.log(`------${new Date().toLocaleString()}----------普通弹幕数${this.dm_amount} 贵族弹幕数${this.g_dm_amount}------------------`)
    this.dm_amount = 0
    this.g_dm_amount = 0
    this.users.clear()
  }
  startSchedule() {
    timer.on('flush', () => {
      this.flush()
    })
  }
}
module.exports = ChatHandler
