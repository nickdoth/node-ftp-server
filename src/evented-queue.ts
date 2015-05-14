/// <reference path="../typings/tsd.d.ts" />
import { EventEmitter } from 'events';
// var push: Function = Array.prototype.push;
// var shift: Function = Array.prototype.shift;


export default class EventedQueue<T> extends EventEmitter {
	protected _length: number = 0;
	protected data: T[] = [];

	push(val: T) {
		this.data.push(val);
		this.emit('push', val);
		return this.length++;
	}

	shift(): T {
		var val = this.data.shift();
		this.emit('shifted', val);
        --this.length;
		return val;
	}

	get length() {
		return this._length;
	}

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