var protocol = require('./protocol');
var commands = protocol.commands;
function enterUserControl() {
    var conn = this;
    conn.filter.add(function (conn, command, args, next) {
        if (['USER', 'PASS'].indexOf(command) > -1) {
            next();
            return;
        }
        conn.user.isLogin(yes, no);
        function yes() {
            conn.user.requestPermission(command, args, commandPermit, commandDeny);
        }
        function no() {
            conn.reply(220, 'You have not login yet.');
            next(new Error('You have not login yet.'));
        }
        function commandPermit() {
            next();
        }
        function commandDeny() {
            conn.reply(550, 'Permittion denied.');
            next(new Error('Permittion denied.'));
        }
    });
}
exports.enterUserControl = enterUserControl;
commands['USER'] = function (name) {
    var conn = this;
    conn.user.checkUsername(name, success, failed);
    function success() {
        conn.userOk();
    }
    function failed() {
        conn.authFail();
    }
};
commands['PASS'] = function (passwd) {
    var conn = this;
    conn.user.checkPassword(passwd, success, failed);
    function success() {
        /**
         * Initialize filesystem
         */
        conn.fs = conn.user.getFilesystem();
        conn.passOk();
    }
    function failed() {
        conn.authFail();
    }
};
