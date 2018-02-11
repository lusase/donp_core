const mysql = require('../common/mysql')

exports.insertUser = async user => {
  await mysql.query('insert into dy_user set ? ', {
    u_id: user.rid,
    u_name: user.name,
    u_level: user.level,
    noble_level: user.nl,
    latest_time: new Date()
  })
}

exports.updateUser = async user => {
  await mysql.query('update dy_user set ? where id = ?', [{
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

