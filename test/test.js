// import {
//   StaticFilesystem, FtpUser, createServer } from '../lib/ftpd';
var ftpd_1 = require('../lib/ftpd');
var users = {
    'super': {
        pass: Math.round(Math.random() * 1000000).toString(),
        root: 'C:/'
    },
    'mnt': {
        pass: '1008611',
        root: 'C:/mnt'
    }
};
var server = ftpd_1.simple(users);
console.log('super:', users['super'].pass);
