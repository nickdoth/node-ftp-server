import * as net from 'net';
import { FtpConnection } from './ftpd';
import * as Debug from 'debug';

interface PassiveDataSocket extends net.Socket {
  /** 
   * 标记是否收到ABOR指令
   */
  isAbor: boolean;
  /** 
   * 传输过程发生的错误
   */
  error: any;
}

var debug = Debug('passiveDT');


/**
 * 被动数据传输
 * @param conn Ftp连接
 * @param ipv6 是否需要兼容ipv6. EPSV指令需要将此项设置为true 
 */
export default function passiveDT(conn: FtpConnection, ipv6: boolean) {
  var dataServer = net.createServer();
  conn.passive = true;

  var serverTimeout = setTimeout(() => {
    debug('A passive server expires timeout:', dataServer.address().port);
    dataServer.close();
  }, 60000);

  dataServer.on('connection', function (dataSocket: PassiveDataSocket) {
    /**
     * 通常, 客户端在PASV请求得到回应后会立即尝试与服务器建立FTP-DATA连接;
     * 此时由于客户端还没有请求具体的数据传输指令(如LIST和RETR), 因此数据传输队列为空.
     * 所以在connection事件emit后, 如果队列为空(通常如此...), 则等待事件化的队列触发push(入队)事件, 然后再执行具体的传输操作.
     */
    clearTimeout(serverTimeout);
    dataSocket.setEncoding('binary');
    debug('A client is requseting for data transferring...');
   

    var execute = conn.transferQueue.shift();
    if(execute) {
      // 客户端在发送RETR等指令**之后**请求数据传输, 立即执行队列中的指令.
      execute.call(dataSocket);
    }    
    else {
      // 客户端在发送RETR等指令**之前**请求数据传输, 等待指令进入队列.
      conn.transferQueue.once('push', function() {
        execute = conn.transferQueue.shift();
        execute && execute.call(dataSocket);
      });
    }

    /** 
     * 接受控制通道的ABOR指令
     */
    function onDataAbort() {
      // dataSocket.end();
      dataSocket.isAbor = true;
    }
    
    dataSocket.on('close', function() {
      debug('data channel closed.');
      conn.seek = 0;
      conn.reply((dataSocket.error && !dataSocket.isAbor) ? 426 : 226);
      conn.removeListener('data-abort', onDataAbort);
      dataServer.close();
    }).on('error', function(err) {
      debug('dataSocket error:', err);
      // this.error = err //err.code
      // conn.reply(500, err.toString())
    });

    conn.on('data-abort', onDataAbort);
  }).on('listening', function () {
    var port = dataServer.address().port
      , host = conn.socket.localAddress;

    if (!ipv6) {
      conn.reply(227,
        'PASV OK (' + host.split('.').join(',') + ',' +
        Math.floor(port / 256) + ',' + (port % 256) + ')');
    }
    else {
      conn.reply(229, 'EPSV OK (|||' + port + '|)');
    }
    
    
  });

  dataServer.listen(null);
}