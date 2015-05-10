class CommandFilter {

    filters: Function[] = [];

    add(filter: Function) {
    	this.filters.push(filter);
    }

    apply(conn, command, args, callback) {
    	var filters = this.filters;
    	var len = filters.length;
    	var count = 0;

    	if(!len) {
    		callback(null);
    	}

    	for(var n in filters) {
    		filters.hasOwnProperty(n) && filters[n](conn, command, args, next); 
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

}

export = CommandFilter;