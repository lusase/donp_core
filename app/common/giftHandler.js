const timer = require('./timer')
const danmuService = require('../service/danmu')

class GiftHandler {
  constructor(room_id) {
    this.room_id = room_id
    this.gf_amount = 0
    this.yw_amount = 0
    this.users = new Set()
    this.startSchedule()
  }
  push(msg) {
    if (msg.price >= 1) {
      danmuService.insertPaidGift({
        gift_name: msg.name,
        gift_price: msg.price,
        user_id: msg.from.rid,
        room_id: this.room_id,
        create_time: new Date()
      })
    } else {
      if(msg.type === 'yuwan') {
        this.yw_amount++
      } else {
        this.gf_amount++
      }
      this.users.add(msg.from.rid)
    }
  }
  async flush() {
    await danmuService.insertFreeGift({
      room_id: this.room_id,
      gf_amount: this.gf_amount,
      yw_amount: this.yw_amount,
      user_amount: this.users.size,
      create_time: new Date(),
    })
    this.gf_amount = 0
    this.yw_amount = 0
    this.users.clear()
  }
  startSchedule() {
    timer.on('flush', () => {
      this.flush()
    })
  }
}
module.exports = GiftHandler