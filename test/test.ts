// import {
//   StaticFilesystem, FtpUser, createServer } from '../lib/ftpd';

import { simple } from '../lib/ftpd';

type User = { pass: string, root: string };
type Users = { [k: string]: User };

var users: Users = {
  'super': {
    pass: Math.round(Math.random() * 1000000).toString(),
    root: 'C:/'
  },
  'mnt': {
    pass: '1008611',
    root: 'C:/mnt'
  }
}

var server = simple(users);
console.log('super:', users['super'].pass);