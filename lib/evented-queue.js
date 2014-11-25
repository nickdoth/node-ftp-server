var EventEmitter = require('events').EventEmitter;
var push = Array.prototype.push;
var shift = Array.prototype.shift;


var EventedQueue = module.exports = function() {
	var evt = new EventEmitter;
	this.on = evt.on;
	this.removeListener = evt.removeListener;
	this.removeAllListeners = evt.removeAllListeners;
	this.once = evt.once;
	this.emit = evt.emit;

	this._length = 0;
}

EventedQueue.prototype = [];
EventedQueue.prototype.constructor = EventedQueue;

EventedQueue.prototype = {

	push: function(val) {
		push.call(this, val);
		this.emit('push', val);
		return this.length;
	},

	shift: function() {
		var val = shift.call(this);
		this.emit('shifted', val);
		return val;
	},

	get length() {
		return this._length;
	},

	set length(val) {
		this.emit('change');
		if(val === 0) {
			this.emit('empty');
		}
		else if(val !== 0 && this._length === 0) {
			this.emit('unempty');
		}

		this._length = val;
	}

}


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