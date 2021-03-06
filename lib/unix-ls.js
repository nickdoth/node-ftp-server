module.exports = function (name, stat) {
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
    var child = stat.isDirectory() ? '1' : '0';
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

function getPosixDate (date) {
    return [
        months[date.getMonth()],
        (date.getDate()).toString(), 
        numFormat('%xxd', date.getHours())+ ':' +
        numFormat('%xxd', date.getMinutes())
    ].join(' ');
}

//console.log(getPosixDate(new Date()));

function numFormat (format, num) {//|\.
    num = num.toString()
    var len = num.length
    
    return format.replace(/%(x*)d/, function(_, x) {
        var n = x.length

        if(len < n) {
            return repeat('0', n - len) + num
        }
        else {
            return num
        }
    })

    function repeat (str, count) {
        for(var i = 1; i < count; i++) {
            str += str
        }

        return str
    }
}