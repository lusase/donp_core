const request = require('request-promise')
const timeout = 30000
const r = request.defaults({json: true, gzip: true, timeout})
module.exports = r