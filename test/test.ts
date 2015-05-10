import ftp = require('../lib/ftpd');

class SimpleUser implements ftp.User {
    private logon: boolean = false;

    getFilesystem() {
        return new ftp.StaticFilesystem({ root: 'C:/' });
    }

    checkUsername(username, success, fail) {
        if(username === 'nick') {
          success()
        }
        else {
          fail()
        }
    }

    checkPassword(passwd, success, fail) {
        if (passwd === '000000') {
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

var server = ftp.createServer({
    ftpUserCtor: SimpleUser
});

server.feats['EPSV'] = false;

server.listen(21, '192.168.24.1');