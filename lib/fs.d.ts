/// <reference path="../typings/tsd.d.ts" />
export interface Filesystem {
    pwd(): string;
    chdir(dir: string, cb: (err, ...args) => any): any;
    list(dir: string, cb: (err, ...args) => any): any;
    readFile(file: string, cb: (err, ...args) => any, seek?: number): any;
    writeFile(file: string, cb: (err, ...args) => any, seek?: number): any;
    unlink(file: string, cb: (err, ...args) => any): any;
    getSize(file: string, cb: (err, ...args) => any): any;
}
export declare class StaticFilesystem implements Filesystem {
    private options;
    cwd: string;
    constructor(options: any);
    pwd(): string;
    chdir(dir: any, cb: any): any;
    list(dir: any, cb: any): void;
    readFile(file: string, cb: any, seek?: number): void;
    writeFile(file: string, cb: any, seek?: number): void;
    unlink(file: any, cb: any): void;
    getSize(file: any, cb: any): void;
    resolve(pathStr: any): string;
}
