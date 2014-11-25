var nets = require('nets')
var through = require('through2')
var duplexify = require('duplexify')
var pumpify = require('pumpify')
var uuid = require('hat')
var ssejson = require('ssejson')
var debug = require('debug')('HTTPSocket')

if (!process.browser) var EventSource = require('eventsource')

module.exports = HTTPSocket

function HTTPSocket(remote) {
  this.id = uuid()
  var duplex = duplexify()
  duplex.id = this.id

  var httpWriter = this.createHTTPWriteStream(remote)
  var httpReader = this.createFetchStream(remote)
  duplex.setReadable(httpReader)
  duplex.setWritable(httpWriter)
  
  duplex.on('finish', function() {
    httpReader.end()
  })

  return duplex
}

HTTPSocket.prototype.createHTTPWriteStream = function(remote) {
  var self = this
  var stream = through(write) 
  return stream
  
  function write(chunk, enc, next) {
    var postURL = remote + '/' + self.id + '/push'
    debug('POST', {url: postURL, length: chunk.length})
    nets({method: "POST", body: chunk, url: postURL}, function(err, resp, body) {
      if (err) return stream.destroy(err)
      next()
    })
  }
}

HTTPSocket.prototype.createFetchStream = function(remote) {
  var self = this
  var eventSource = new EventSource(remote + '/' + self.id + '/events')
  var events = ssejson.fromEventSource(eventSource)
  events.on('finish', function() {
    debug('EventSource.close()')
    eventSource.close()
  })
  var fetcher = through.obj(function(obj, enc, next) {
    debug('SSE event', obj)
    var objectURL = remote + '/' + self.id + '/get/' + obj.id
    debug('GET object', {url: objectURL})
    nets({method: "GET", url: objectURL}, function(err, resp, body) {
      debug('GET object response', {length: body.length, status: resp.statusCode, err: err})
      if (err) return stream.destroy(err)
      fetcher.push(body)
      next()
    })
  })
  return pumpify(events, fetcher)
}
