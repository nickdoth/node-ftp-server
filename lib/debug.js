var colors = require('colors')

colors.addSequencer('log', function(letter, i, exploded) {
	return letter.bold;
})

colors.addSequencer('info', function(letter, i, exploded) {
	return letter.cyan.bold;
})

colors.addSequencer('warn', function(letter, i, exploded) {
	return letter.yellow.bold;
})

colors.addSequencer('error', function(letter, i, exploded) {
	return letter.red.bold;
})

colors.addSequencer('success', function(letter, i, exploded) {
	return letter.green.bold;
})

module.exports = function(label, _console) {
	if(!_console) {
		_console = console
	}

	return function() {
		var level = arguments[0];
		(level in _console) && Array.prototype.shift.call(arguments)
		Array.prototype.unshift.call(arguments, label + '(' + (level[level] || 'log') + '):')
		_console.log.apply(_console, arguments)
	}
}