var ftp = require('..')

var simpleFs = ftp.wares.staticFs({ root: './data' })

var server = ftp.createServer()

server.use(ftp.wares.userControl)
server.use(ftp.wares.epsv)
server.use(simpleFs)


server.on('connection', function (socket) {
  socket.on('user:loginStart', function (username, success, fail) {
    if(username === 'nick') {
      success()
    }
    else {
      fail()
    }
  })

  socket.on('user:password', function (passwd, success, fail) {
    if (passwd === '10086') {
      isLogin = true
      success()
    }
    else {
      fail()
    }
  })

  socket.on('user:requestPermittion', function (command, args, permit, deny) {
    if (command === 'DELE' || command === 'STOR') {
      deny()
    }
    else {
      permit()
    }
  })

  socket.on('user:isLogin', function (yes, no) {
    isLogin? yes() : no()
  })
})

server.listen(21)
