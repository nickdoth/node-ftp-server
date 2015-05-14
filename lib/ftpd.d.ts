/// <reference path="../typings/tsd.d.ts" />
import * as net from 'net';
import * as userControl from './user-control';
import * as Debug from 'debug';
import { Filesystem } from './fs';
import { EventEmitter } from 'events';
import { Commands } from './protocol';
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
/**
 * Ftp Server Class
 */
export declare class FtpServer extends EventEmitter {
    private options;
    extendedCommands: Commands;
    feats: {
        [f: string]: boolean;
    };
    closing: boolean;
    private internal;
    constructor(options: FtpServerOptions);
    close(callback?: Function): FtpServer;
    createUser(): FtpUser;
    listen(port?: number, host?: string): FtpServer;
}
/**
 * Ftp Server Options
 */
export interface FtpServerOptions {
    /**
     * ftpUserCtor: {new(): FtpUser} A class implemented FtpUser
     */
    ftpUserCtor: {
        new (): FtpUser;
    };
}
/**
 * Ftp Connetion Session
 */
export declare class FtpConnection extends EventEmitter {
    socket: net.Socket;
    server: FtpServer;
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
    passive: boolean;
    /**
     * Stream seeking for REST command
     */
    seek: number;
    /**
     * Command filter
     */
    filter: CommandFilter;
    /**
     * Debug output
     */
    protected debug: Debug.Debugger;
    /**
     * Data transfer queue
     */
    transferQueue: EventedQueue<Function>;
    constructor(socket: net.Socket, server: FtpServer);
    /**
     * Write data to ftp command socket
     */
    write(data: any, callback?: Function): void;
    /**
     * Reply ftp command
     * @param status Ftp status number
     * @param message Reply message
     * @param callback? Callback function
     */
    reply(status: number, message?: string, callback?: Function): void;
    /**
     * Shortcut method of net.Socket.end()
     * @see net.Socket
     */
    end(): void;
    /**
     * Data transfer handler
     */
    dataTransfer(handle: Function): void;
    /**
     * User control interface
     */
    protected enterUserControl(): void;
    /**
     * User reply helpers
     */
    ok(): void;
    badSeq(): void;
    userOk(): void;
    passOk(): void;
    authFail(): void;
}
export declare function createServer(options: FtpServerOptions): FtpServer;
