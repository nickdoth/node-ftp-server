var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../typings/tsd.d.ts" />
var events_1 = require('events');
// var push: Function = Array.prototype.push;
// var shift: Function = Array.prototype.shift;
var EventedQueue = (function (_super) {
    __extends(EventedQueue, _super);
    function EventedQueue() {
        _super.apply(this, arguments);
        this._length = 0;
        this.data = [];
    }
    EventedQueue.prototype.push = function (val) {
        this.data.push(val);
        this.emit('push', val);
        return this.length++;
    };
    EventedQueue.prototype.shift = function () {
        var val = this.data.shift();
        this.emit('shifted', val);
        --this.length;
        return val;
    };
    Object.defineProperty(EventedQueue.prototype, "length", {
        get: function () {
            return this._length;
        },
        set: function (val) {
            this.emit('change');
            if (val === 0) {
                this.emit('empty');
            }
            else if (val !== 0 && this._length === 0) {
                this.emit('unempty');
            }
            this._length = val;
        },
        enumerable: true,
        configurable: true
    });
    return EventedQueue;
})(events_1.EventEmitter);
exports.default = EventedQueue;
// test
// var eq = new EventedQueue();
// eq.on('push', function(val) {
// 	console.log(val, 'pushed');
// });
// eq.on('shift', function(val) {
// 	console.log(val, 'shifted');
// });
// eq.on('empty', function() {
// 	console.log('queue was empty');
// })
// eq.on('unempty', function() {
// 	console.log('queue was unempty');
// })
// eq.push(1)
// eq.push(2)
// eq.shift()
// eq.shift()
// setInterval(function(){}, 12); 
