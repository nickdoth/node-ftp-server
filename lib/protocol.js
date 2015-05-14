/// <reference path="../typings/tsd.d.ts" />
var net = require('net');
var unix_ls_1 = require('./unix-ls');
var Debug = require('debug');
var passiveDT_1 = require('./passiveDT');
// import ftpd = require('ftpd');
var streamDebug = Debug('stream');
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
    "553": "Requested action not taken.",
};
/**
 * Commands implemented by the FTP server
 */
exports.commands = {
    /**
     * Unsupported commands
     * They're specifically listed here as a roadmap, but any unexisting command will reply with 202 Not supported
     */
    "ABOR": function () {
        // this.reply(202);
        var conn = this;
        conn.emit('data-abort');
    },
    "ACCT": function () { this.reply(202); },
    "ADAT": function () { this.reply(202); },
    "ALLO": function () { this.reply(202); },
    "APPE": function () { this.reply(202); },
    "AUTH": function () { this.reply(202); },
    "CCC": function () { this.reply(202); },
    "CONF": function () { this.reply(202); },
    "ENC": function () { this.reply(202); },
    "EPRT": function () { this.reply(202); },
    // "EPSV": function () { this.reply(202) }, // Enter extended passive mode. (RFC 2428)
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
        var conn = this;
        var features = conn.server.feats;
        conn.write('211-Extensions supported\r\n');
        for (var n in features) {
            if (features.hasOwnProperty(n) && features[n]) {
                conn.write(' ' + n + '\r\n');
            }
        }
        conn.reply(211, 'End');
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
        var conn = this;
        if (dataEncoding == "A" || dataEncoding == "I") {
            // conn.socket.setEncoding((dataEncoding == "A") ? "utf-8" : "binary");
            conn.reply(200);
        }
        else {
            conn.reply(501);
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
        passiveDT_1.default(this, false);
    },
    /**
     * Extended Passive mode
     */
    "EPSV": function () {
        passiveDT_1.default(this, true);
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
                    str += unix_ls_1.default(filename, result[filename]) + '\r\n';
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
        var conn = this;
        conn.dataTransfer(function (dataSocket, finish) {
            conn.fs.readFile(file, function (err, stream) {
                if (err) {
                    conn.reply(431, err.toString());
                    return;
                }
                streamDebug('Now RETR:', file);
                stream.pipe(dataSocket);
            }, conn.seek);
        });
    },
    //[mod] 新加SIZE指令支持
    "SIZE": function (file) {
        var conn = this;
        conn.fs.getSize(file, function (err, size) {
            console.log('file_size', size);
            streamDebug('SIZE', size);
            if (err) {
                conn.reply(450);
            }
            else {
                conn.reply(213, size);
            }
        });
    },
    "STOR": function (file) {
        var conn = this;
        conn.dataTransfer(function (dataSocket, finish) {
            conn.fs.writeFile(file, function (err, stream) {
                if (err) {
                    conn.reply(413, err.toString());
                    return;
                }
                dataSocket.pipe(stream);
            });
        });
    },
    "DELE": function (file) {
        this.reply(202);
        var conn = this;
        conn.fs.unlink(file, function () {
            conn.reply(250);
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
        // this.reply(202)
        // Restart transfer from the specified point.
        streamDebug('REST', start);
        this.seek = parseInt(start.trim());
        this.reply(350, "Rest supported. Restarting at " + this.seek + "\r\n");
    },
    /**
     * Disconnection
     */
    "QUIT": function () {
        this.reply(221);
        this.end();
    }
};
// function _parseInt(val: any) {
//   console.log(val, parseInt(val), Math.round(val));
//   return parseInt(val);
// } 
