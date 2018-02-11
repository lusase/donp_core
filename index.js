const danmuService = require('./app/service/danmu')
const douyu_danmu = require('./app/common/danmu')

const client = new douyu_danmu('71017')

client.on('connect', () => {
  console.log('=================弹幕已经连接==================')
})

client.on('message', async (msg) => {
  switch (msg.type) {
    case 'chat':
      console.log(`[${msg.from.name}]: ${msg.content}`)
      break
  }
  await danmuService.insertOrUpdateUser(msg.from)
})

client.start()
