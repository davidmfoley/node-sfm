import pg from 'pg'

type DBClient = any

export function connect(
  url: string,
  cb: (err: Error, client?: DBClient, done?: () => void) => void
) {
  var pool = new pg.Pool({ connectionString: url })

  pool.connect(function (err, client, done) {
    if (err) return cb(err)
    cb(undefined, client, function () {
      done()
      pool.end()
    })
  })
}
