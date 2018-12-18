const EventEmiter = require('events')
const schedule = require('node-schedule')

class Timer extends EventEmiter {
	constructor() {
		super()
		schedule.scheduleJob('0 */5 * * * *', () => {
	       this.emit('flush')
	    })
	}
}

const timer = new Timer()

module.exports = timer
