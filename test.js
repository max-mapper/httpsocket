var http = require('http')
var through = require('through2')
var url = require('url')
var Router = require("routes-router")
var HTTPSocket = require('./')
var HTTPSocketBackend = require('./backend')
var debug = require('debug')('HTTPSocketTestServer')

var backends = {}
var router = Router()
var server = http.createServer(router)

router.addRoute("/:id/push", function (req, res, opts) {
  debug(req.method, req.url)
  var backend = backends[opts.params.id]
  if (!backend) backend = backends[opts.params.id] = HTTPSocketBackend()
  backend.post(req, res)
})

router.addRoute("/:id/events", function (req, res, opts) {
  debug(req.method, req.url)
  var backend = backends[opts.params.id]
  if (!backend) backend = backends[opts.params.id] = HTTPSocketBackend()
  backend.events.pipe(res, {end: false})
  req.on('close', function() {
    backend.events.destroy()
    res.end()
  })
})

router.addRoute("/:id/get/:object", function (req, res, opts) {
  debug(req.method, req.url)
  var backend = backends[opts.params.id]
  if (!backend) return res.end('no backend for that id')
  backend.get(opts.params.object, res)
})

server.listen(8080, function listening() {
  var client = new HTTPSocket('http://localhost:8080')
  console.log('socket send', ["hello"])
  client.write(new Buffer('hello'))
  console.log('socket send', ["world"])
  client.write(new Buffer('world'))
  
  var pending = 2
  client.pipe(through(function(chunk, enc, next) {
    console.log('socket receive', [chunk.toString()])
    next()
    if (!--pending) {
      client.end()
      server.close()
    }
  }))
})
