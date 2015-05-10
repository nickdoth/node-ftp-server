/// <reference path="../typings/tsd.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var net = require('net');
var protocol = require('./protocol');
var userControl = require('./user-control');
var CommandFilter = require('./command-filter');
var ftpFs = require('./fs');
var Debug = require('debug');
var EventedQueue = require('./evented-queue');
exports.StaticFilesystem = ftpFs.StaticFilesystem;
var commands = protocol.commands, messages = protocol.messages;
var debug = require('debug')('ftpd');
/**
 * Ftp Server Class
 */
var FtpServer = (function (_super) {
    __extends(FtpServer, _super);
    function FtpServer(options) {
        _super.call(this);
        this.options = options;
        this.protocols = protocol;
        this.extendedCommands = {};
        this.feats = {
            'UTF8': true,
            'SIZE': true
        };
        this.closing = false;
        var server = this;
        server.on('listening', function () {
            debug('info', 'Server listening on ' +
                server.address().address + ':' + server.address().port);
        });
        /**
         * When server receives a new client socket
         */
        server.on('connection', function (socket) {
            server.emit('ftpd:conn', new FtpConnection(socket, server), socket);
        });
    }
    FtpServer.prototype.close = function (callback) {
        this.closing = true;
        _super.prototype.close.call(this, callback);
        return this;
    };
    FtpServer.prototype.createUser = function () {
        return new this.options.ftpUserCtor();
    };
    return FtpServer;
})(net.Server);
exports.FtpServer = FtpServer;
var FtpConnection = (function () {
    function FtpConnection(socket, server) {
        var _this = this;
        this.socket = socket;
        this.server = server;
        // server: FtpServer;
        this.passive = false;
        this.filter = new CommandFilter();
        this.transferQueue = new EventedQueue();
        var debug = this.debug = Debug('client' + socket.remoteAddress + ':' + socket.remotePort);
        /**
         * Configure client connection info
         */
        server.emit('connection-init', socket);
        debug('info', 'request accepted');
        socket.setTimeout(0);
        socket.setNoDelay();
        socket.setEncoding("binary");
        this.passive = false;
        // this.dataInfo = null;
        this.user = server.createUser();
        this.enterUserControl();
        setTimeout(function () {
            debug('220!\n');
            _this.reply(220);
        }, 100);
        /**
         * Received a command from socket
         */
        socket.on('data', function (chunk) {
            /**
             * If server is closing, refuse all commands
             */
            if (server.closing) {
                _this.reply(421);
            }
            /**
             * Parse received command and reply accordingly
             */
            debug('info', '[Req] %s', chunk.toString().replace('\r\n', ''));
            var parts = trim(chunk.toString()).split(" "), command = trim(parts[0]).toUpperCase(), args = parts.slice(1, parts.length), callable = server.extendedCommands[command] || commands[command];
            if (!callable) {
                _this.reply(502);
            }
            else {
                //[mod] callable will get a wrong filename when the filename contains ' ';
                _this.filter.apply(_this, command, args, function (err) {
                    err || callable.call(_this, args.join(' '));
                });
            }
        });
        socket.on('close', function (err) {
            debug('指令信道关闭.');
            if (err) {
                debug('warn', 'socket close', err);
            }
            // socket.fs = server.getFileSystem()
            _this.fs = null;
        });
        //[mod] handle socket errors.
        socket.on('error', function (err) {
            debug('warn: accepted socket error: %s', err);
        });
        // this.dataTransfer.queue = new EventedQueue();
    }
    /**
     * Socket write logger
     */
    FtpConnection.prototype.write = function (data, callback) {
        this.socket.write(data, callback);
        this.debug('info', '[Res] %s', data.toString().replace('\r\n', ''));
    };
    /**
     * FTP reply method
     */
    FtpConnection.prototype.reply = function (status, message, callback) {
        if (!message)
            message = messages[status.toString()] || 'No information';
        this.write(status.toString() + ' ' + message.toString() + '\r\n', callback);
    };
    /**
     * Socket end shortcut
     */
    FtpConnection.prototype.end = function () {
        return this.socket.end();
    };
    /**
     * Data transfer
     */
    FtpConnection.prototype.dataTransfer = function (handle) {
        var conn = this;
        function finish(dataSocket) {
            return function (err) {
                if (err) {
                    dataSocket.emit('error', err);
                }
                else {
                    dataSocket.end();
                }
            };
        }
        function execute() {
            conn.reply(150);
            handle.call(conn, this, finish(this));
        }
        // Will be unqueued in PASV command
        debug('info', 'DataTransfer by', conn.passive ? 'Passive Mode.' : 'Active Mode.');
        if (conn.passive || 1) {
            conn.transferQueue.push(execute);
        }
        else {
        }
    };
    /**
     * User control interface
     */
    FtpConnection.prototype.enterUserControl = function () {
        userControl.enterUserControl.call(this);
    };
    /**
     * User reply helpers
     */
    FtpConnection.prototype.ok = function () {
        this.reply(200);
    };
    FtpConnection.prototype.badSeq = function () {
        this.reply(503);
        this.end();
    };
    FtpConnection.prototype.userOk = function () {
        this.reply(331);
    };
    FtpConnection.prototype.passOk = function () {
        this.reply(230);
    };
    FtpConnection.prototype.authFail = function () {
        this.reply(530);
        this.end();
    };
    return FtpConnection;
})();
exports.FtpConnection = FtpConnection;
function createServer(options) {
    return new FtpServer(options);
}
exports.createServer = createServer;
function trim(string) {
    return string.replace(/^\s+|\s+$/g, "");
}
// if (!module.parent) {
//   server.fsOptions.root = path.resolve(__dirname, '..', 'test', 'data')
//   server.listen(21)
// }
