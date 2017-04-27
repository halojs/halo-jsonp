import fs from 'fs'
import koa from 'koa'
import test from 'ava'
import path from 'path'
import jsonp from '../src'
import request from 'request'
import mount from 'koa-mount'

const req = request.defaults({
    json: true,
    baseUrl: 'http://localhost:3000'
})

test.before.cb((t) => {
    let app = koa()
    
    app.use(jsonp())
    app.use(mount('/buffered', function *() {
        this.body = { ok: 1 }
    }))
    app.use(mount('/null', function *() {
        this.body = null
    }))
    app.use(mount('/stream', function *() {
        this.body = fs.createReadStream(path.join(__dirname, 'stream.json'))
    }))
    app.listen(3000, t.end)
})

test.cb('there is no callback params', (t) => {
    req.get('/buffered', (err, res, body) => {
        t.is(body.ok, 1)
        t.is(res.headers['content-type'], 'application/json; charset=utf-8')
        t.end()
    })
})

test.cb('request does not exist', (t) => {
    req.get('/404?callback=cb', (err, res, body) => {
        t.is(body, 'Not Found')
        t.is(res.headers['content-type'], 'text/plain; charset=utf-8')
        t.end()
    })
})

test.cb('this.body is null', (t) => {
    req.get('/null?callback=cb', (err, res, body) => {
        t.is(res.statusCode, 204)
        t.end()
    })
})

test.cb('there is callback params', (t) => {
    req.get('/buffered?callback=cb', (err, res, body) => {
        body = JSON.parse(body.match(/cb\(([^)]+)\)/m)[1])

        t.is(body.ok, 1)
        t.is(res.headers['content-type'], 'text/javascript; charset=utf-8')
        t.end()
    })
})

test.cb('there is more callback params', (t) => {
    req.get('/buffered?callback=cb&callback=cb2', (err, res, body) => {
        body = JSON.parse(body.match(/cb\(([^)]+)\)/m)[1])

        t.is(body.ok, 1)
        t.is(res.headers['content-type'], 'text/javascript; charset=utf-8')
        t.end()
    })
})

test.cb('there is callback params length greater than limit, normal 50', (t) => {
    req.get('/buffered?callback=cb01234567890123456789012345678901234567890123456789', (err, res, body) => {
        body = JSON.parse(body.match(/cb012345678901234567890123456789012345678901234567\(([^)]+)\)/m)[1])

        t.is(body.ok, 1)
        t.is(res.headers['content-type'], 'text/javascript; charset=utf-8')
        t.end()
    })
})

test.cb('this.body is stream', (t) => {
    req.get('/stream?callback=cb', (err, res, body) => {
        body = JSON.parse(body.match(/cb\(([^)]+)\)/m)[1])

        t.is(body.ok, 1)
        t.is(res.headers['content-type'], 'text/javascript; charset=utf-8')
        t.end()
    })
})