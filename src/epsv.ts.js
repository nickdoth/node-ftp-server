var net = require('net')

module.exports = function(server) {
	server.on('connection', function (socket) {
		socket.epsv = false
	})
}

module.exports.commands = {
	"EPSV": function (protocol) { // Enter ex-passive mode
	  var socket = this
	    , dataServer = net.createServer()
	  socket.passive = true
	  socket.epsv = true
	  dataServer.on('connection', function (dataSocket) {
	    dataSocket.setEncoding(socket.dataEncoding)
	    console.log('客户端请求数据传输');
	    /**
	     * 通常, 客户端在PASV请求得到回应后会立即尝试与服务器建立FTP-DATA连接;
	     * 此时由于客户端还没有请求具体的数据传输指令(如LIST和RETR), 因此数据传输队列为空.
	     * 所以在connection事件emit后, 如果队列为空(通常如此...), 则等待事件化的队列触发push(入队)事件, 然后再执行具体的传输操作.
	     */

	    // 客户端在发送RETR等指令**之后**请求数据传输, 立即执行队列中的指令.
	    var execute = socket.dataTransfer.queue.shift()
	    if(execute) {
	      console.log('执行数据传输')
	      execute.call(dataSocket)
	    }
	    // 客户端在发送RETR等指令**之前**请求数据传输, 等待指令进入队列.
	    else {
	      socket.dataTransfer.queue.once('push', function() {
	        execute = socket.dataTransfer.queue.shift()
	        console.log('完成等待, 执行数据传输')
	        execute && execute.call(dataSocket)
	      })
	    }

	    dataSocket.on('close', function () {
	      console.log('data channel closed.');
	      socket.reply(this.error ? 426 : 226)
	      dataServer.close()
	    }).on('error', function (err) {
	      console.log('dataSocket error:',err)
	      this.error = err //err.code || 
	      socket.reply(500, err.message)
	    })
	  }).on('listening', function () {
	    var port = this.address().port
	      , host = socket.localAddress
	    socket.dataInfo = { "host": host, "port": port }
	    socket.reply(229, 'EPSV OK (|||'+port+'|)')
	  }).listen()
  }
}