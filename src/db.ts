import pg from 'pg'

export type DatabaseClient = {
  query: pg.Pool['query']
}

export function connect(
  url: string,
  cb: (
    err: Error | undefined,
    client?: DatabaseClient,
    done?: () => void
  ) => void
) {
  var pool = new pg.Pool({ connectionString: url })

  pool.connect((err, client, done) => {
    if (err) return cb(err)
    cb(undefined, client, function () {
      done()
      pool.end()
    })
  })
}
