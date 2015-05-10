/// <reference path="../typings/tsd.d.ts" />

import path = require('path');
import util = require('util');
import net = require('net');
import protocol = require('./protocol');
import userControl = require('./user-control');
import CommandFilter = require('./command-filter');
import ftpFs = require('./fs');
import Debug = require('debug');
import FtpUser = userControl.FtpUser;

var EventedQueue = require('./evented-queue');

/**
 * export interfaces
 */
export interface Filesystem extends ftpFs.Filesystem {}
export interface Commands extends protocol.Commands {}
export interface Messages extends protocol.Messages {}
export var StaticFilesystem = ftpFs.StaticFilesystem;
export interface User extends FtpUser {}

var commands = protocol.commands
	, messages = protocol.messages

var debug = require('debug')('ftpd')

/**
 * Ftp Server Class
 */
export class FtpServer extends net.Server {
	protocols = protocol;
	extendedCommands: protocol.Commands = {};
	feats: { [f: string]: boolean } = {
		'UTF8': true,
		'SIZE': true
	};

	closing: boolean = false;

	constructor(private options: FtpServerOptions) {
		super();
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
		})
	}

	close(callback?: Function): net.Server {
		this.closing = true;
		super.close(callback);
		return this;
	}

	createUser(): FtpUser {
		return new this.options.ftpUserCtor();
	}

}

export interface FtpServerOptions {
	ftpUserCtor: {new(): FtpUser}
}








export class FtpConnection {

	user: FtpUser;
	// socket: net.Socket;
	fs: Filesystem;
	// server: FtpServer;
	passive: boolean = false;
	filter: CommandFilter = new CommandFilter();

	debug: Debug.Debugger;
	
	constructor(public socket: net.Socket, public server: FtpServer) {
		var debug = this.debug =  Debug('client' + socket.remoteAddress + ':' + socket.remotePort)

		/**
		 * Configure client connection info
		 */
		server.emit('connection-init', socket)

		debug('info', 'request accepted')
		socket.setTimeout(0)
		socket.setNoDelay()
		socket.setEncoding("binary");

		this.passive = false;
		// this.dataInfo = null;
		this.user = server.createUser();
		this.enterUserControl();

		
		setTimeout(() => {
				debug('220!\n');
				this.reply(220);
		}, 100);

		/**
		 * Received a command from socket
		 */
		socket.on('data', (chunk) => {
			/**
			 * If server is closing, refuse all commands
			 */
			if (server.closing) {
				this.reply(421)
			}
			/**
			 * Parse received command and reply accordingly
			 */
			debug('info', '[Req] %s', chunk.toString().replace('\r\n', ''));
			var parts = trim(chunk.toString()).split(" ")
				, command = trim(parts[0]).toUpperCase()
				, args = parts.slice(1, parts.length)
				, callable = server.extendedCommands[command] || commands[command]
			
			if (!callable) {
				this.reply(502)
			} else {
				//[mod] callable will get a wrong filename when the filename contains ' ';
				this.filter.apply(this, command, args, (err) => {
					err || callable.call(this, args.join(' '))
				});
				
			}
		});
		
		socket.on('close', (err) => {
			debug('指令信道关闭.');
			if(err) {
					debug('warn', 'socket close', err);
			}
			// socket.fs = server.getFileSystem()
			this.fs = null
		});
		
		//[mod] handle socket errors.
		socket.on('error', (err) => {
			debug('warn: accepted socket error: %s', err);
		});

		// this.dataTransfer.queue = new EventedQueue();
		
	}

	/**
	 * Socket write logger
	 */
	write(data: any, callback: Function) {
		this.socket.write(data, callback);
		this.debug('info', '[Res] %s', data.toString().replace('\r\n', ''))
	}
		
	/**
	 * FTP reply method
	 */
	reply(status: number, message?: string, callback?: Function) {
		if (!message) message = messages[status.toString()] || 'No information'
		this.write(status.toString() + ' ' + message.toString() + '\r\n', callback)
	}

	/**
	 * Socket end shortcut
	 */
	end() {
		return this.socket.end();
	}

	transferQueue: any = new EventedQueue();
	/**
	 * Data transfer
	 */
	dataTransfer(handle: Function) {
		var conn = this;

		function finish (dataSocket: net.Socket) {
			return function (err) {
				if (err) {
					dataSocket.emit('error', err)
				} else {
					dataSocket.end()
				}
			}
		}
		function execute () {
			conn.reply(150)
			handle.call(conn, this, finish(this))
		}
		// Will be unqueued in PASV command
		debug('info', 'DataTransfer by', conn.passive? 'Passive Mode.' : 'Active Mode.')
		if (conn.passive ||1) {
			conn.transferQueue.push(execute)
		}
		// Or we initialize directly the connection to the client
		else {
			// 未实现
			// var dataSocket = new net.Socket()
			// dataSocket.on('connect', execute)
			// debug('warn', 'PORT', conn.socket.activeHost, conn.socket.activePort)
			// dataSocket.connect({
			//   port: conn.socket.activePort,
			//   host: conn.socket.activeHost,
			//   localAddress: '192.168.23.1',
			//   localPort: 20
			// })
		}
	}


	/**
	 * User control interface
	 */
	enterUserControl() {
		userControl.enterUserControl.call(this);
	}


	/**
	 * User reply helpers
	 */
	ok() {
		this.reply(200)
	}

	badSeq() {
		this.reply(503)
		this.end()
	}

	userOk() {
		this.reply(331)
	}

	passOk() {
		this.reply(230)
	}

	authFail() {
		this.reply(530)
		this.end()
	}

}


export function createServer(options) {
		return new FtpServer(options);
}


function trim (string) {
	return string.replace(/^\s+|\s+$/g,"")
}

// if (!module.parent) {
//   server.fsOptions.root = path.resolve(__dirname, '..', 'test', 'data')
//   server.listen(21)
// }
