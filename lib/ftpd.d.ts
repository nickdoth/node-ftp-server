/// <reference path="../typings/tsd.d.ts" />
import net = require('net');
import protocol = require('./protocol');
import userControl = require('./user-control');
import CommandFilter = require('./command-filter');
import ftpFs = require('./fs');
import Debug = require('debug');
import FtpUser = userControl.FtpUser;
/**
 * export interfaces
 */
export interface Filesystem extends ftpFs.Filesystem {
}
export interface Commands extends protocol.Commands {
}
export interface Messages extends protocol.Messages {
}
export declare var StaticFilesystem: typeof ftpFs.StaticFilesystem;
export interface User extends FtpUser {
}
/**
 * Ftp Server Class
 */
export declare class FtpServer extends net.Server {
    private options;
    protocols: typeof protocol;
    extendedCommands: protocol.Commands;
    feats: {
        [f: string]: boolean;
    };
    closing: boolean;
    constructor(options: FtpServerOptions);
    close(callback?: Function): net.Server;
    createUser(): FtpUser;
}
export interface FtpServerOptions {
    ftpUserCtor: {
        new (): FtpUser;
    };
}
export declare class FtpConnection {
    socket: net.Socket;
    server: FtpServer;
    user: FtpUser;
    fs: Filesystem;
    passive: boolean;
    filter: CommandFilter;
    debug: Debug.Debugger;
    constructor(socket: net.Socket, server: FtpServer);
    /**
     * Socket write logger
     */
    write(data: any, callback: Function): void;
    /**
     * FTP reply method
     */
    reply(status: number, message?: string, callback?: Function): void;
    /**
     * Socket end shortcut
     */
    end(): void;
    transferQueue: any;
    /**
     * Data transfer
     */
    dataTransfer(handle: Function): void;
    /**
     * User control interface
     */
    enterUserControl(): void;
    /**
     * User reply helpers
     */
    ok(): void;
    badSeq(): void;
    userOk(): void;
    passOk(): void;
    authFail(): void;
}
export declare function createServer(options: any): FtpServer;
