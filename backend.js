var ssejson = require('ssejson')
var through = require('through2')
var uuid = require('hat')
var debug = require('debug')('HTTPSocketBackend')

module.exports = HTTPSocketBackend

function HTTPSocketBackend(opts) {
  if (!(this instanceof HTTPSocketBackend)) return new HTTPSocketBackend(opts)
  this.opts = opts || {}

  this.messages = {}  // TODO expiry
  this.events = ssejson.serialize()
}

// TODO support expiry/max msg size
HTTPSocketBackend.prototype.get = function(id, res) {
  var msg = this.messages[id]
  debug('.get', id, {length: msg ? msg.length : undefined})
  if (msg) {
    res.end(msg)
  } else {
    res.statusCode = 404
    res.end('404')
  }
  delete this.messages[id]
}

HTTPSocketBackend.prototype.post = function(req, res) {
  var self = this
  // TODO buffer into evenly sized chunks
  // TODO set maximum memory limit
  req.pipe(through(function(chunk, enc, next) {
    var id = uuid()
    self.messages[id] = chunk
    self.events.write({id: id})
    debug('POST', {id: id, length: chunk.length})
    next()
  }))
  
  req.on('end', function() {
    debug('POST end')
    res.end()
  })
}