module.exports = function(name, stat) {
    if(!stat) {
        stat = {
            isDirectory: function() {
                return false;
            },
            size: 0,
            mtime: new Date(0)
        }
    }
    
    var fType = stat.isDirectory() ? 'd' : '-';
    var ino = 'rwxrwxr--';
    var child = stat.isDirectory() ? '1' : '1';
    var user = 'ftp';
    var group = 'ftp';
    var size = stat.size;
    var mtime = getPosixDate(stat.mtime);
    var filename = name.replace(/ /gi, ' ');
    
    var str = [fType+ino, child, user, group, size, mtime, filename].join(' ');
    
    return str;
};


var months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function getPosixDate(date) {
    return [months[date.getMonth()] ,(date.getDate()).toString(), 
      (date.getHours() + 1).toString() + ':' + (date.getMinutes() + 1).toString()].join(' ');
}

//console.log(getPosixDate(new Date()));