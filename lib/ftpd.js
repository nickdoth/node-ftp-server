var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../typings/tsd.d.ts" />
var net = require('net');
var userControl = require('./user-control');
var Debug = require('debug');
var events_1 = require('events');
var protocol_1 = require('./protocol');
var command_filter_1 = require('./command-filter');
var evented_queue_1 = require('./evented-queue');
/**
 * export interfaces
 */
var fs_1 = require('./fs');
exports.StaticFilesystem = fs_1.StaticFilesystem;
var protocol_2 = require('./protocol');
exports.commands = protocol_2.commands;
exports.messages = protocol_2.messages;
var simple_1 = require('./simple');
exports.simple = simple_1.simple;
var debug = Debug('ftpd');
/**
 * Ftp Server Class
 */
var FtpServer = (function (_super) {
    __extends(FtpServer, _super);
    function FtpServer(options) {
        _super.call(this);
        this.options = options;
        this.extendedCommands = {};
        this.feats = {
            'UTF8': true,
            'SIZE': true,
            'REST': true
        };
        this.closing = false;
        var server = this;
        server.on('listening', function () {
            debug('info', 'Server listening on ' +
                server.internal.address().address + ':' + server.internal.address().port);
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
        this.internal.close(callback);
        return this;
    };
    FtpServer.prototype.createUser = function () {
        return new this.options.ftpUserCtor();
    };
    FtpServer.prototype.listen = function (port, host) {
        var _this = this;
        // Use net.Server as the default internal server
        this.internal = net.createServer();
        this.internal.on('connection', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return _this.emit.apply(_this, ['connection'].concat(args));
        });
        this.internal.on('listening', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return _this.emit.apply(_this, ['listening'].concat(args));
        });
        this.internal.on('error', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return _this.emit.apply(_this, ['error'].concat(args));
        });
        this.internal.on('close', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return _this.emit.apply(_this, ['close'].concat(args));
        });
        this.internal.listen(port, host);
        return this;
    };
    return FtpServer;
})(events_1.EventEmitter);
exports.FtpServer = FtpServer;
/**
 * Ftp Connetion Session
 */
var FtpConnection = (function (_super) {
    __extends(FtpConnection, _super);
    function FtpConnection(socket, server) {
        var _this = this;
        _super.call(this);
        this.socket = socket;
        this.server = server;
        /**
         * Whether this connection is in passive mode or not
         */
        this.passive = false;
        /**
         * Stream seeking for REST command
         */
        this.seek = 0;
        /**
         * Command filter
         */
        this.filter = new command_filter_1.default();
        /**
         * Data transfer queue
         */
        this.transferQueue = new evented_queue_1.default();
        var debug = this.debug = Debug(socket.remoteAddress + ':' + socket.remotePort);
        /**
         * Configure client connection info
         */
        server.emit('connection-init', socket);
        debug('info', 'request accepted');
        socket.setTimeout(0);
        socket.setNoDelay();
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
            debug('info', '[Req]', chunk.toString().replace('\r\n', ''));
            var parts = trim(chunk.toString()).split(" "), command = trim(parts[0]).toUpperCase(), args = parts.slice(1, parts.length), callable = server.extendedCommands[command] || protocol_1.commands[command];
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
     * Write data to ftp command socket
     */
    FtpConnection.prototype.write = function (data, callback) {
        this.socket.write(data, callback);
        this.debug('info', '[Res]', data.toString().replace('\r\n', ''));
    };
    /**
     * Reply ftp command
     * @param status Ftp status number
     * @param message Reply message
     * @param callback? Callback function
     */
    FtpConnection.prototype.reply = function (status, message, callback) {
        if (!message)
            message = protocol_1.messages[status.toString()] || 'No information';
        this.write(status.toString() + ' ' + message.toString() + '\r\n', callback);
    };
    /**
     * Shortcut method of net.Socket.end()
     * @see net.Socket
     */
    FtpConnection.prototype.end = function () {
        return this.socket.end();
    };
    /**
     * Data transfer handler
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
        this.debug('info', 'DataTransfer by', conn.passive ? 'Passive Mode.' : 'Active Mode.');
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
})(events_1.EventEmitter);
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
