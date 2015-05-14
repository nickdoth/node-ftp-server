import { FtpConnection } from './ftpd';
export default class CommandFilter {
    filters: Array<Function>;
    add(filter: Function): void;
    apply(conn: FtpConnection, command: string, args: string[], callback: (err?: any) => void): void;
}
