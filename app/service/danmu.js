const mysql = require('../common/mysql')

exports.insertUser = async user => {
  try {
    await mysql.query('insert into dy_user set ? ', {
      u_id: user.rid,
      u_name: user.name,
      u_level: user.level,
      noble_level: user.nl,
      latest_time: new Date()
    })
  } catch(e) {
    console.log(`插入用户表错误: ${e.message}`)
  }
  
}

exports.updateUser = async user => {
  await mysql.query('update dy_user set ? where u_id = ?', [{
    u_name: user.name,
    u_level: user.level,
    noble_level: user.nl,
    latest_time: new Date()
  }, user.rid] )
}

exports.findUserById = async user => {
  const res = await mysql.query('select * from dy_user where u_id = ?', [user.rid])
  return res ? res[0] : undefined
}

exports.insertOrUpdateUser = async user => {
  const u = await this.findUserById(user)
  if (u) {
    await this.updateUser(user)
  } else {
    await this.insertUser(user)
  }
}
exports.insertDmCount = async obj => {
  await mysql.query('insert into danmu_count set ?', obj)
}

exports.insertPaidGift = async obj => {
  await mysql.query('insert into paid_gift set ?', obj)
}

exports.insertFreeGift = async obj => {
  await mysql.query('insert into free_gift set ?', obj)
}
exports.getGiftInfo = async () => {
  return await mysql.query('select * from gifts')
}

exports.insertGiftInfo = async (gift) => {
  await mysql.query('insert into gifts set ?', gift)
}

exports.updateGiftInfo = async (gift) => {
  const {id, ...rest} = gift
  await mysql.query('update gifts set ? where id = ?', [rest, id])
}
