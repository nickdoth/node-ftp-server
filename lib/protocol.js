/// <reference path="../typings/tsd.d.ts" />
var net = require('net');
var unixLs = require('./unix-ls');
/**
 * Standard messages for status (RFC 959)
 */
exports.messages = {
    "200": "Command okay.",
    "500": "Syntax error, command unrecognized.",
    "501": "Syntax error in parameters or arguments.",
    "202": "Command not implemented, superfluous at this site.",
    "502": "Command not implemented.",
    "503": "Bad sequence of commands.",
    "504": "Command not implemented for that parameter.",
    "110": "Restart marker reply.",
    "211": "System status, or system help reply.",
    "212": "Directory status.",
    "213": "File status.",
    "214": "Help message.",
    "215": "NodeFTP server emulator.",
    "120": "Service ready in %s minutes.",
    "220": "Service ready for new user.",
    "221": "Service closing control connection.",
    "421": "Service not available, closing control connection.",
    "125": "Data connection already open; transfer starting.",
    "225": "Data connection open; no transfer in progress.",
    "425": "Can't open data connection.",
    "226": "Closing data connection.",
    "426": "Connection closed; transfer aborted.",
    "227": "Entering Passive Mode.",
    "230": "User logged in, proceed.",
    "530": "Not logged in.",
    "331": "User name okay, need password.",
    "332": "Need account for login.",
    "532": "Need account for storing files.",
    "150": "File status okay; about to open data connection.",
    "250": "Requested file action okay, completed.",
    "257": "\"%s\" created.",
    "350": "Requested file action pending further information.",
    "450": "Requested file action not taken.",
    "550": "Requested action not taken.",
    "451": "Requested action aborted. Local error in processing.",
    "551": "Requested action aborted. Page type unknown.",
    "452": "Requested action not taken.",
    "552": "Requested file action aborted.",
    "553": "Requested action not taken."
};
/**
 * Commands implemented by the FTP server
 */
