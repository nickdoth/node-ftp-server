var Base  = require('./fs').Base
  , util  = require('util')
  , path  = require('path')
  , fs    = require('fs')
  , debug = require('./debug')('staticFs')

module.exports = Filesystem

util.inherits(Filesystem, Base)

function Filesystem (options) {
  Base.call(this, options)

  this.cwd = ''
}

Filesystem.prototype.pwd = function () {
  return '/' + this.cwd
}

Filesystem.prototype.chdir = function (dir, cb) {
  var new_cwd
  if(isAbsolute(dir)) {
    new_cwd = dir.substring(1)
  }
  else {
    new_cwd = path.join(this.cwd, dir)
  }

  
  
  var realPath = path.join(this.options.root, new_cwd)
  if (path.relative(this.options.root, realPath).match(/^\.\./)) {
    // Tried to go farther than root
    return cb(new Error('Root it root'), null)
  }

  var self = this

  console.log('real chdir', realPath)
  fs.stat(realPath, function (err, stats) {
    if (err || !stats.isDirectory()) {
      cb(new Error('No such directory'), null)
    } else {
      self.cwd = new_cwd
      cb(null, '/' + new_cwd)
    }
  })

}

Filesystem.prototype.list = function (dir, cb) {
  // if(arguments.length === 2) {
  //   cb = dir
  //   dir = outputFormatter
  //   outputFormatter = filenameOnly
  // }

  var self = this
    , target = this.resolve(dir)

  console.log('list_path:', target)
  fs.stat(target, function (err1, stat) {
    if (err1 || !stat.isDirectory()) {
      cb(new Error('No such directory'), null)
    }
    else {
        fs.readdir(target, function(err2, list){
            var resultArr = [], result = ''
            var fileCount = list.length
            
            if (err2) {
              cb(new Error('Cannot read directory'), null)
            }

            if (fileCount === 0) {
                cb(null, '\r\n')
                return
            }
            
            var i = 0
            list.forEach(function(filename){
                var filePath = path.join(target, filename)
                

                fs.stat(filePath, function(err3, stat){
                    
                    if (err3) {
                        console.log(err3)
                        // resultArr.push(outputFormatter(filename, null))
                        resultArr[filename] = null
                    }
                    else {
                        
                        // resultArr.push(outputFormatter(filename, stat))
                        resultArr[filename] = stat
                    }
                    
                    if(fileCount === ++i) {
                        result = resultArr
                        cb(null, result)
                    }
                    
                })
            })
              
        })

    }
  })

}

Filesystem.prototype.readFile = function (file, cb) {
  var self = this
    , target = this.resolve(file)
  
  console.log('request target filename:', target)
  fs.stat(target, function (err, stats) {
    if (err || !stats.isFile()) {
      cb(new Error("No such file"), null)
    } else {
      cb(null, fs.createReadStream(target))
    }
  })

}

Filesystem.prototype.writeFile = function (file, cb) {
  cb(null, fs.createWriteStream(this.resolve(file)))
}

Filesystem.prototype.unlink = function (file, cb) {
  var self = this
  fs.unlink(this.resolve(file), function (err) {
    cb(err, undefined)
  })
}

Filesystem.prototype.getSize = function (file, cb) {
    var self = this
    fs.stat(this.resolve(file), function(err, stat) {
        if(!err) {
            stat.isDirectory() && (stat.size = 4096)
            cb(err, stat.size)
        } else {
            cb(err, 0)
        }
    })

}

Filesystem.prototype.resolve = function(pathStr) {
  if(isAbsolute(pathStr)) {
    return path.join(this.options.root, pathStr)
  }
  else {
    return path.join(this.options.root, this.cwd, pathStr)
  }

}


function filenameOnly(filename, stat) {
  return filename
}

function isAbsolute(pathStr) {
  return /(^\s*\/)|(^\s*\w\:\/)/.test(pathStr.replace('\\', '/'))
}