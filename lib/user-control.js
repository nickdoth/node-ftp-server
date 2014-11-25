var debug = require('./debug')('Auth')

module.exports = function (server) {

  server.on('connection_init', function (socket) {
    socket.user = null;
  })
  
  server.addCommandFilter(function (socket, command, args, next) {
    if (command in commands) {
      return next()
    }

    
    socket.emit('user:isLogin', yes, no)

    function yes () {
      socket.emit('user:requestPermission', command, args, commandPermit, commandDeny, socket)
    }

    function no () {
      socket.reply(220, 'You have not login yet.')
      next(new Error())
    }

    function commandPermit () {
      next()
    }

    function commandDeny () {
      socket.reply(550, 'Permittion denied.')
      next(new Error())
    }

    // _listenOnce(socket, 'user:isLogin')
    // _listenOnce(socket, 'user:requestPermittion')
    // _listenOnce(socket, 'user:password')
    // _listenOnce(socket, 'user:loginStart')

  })


  

}

var commands = module.exports.commands = {
  'USER': function(name) {
    var socket = this
    
    
    socket.emit('user:loginStart', name, success, failed, socket)

    function success () {
      socket.userOk()
    }

    function failed () {
      socket.authFail()
    }
  },

  'PASS': function(passwd) {
    var socket = this
    
    
    socket.emit('user:password', passwd, success, failed, socket)

    function success () {
      socket.passOk()
    }

    function failed () {
      socket.authFail()
    }
  }
}


var userList = {
  'nick' : {
    'passwd' : '10086',
    'blocked_commands': ['DELE', 'STOR']
  }
}

function isBlockedCommand(user, command) {
  var arr = user['blocked_commands']
  if(!arr) {
    return false
  }

  for(var i = 0, l = arr.length; i < l; i++) {
    if(arr[i] === command) {
      return true
    }
  }

  return false
}


function _listenOnce (emitter, event) {
  var isListened = false
  emitter.on('newListener', function (eventName, listener) {
    if(isListened && (eventName === event)) {
      throw new Error(event + ': event should not be listened twice.')
      return
    }
    if(event === eventName) {
      isListened = true
    }
  })
}