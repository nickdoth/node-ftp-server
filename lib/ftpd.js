var path = require('path')
  , net = require('net')
  , EventedQueue = require('./evented-queue')
  //, server = module.exports = net.createServer()
  , protocol = require('./protocol')
  , replyHelper = require('./reply-helper')
  , commandFilter = require('./command-filter')
/**
 * FS emulator
 */
var fsWrapper = require('./fs')
var commands = protocol.commands
  , messages = protocol.messages

var debug = require('./debug')('ftpd')
// var console = { log: function(){} };

exports.filesystem = function(rootPath) {
    return function(server) {
        server.getFileSystem = function() {
          return new fsWrapper.Filesystem(rootPath)
        }
    }
}

exports.createServer = function() {
    var server = net.createServer();
    server.protocol = protocol;

    server.feats = {
      'UTF8': true,
      'SIZE': true
    }
    
    // server.fsOptions = {}
    /**
     * Patch server.close
     */
    server.closing = false
    var original_server_close = server.close
    server.close = function () {
      this.closing = true
      original_server_close.call(this)
    }

    /**
     * Some information when listening (should be removed)
     */
    server.on('listening', function () {
      debug('info', 'Server listening on ' + server.address().address + ':' + server.address().port)
    })

    /**
     * When server receives a new client socket
     */
    server.on('connection', function (socket) {
      var debug = require('./debug')('client' + socket.remoteAddress + ':' + socket.remotePort)

      /**
       * Configure client connection info
       */
      server.emit('connection-init', socket)

      debug('request accepted')
      socket.setTimeout(0)
      socket.setNoDelay()
      socket.dataEncoding = "binary"
      socket.passive = false
      socket.dataInfo = null
      socket.username = null

      /**
       * Initialize filesystem
       */
      socket.fs = server.getFileSystem()
      // Catch-all
      socket.fs.onError = function (err) {
        if (!err.code) err.code = 550
        socket.reply(err.code, err.message)
      }

      /**
       * Socket write logger
       */
      var socket_write = socket.write;
      socket.write = function(data, callback) {
        socket_write.call(socket, data, callback)
        debug('info', '[Res]', data.toString().replace('\r\n', ''))
      }

      /**
       * Socket response shortcut
       */
      socket.server = server

      /**
       * FTP reply method
       */
      socket.reply = function (status, message, callback) {
        if (!message) message = messages[status.toString()] || 'No information'
        this.write(status.toString() + ' ' + message.toString() + '\r\n', callback)
      }

      /**
       * Data transfer
       */
      socket.dataTransfer = function (handle) {
        function finish (dataSocket) {
          return function (err) {
            if (err) {
              dataSocket.emit('error', err)
            } else {
              dataSocket.end()
            }
          }
        }
        function execute () {
          socket.reply(150)
          handle.call(socket, this, finish(this))
        }
        // Will be unqueued in PASV command
        debug('info', 'DataTransfer by', socket.passive? 'Passive Mode.' : 'Active Mode.')
        if (socket.passive ||1) {
          socket.dataTransfer.queue.push(execute)
        }
        // Or we initialize directly the connection to the client
        else {
          var dataSocket = new net.Socket()
          dataSocket.on('connect', execute)
          debug('warn', 'PORT', socket.activeHost, socket.activePort)
          dataSocket.connect({
            port: socket.activePort,
            host: socket.activeHost,
            localAddress: '192.168.23.1',
            localPort: 20
          })
        }
      }
      socket.dataTransfer.queue = new EventedQueue();

      /**
       * When socket has established connection, reply with a hello message
       */
      socket.on('connect', function () {
        
      })
      
      setTimeout(function() {
            debug('220!\n');
            socket.reply(220);
        }, 100);

      /**
       * Received a command from socket
       */
      socket.on('data', function (chunk) {
        /**
         * If server is closing, refuse all commands
         */
        if (server.closing) {
          socket.reply(421)
        }
        /**
         * Parse received command and reply accordingly
         */
        debug('info', '[Req]', chunk.toString().replace('\r\n', ''));
        var parts = trim(chunk.toString()).split(" ")
          , command = trim(parts[0]).toUpperCase()
          , args = parts.slice(1, parts.length)
          , callable = server.extendedCommands[command] || commands[command]
        
        if (!callable) {
          socket.reply(502)
        } else {
          //[mod] callable will get a wrong filename when the filename contains ' ';
          server.emitFilter(socket, command, args, function (err) {
            err || callable.call(socket, args.join(' '))
          });
          
        }
      })
      
      socket.on('close', function(err) {
        debug('指令信道关闭.');
        if(err) {
            debug('warn', 'socket close', err);
        }
        // socket.fs = server.getFileSystem()
        socket.fs = null
      })
      
      //[mod] handle socket errors.
      socket.on('error', function(err){
        debug('warn', 'accepted socket error:', err);
      });
    })
    
    // [mod]增加use方法
    server.extendedCommands = {};
    server.use = function(plugin) {
      plugin(server);
      if(typeof plugin.commands === 'object') {
        for(var n in plugin.commands) {
          if(plugin.commands.hasOwnProperty(n)) {
            server.extendedCommands[n] = plugin.commands[n];
          }
        }
      }
    }

    /**
     * Using reply helper by default.
     */
    server.use(commandFilter)
    server.use(replyHelper)

    return server;
}


function trim (string) {
  return string.replace(/^\s+|\s+$/g,"")
}

// if (!module.parent) {
//   server.fsOptions.root = path.resolve(__dirname, '..', 'test', 'data')
//   server.listen(21)
// }