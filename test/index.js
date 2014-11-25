var ftp = require('..')

var server = ftp.createServer()
var staticFs = ftp.wares.staticFs({ root: './data' })


server.use(ftp.wares.userControl)
server.use(ftp.wares.epsv)
server.use(staticFs)


server.on('connection', function (socket) {
  var isLogin = false

  socket.on('user:loginStart', function (username, success, fail) {
    if(username === 'nick') {
      success()
    }
    else {
      fail()
    }
  })

  socket.on('user:password', function (passwd, success, fail) {
    if (passwd === '000000') {
      isLogin = true
      success()
    }
    else {
      fail()
    }
  })

  socket.on('user:requestPermission', function (command, args, permit, deny) {
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
