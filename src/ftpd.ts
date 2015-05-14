/// <reference path="../typings/tsd.d.ts" />
import * as net from 'net';
import * as userControl from './user-control';
import * as Debug from 'debug';
import { Filesystem } from './fs';
import { EventEmitter } from 'events';
import { Commands, Messages, commands, messages } from './protocol';
import CommandFilter from './command-filter';
import EventedQueue from './evented-queue';
import FtpUser = userControl.FtpUser;

/**
 * export interfaces
 */
export { Filesystem, StaticFilesystem } from './fs';
export { Commands, Messages, commands, messages } from './protocol';
export { FtpUser } from './user-control';
export { simple } from './simple';

// declare raw data type
type Data = string|Buffer;

var debug = Debug('ftpd')

/**
 * Ftp Server Class
 */
export class FtpServer extends EventEmitter {
	extendedCommands: Commands = {};
	feats: { [f: string]: boolean } = {
		'UTF8': true,
		'SIZE': true,
		'REST': true
	};

	closing: boolean = false;
	private internal: net.Server;

	constructor(private options: FtpServerOptions) {
		super();
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
		})
	}

	close(callback?: Function): FtpServer {
		this.closing = true;
		this.internal.close(callback);
		return this;
	}

	createUser(): FtpUser {
		return new this.options.ftpUserCtor();
	}

	listen(port?:number, host?:string): FtpServer {
		// Use net.Server as the default internal server
		this.internal = net.createServer();
		this.internal.on('connection', (...args) => this.emit('connection', ...args));
		this.internal.on('listening', (...args) => this.emit('listening', ...args));
		this.internal.on('error', (...args) => this.emit('error', ...args));
		this.internal.on('close', (...args) => this.emit('close', ...args));
		this.internal.listen(port, host);
		return this;
	}

}




/**
 * Ftp Server Options
 */
export interface FtpServerOptions {
    /**
     * ftpUserCtor: {new(): FtpUser} A class implemented FtpUser
     */
	ftpUserCtor: {new(): FtpUser}
}




/**
 * Ftp Connetion Session
 */
export class FtpConnection extends EventEmitter {

    /**
     * Ftp user authentication abstration
     */
	user: FtpUser;

    /**
     * Ftp filesystem abstration
     */
	fs: Filesystem;

    /**
     * Whether this connection is in passive mode or not
     */
	passive: boolean = false;

    /**
     * Stream seeking for REST command
     */
    seek: number = 0;

    /**
     * Command filter
     */
	filter: CommandFilter = new CommandFilter();

    /**
     * Debug output
     */
    protected debug: Debug.Debugger;

    /**
     * Data transfer queue
     */
    transferQueue = new EventedQueue<Function>();
	
	constructor(public socket: net.Socket, public server: FtpServer) {
        super();
        var debug = this.debug = Debug(socket.remoteAddress + ':' + socket.remotePort);

		/**
		 * Configure client connection info
		 */
		server.emit('connection-init', socket)

		debug('info', 'request accepted')
		socket.setTimeout(0)
		socket.setNoDelay()

		this.user = server.createUser();
		this.enterUserControl();

		
		setTimeout(() => {
			debug('220!\n');
			this.reply(220);
		}, 100);

		/**
		 * Received a command from socket
		 */
		socket.on('data', (chunk: Data) => {
			/**
			 * If server is closing, refuse all commands
			 */
			if (server.closing) {
				this.reply(421)
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
	 * Write data to ftp command socket
	 */
	write(data: any, callback?: Function) {
		this.socket.write(data, callback);
		this.debug('info', '[Res]', data.toString().replace('\r\n', ''))
	}
		
	/**
	 * Reply ftp command
     * @param status Ftp status number
     * @param message Reply message
     * @param callback? Callback function
	 */
	reply(status: number, message?: string, callback?: Function) {
		if (!message) message = messages[status.toString()] || 'No information'
		this.write(status.toString() + ' ' + message.toString() + '\r\n', callback)
	}

	/**
	 * Shortcut method of net.Socket.end()
     * @see net.Socket
	 */
	end() {
		return this.socket.end();
	}


	/**
	 * Data transfer handler
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
		this.debug('info', 'DataTransfer by', conn.passive? 'Passive Mode.' : 'Active Mode.')
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
	protected enterUserControl() {
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


export function createServer(options: FtpServerOptions) {
	return new FtpServer(options);
}


function trim (string) {
	return string.replace(/^\s+|\s+$/g,"")
}

// if (!module.parent) {
//   server.fsOptions.root = path.resolve(__dirname, '..', 'test', 'data')
//   server.listen(21)
// }
