const mysql = require('mysql')

const config = require('../../config/config.default')

const pool = mysql.createPool(config.mysql)

exports.query = function(...args) {
  return new Promise((resolve, reject) => {
    pool.getConnection(function(err, connection) {
      connection.query(...args, function(error, results) {
        connection.release()
        if(error) reject(error)
        resolve(results)
      })
    })
  })
}