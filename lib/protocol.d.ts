/// <reference path="../typings/tsd.d.ts" />
import { FtpConnection } from './ftpd';
export interface Messages {
    [code: string]: string;
}
export interface Command {
    (...args: string[]): any;
    call(conn: FtpConnection, ...args: any[]): any;
    apply(conn: FtpConnection, ...args: any[]): any;
}
export interface Commands {
    [cmd: string]: Command;
}
/**
 * Standard messages for status (RFC 959)
 */
export declare var messages: Messages;
/**
 * Commands implemented by the FTP server
 */
export declare var commands: Commands;