exports.commands = {
    /**
     * Unsupported commands
     * They're specifically listed here as a roadmap, but any unexisting command will reply with 202 Not supported
     */
    "ABOR": function () { this.reply(202); },
    "ACCT": function () { this.reply(202); },
    "ADAT": function () { this.reply(202); },
    "ALLO": function () { this.reply(202); },
    "APPE": function () { this.reply(202); },
    "AUTH": function () { this.reply(202); },
    "CCC": function () { this.reply(202); },
    "CONF": function () { this.reply(202); },
    "ENC": function () { this.reply(202); },
    "EPRT": function () { this.reply(202); },
    "EPSV": function () { this.reply(202); },
    "HELP": function () { this.reply(202); },
    "LANG": function () { this.reply(202); },
    "LPRT": function () { this.reply(202); },
    "LPSV": function () { this.reply(202); },
    "MDTM": function () { this.reply(202); },
    "MIC": function () { this.reply(202); },
    "MKD": function () { this.reply(202); },
    "MLSD": function () { this.reply(202); },
    "MLST": function () { this.reply(202); },
    "MODE": function () { this.reply(200); },
    "NOOP": function () { this.reply(200); },
    "OPTS": function () { this.reply(202); },
    "REIN": function () { this.reply(202); },
    "STOU": function () { this.reply(202); },
    "STRU": function () { this.reply(202); },
    "PBSZ": function () { this.reply(202); },
    "SITE": function () { this.reply(202); },
    "SMNT": function () { this.reply(202); },
    "RMD": function () { this.reply(202); },
    "STAT": function () { this.reply(202); },
    /**
     * General info
     */
    "FEAT": function () {
        var socket = this;
        var features = socket.server.feats;
        socket.write('211-Extensions supported\r\n');
        for (var n in features) {
            if (features.hasOwnProperty(n) && features[n]) {
                socket.write(' ' + n + '\r\n');
            }
        }
        socket.reply(211, 'End');
    },
    "SYST": function () {
        this.reply(215, 'UNIX Type: L8');
    },
    /**
     * Path commands
     */
    "CDUP": function () {
        exports.commands['CWD'].call(this, '..');
    },
    "CWD": function (dir) {
        var socket = this;
        console.log('chdir', dir);
        socket.fs.chdir(dir, function (err, cwd) {
            if (err) {
                socket.reply(431, err.toString());
                return;
            }
            socket.reply(250, 'Directory changed to "' + cwd + '"');
        });
    },
    "PWD": function () {
        this.reply(257, '"' + this.fs.pwd() + '"');
    },
    "XPWD": function () {
        exports.commands['PWD'].call(this);
    },
    /**
     * Change data encoding
     */
    "TYPE": function (dataEncoding) {
        if (dataEncoding == "A" || dataEncoding == "I") {
            this.dataEncoding = (dataEncoding == "A") ? "utf-8" : "binary";
            this.reply(200);
        }
        else {
            this.reply(501);
        }
    },
    /**
     * Authentication
     */
    "USER": function (username) {
        this.username = username;
        this.reply(331);
    },
    "PASS": function (password) {
        // Automatically accept password
        this.reply(230);
    },
    /**
     * Passive mode
     */
    "PASV": function () {
        var conn = this, dataServer = net.createServer();
        conn.passive = true;
        dataServer.on('connection', function (dataSocket) {
            dataSocket.setEncoding(conn.socket.dataEncoding);
            console.log('客户端请求数据传输');
            // setTimeout(function () {
            // Unqueue method that has been queued previously
            // if (socket.dataTransfer.queue.length) {
            //   socket.dataTransfer.queue.shift().call(dataSocket)
            // } else {
            //   console.log('Err: [似乎]已到达队尾')
            //   //[mod] TODO: It works when I place this into the timer, but I don't know why..
            //   // setTimeout(function() {
            //   socket.dataTransfer.queue.once('unempty', function() {
            //     var execute = socket.dataTransfer.queue.shift()
            //     console.log(execute);
            //     execute && execute.call(dataSocket)
            //   })
            //   // }, 100);
            //   //dataSocket.emit('error', {"code": 421})
            //   //socket.end()
            // }
            // }, 0);
            /**
             * 通常, 客户端在PASV请求得到回应后会立即尝试与服务器建立FTP-DATA连接;
             * 此时由于客户端还没有请求具体的数据传输指令(如LIST和RETR), 因此数据传输队列为空.
             * 所以在connection事件emit后, 如果队列为空(通常如此...), 则等待事件化的队列触发push(入队)事件, 然后再执行具体的传输操作.
             */
            // 客户端在发送RETR等指令**之后**请求数据传输, 立即执行队列中的指令.
            var execute = conn.transferQueue.shift();
            if (execute) {
                execute.call(dataSocket);
            }
            else {
                conn.transferQueue.once('push', function () {
                    execute = conn.transferQueue.shift();
                    execute && execute.call(dataSocket);
                });
            }
            dataSocket.on('close', function () {
                console.log('data channel closed.');
                conn.reply(this.error ? 426 : 226);
                dataServer.close();
            }).on('error', function (err) {
                console.log('dataSocket error:', err);
                this.error = err; //err.code || 
                conn.reply(500, err.toString());
            });
        }).on('listening', function () {
            var port = this.address().port, host = conn.socket.localAddress;
            // socket.dataInfo = { "host": host, "port": port }
            conn.reply(227, 'PASV OK (' + host.split('.').join(',') + ',' + Math.round(port / 256) + ',' + (port % 256) + ')');
            //conn.reply(227, 'PASV OK (192,168,1,23,' + parseInt(port/256,10) + ',' + (port%256) + ')')
            //conn.reply(200);
        });
        dataServer.listen(null);
    },
    /**
     * TODO Active mode
     */
    "PORT": function (info) {
        var socket = this;
        //this.reply(202)
        // Specifies an address and port to which the server should connect.
        socket.passive = false;
        var addr = info.split(",");
        socket.activeHost = addr[0] + "." + addr[1] + "." + addr[2] + "." + addr[3];
        socket.activePort = (parseInt(addr[4]) * 256) + parseInt(addr[5]);
        socket.reply(200, "PORT command successful.\r\n");
        var dataSocket = new net.Socket();
        dataSocket.on('connect', function () {
            // 客户端在发送RETR等指令**之后**请求数据传输, 立即执行队列中的指令.
            var execute = socket.dataTransfer.queue.shift();
            if (execute) {
                execute.call(dataSocket);
            }
            else {
                socket.dataTransfer.queue.once('push', function () {
                    execute = socket.dataTransfer.queue.shift();
                    execute && execute.call(dataSocket);
                });
            }
        });
        require('./debug')('ActiveMode')('warn', socket.activeHost, socket.activePort);
        dataSocket.connect(socket.activePort, socket.activeHost);
    },
    /**
     * Filesystem
     */
    "LIST": function (target) {
        var socket = this;
        target = target.replace(/\s*\-\w\s*/, '');
        socket.dataTransfer(function (dataSocket, finish) {
            socket.fs.list(target, function (err, result) {
                //result = './\r\n' + result;
                if (err) {
                    socket.reply(431, err.toString());
                    return finish(err);
                }
                var str = '';
                for (var filename in result) {
                    str += unixLs(filename, result[filename]) + '\r\n';
                }
                console.log(str);
                dataSocket.write(str, finish);
            });
        });
    },
    "NLST": function (target) {
        // TODO: just the list of file names
        // this.reply(202)
        var socket = this;
        target = target.replace(/\s+\-\w\s+/, '');
        socket.dataTransfer(function (dataSocket, finish) {
            socket.fs.list(target, function (err, result) {
                //result = './\r\n' + result;
                if (err) {
                    socket.reply(431, err.toString());
                    return finish(err);
                }
                var str = '';
                for (var filename in result) {
                    str += filename + '\r\n';
                }
                dataSocket.write(result, finish);
            });
        });
    },
    "RETR": function (file) {
        var socket = this;
        socket.dataTransfer(function (dataSocket, finish) {
            socket.fs.readFile(file, function (err, stream) {
                if (err) {
                    socket.reply(431, err.toString());
                    return;
                }
                stream.pipe(dataSocket);
            });
        });
    },
    //[mod] 新加SIZE指令支持
    "SIZE": function (file) {
        var socket = this;
        socket.fs.getSize(file, function (err, size) {
            console.log('file_size', size);
            if (err) {
                socket.reply(450);
            }
            else {
                socket.reply(213, size);
            }
        });
    },
    "STOR": function (file) {
        var socket = this;
        socket.dataTransfer(function (dataSocket, finish) {
            socket.fs.writeFile(file, function (err, stream) {
                if (err) {
                    socket.reply(413, err.toString());
                    return;
                }
                dataSocket.pipe(stream);
            });
        });
    },
    "DELE": function (file) {
        this.reply(202);
        var socket = this;
        socket.fs.unlink(file, function () {
            socket.reply(250);
        });
    },
    "RNFR": function (name) {
        this.reply(202);
        // Rename from.
        /*socket.filefrom = socket.fs.cwd() + command[1].trim();
        socket.send("350 File exists, ready for destination name.\r\n");*/
    },
    "RNTO": function (name) {
        this.reply(202);
        // Rename to.
        /*var fileto = socket.fs.cwd() + command[1].trim();
        rn = sys.exec("mv " + socket.filefrom + " " + fileto);
        rn.addCallback(function (stdout, stderr) {
          socket.send("250 file renamed successfully\r\n");
        });
        rn.addErrback(function () {
          socket.send("250 file renamed successfully\r\n");
        });*/
    },
    /**
     * Allow restart interrupted transfer
     */
    "REST": function (start) {
        this.reply(202);
        // Restart transfer from the specified point.
        /*socket.totsize = parseInt(command[1].trim());
        socket.send("350 Rest supported. Restarting at " + socket.totsize + "\r\n");*/
    },
    /**
     * Disconnection
     */
    "QUIT": function () {
        this.reply(221);
        this.end();
    }
};
