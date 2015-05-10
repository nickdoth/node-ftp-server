var ftp = require('../lib/ftpd');
var SimpleUser = (function () {
    function SimpleUser() {
        this.logon = false;
    }
    SimpleUser.prototype.getFilesystem = function () {
        return new ftp.StaticFilesystem({ root: 'C:/' });
    };
    SimpleUser.prototype.checkUsername = function (username, success, fail) {
        if (username === 'nick') {
            success();
        }
        else {
            fail();
        }
    };
    SimpleUser.prototype.checkPassword = function (passwd, success, fail) {
        if (passwd === '000000') {
            this.logon = true;
            success();
        }
        else {
            fail();
        }
    };
    SimpleUser.prototype.requestPermission = function (command, args, permit, deny) {
        if (command === 'DELE' || command === 'STOR') {
            deny();
        }
        else {
            permit();
        }
    };
    SimpleUser.prototype.isLogin = function (yes, no) {
        this.logon ? yes() : no();
    };
    return SimpleUser;
})();
var server = ftp.createServer({
    ftpUserCtor: SimpleUser
});
server.feats['EPSV'] = false;
server.listen(21, '192.168.24.1');
