module.exports = function(server) {
	server.on('connection-init', function(socket) {
		for(var n in replyHelper) {
			replyHelper.hasOwnProperty(n) && (socket[n] = replyHelper[n])
		}
	})
}

var replyHelper = {
	
	'ok': function() {
		this.reply(200)
	},

	'badSeq': function() {
		this.reply(503)
		this.end()
	},

	'userOk': function() {
		this.reply(331)
	},

	'passOk': function() {
		this.reply(230)
	},

	'authFail': function() {
		this.reply(530)
		this.end()
	}
}
