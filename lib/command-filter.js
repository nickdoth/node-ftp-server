var CommandFilter = (function () {
    function CommandFilter() {
        this.filters = [];
    }
    CommandFilter.prototype.add = function (filter) {
        this.filters.push(filter);
    };
    CommandFilter.prototype.apply = function (conn, command, args, callback) {
        var filters = this.filters;
        var len = filters.length;
        var count = 0;
        if (!len) {
            callback(null);
        }
        for (var n in filters) {
            filters.hasOwnProperty(n) && filters[n](conn, command, args, next);
        }
        function next(error) {
            if (error) {
                callback && callback(error);
                callback = null;
            }
            if (++count === len) {
                callback && callback(null);
                callback = null;
            }
        }
    };
    return CommandFilter;
})();
module.exports = CommandFilter;
