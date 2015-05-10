import ftpFs = require("./fs");
export interface Signal {
    (): void;
}
export interface FtpUser {
    isLogin(yes: Signal, no: Signal): any;
    requestPermission(cmd: string, args: any, permit: Signal, deny: Signal): any;
    checkUsername(name: string, success: Signal, fail: Signal): any;
    checkPassword(pass: string, success: Signal, fail: Signal): any;
    getFilesystem(): ftpFs.Filesystem;
}
export declare function enterUserControl(): void;
