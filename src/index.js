// Thanks to:
//   - https://github.com/kilianc/koa-jsonp
//   - https://github.com/node-modules/jsonp-body
//   - http://blog.knownsec.com/2015/03/jsonp_security_technic

import stream from 'stream'

class Transform extends stream.Transform {
    constructor(options = {}) {
        super({
            objectMode: true
        })

        this.start = false
        this.intro = options.intro
        this.outro = options.outro
    }
    _transform(chunk, encoding, next) {
        if (!this.start) {
            this.start = true
            this.push(this.intro)
        }

        this.push(chunk)
        process.nextTick(next)
    }
    _flush(next) {
        if (!this.start) {
            /* istanbul ignore next */
            this.push(this.intro)
        }

        this.push(this.outro)
        this.push(null)
        process.nextTick(next)
    }
}

export default function (options) {
    options = Object.assign({}, {
        limit: 50,
        callbackName: 'callback'
    }, options)

    return function* _jsonp(next) {
        let intro, outro, callback

        yield* next

        intro = ''
        outro = ');'
        callback = this.query[options.callbackName]

        if (!callback) {
            return
        }

        if (!this.body) {
            return
        }

        if (Array.isArray(callback)) {
            callback = callback[0]
        }

        if (callback.length > options.limit) {
            callback = callback.substring(0, options.limit)
        }

        callback = callback.replace(/[^\[\]\w\$\.]+/g, '')
        intro = `/**/ typeof ${callback} === 'function' && ${callback}(`
        
        this.type = 'text/javascript'
        this.set('X-Content-Type-Options', 'nosniff')

        if (this.body.pipe) {
            this.body = this.body.pipe(new Transform({ intro, outro }))
        } else {
            this.body = `${intro}${JSON.stringify(this.body, null, null)}${outro}`
            this.body = this.body.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
        }
    }
}