declare class CommandFilter {
    filters: Function[];
    add(filter: Function): void;
    apply(conn: any, command: any, args: any, callback: any): void;
}
export = CommandFilter;
