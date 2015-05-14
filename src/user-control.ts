import { commands } from './protocol';
import { Filesystem } from './fs';
import { FtpConnection } from './ftpd';


export interface Signal {
  (): void;
}

export interface FtpUser {
  isLogin(yes: Signal, no: Signal);
  requestPermission(cmd:string, args: any, permit: Signal, deny: Signal);
  checkUsername(name: string, success: Signal, fail: Signal);
  checkPassword(pass: string, success: Signal, fail: Signal);
  getFilesystem(): Filesystem;
}

export function enterUserControl() {
  var conn: FtpConnection = this

  conn.filter.add((conn: FtpConnection, command, args, next) => {
    if (['USER', 'PASS'].indexOf(command) > -1) {
      next();
      return;
    }

    conn.user.isLogin(yes, no);

    function yes () {
      conn.user.requestPermission(command, args, commandPermit, commandDeny)
    }

    function no () {
      conn.reply(220, 'You have not login yet.')
      next(new Error('You have not login yet.'))
    }

    function commandPermit () {
      next()
    }

    function commandDeny () {
      conn.reply(550, 'Permittion denied.')
      next(new Error('Permittion denied.'))
    }
  });
}


commands['USER'] = function(name) {
  var conn = this
  
  
  conn.user.checkUsername(name, success, failed);

  function success () {
    conn.userOk()
  }

  function failed () {
    conn.authFail()
  }
}

commands['PASS'] = function(passwd) {
  var conn = this
  
  
  conn.user.checkPassword(passwd, success, failed);

  function success () {
    /**
     * Initialize filesystem
     */
    conn.fs = conn.user.getFilesystem();
    conn.passOk()
  }

  function failed () {
    conn.authFail()
  }
}
