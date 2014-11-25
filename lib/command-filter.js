module.exports = function (server) {
	server._filters = [];
	server.addCommandFilter = addCommandFilter;
	server.emitFilter = emitFilter;
}

function addCommandFilter (filter) {
	this._filters.push(filter);
}

function emitFilter (socket, command, args, callback) {
	var filters = this._filters;
	var len = filters.length;
	var count = 0;

	if(!len) {
		callback(null);
	}

	for(var n in filters) {
		filters.hasOwnProperty(n) && filters[n](socket, command, args, next); 
	}

	function next (error) {
		if (error) {
			callback && callback(error);
			callback = null;
		}
		if (++count === len) {
			callback && callback(null);
			callback = null;
		}
	}
}

