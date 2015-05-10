/// <reference path="../typings/tsd.d.ts" />
export interface Messages {
    [code: string]: string;
}
export interface Command {
    (...args: any[]): any;
    call(conn: any, ...args: any[]): any;
    apply(conn: any, ...args: any[]): any;
}
export interface Commands {
    [code: string]: Command;
}
/**
 * Standard messages for status (RFC 959)
 */
export declare var messages: Messages;
/**
 * Commands implemented by the FTP server
 */
export declare var commands: Commands;
