import {
    StaticFilesystem, FtpUser, createServer, FtpServer
     } from './ftpd';

export type User = { pass: string, root: string };
export type Users = { [k: string]: User };

class SimpleUser implements FtpUser {
    private logon: boolean = false;
    private user: User = null;
    protected users: Users = null;

    getFilesystem() {
        return new StaticFilesystem({ root: this.user.root });
    }

    checkUsername(username, success, fail) {
        if(username in this.users) {
            this.user = this.users[username];
            success()
        }
        else {
            fail()
        }
    }

    checkPassword(passwd, success, fail) {
        if (passwd === this.user.pass) {
            this.logon = true
            success()
        }
        else {
            fail()
        }
    }

    requestPermission(command, args, permit, deny) {
        if (command === 'DELE' || command === 'STOR') {
            deny()
        }
        else {
            permit()
        }
    }

    isLogin(yes, no) {
        this.logon? yes() : no()
    }
}

export function simple(users: Users) {
    function UserCtor() {
        SimpleUser.call(this);
        this.users = users;
    }

    UserCtor.prototype = Object.create(SimpleUser.prototype);

    var server = createServer({
        ftpUserCtor: <any>UserCtor
    });

    server.feats['EPSV'] = false;
    server.listen(21, '192.168.24.1');

    return server;
}

// export { FtpServer } from './ftpd';