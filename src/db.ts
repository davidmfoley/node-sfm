import pg from 'pg'

export type DatabaseClient = {
  query: pg.Pool['query']
}

export async function connect(url: string): Promise<{
  client?: DatabaseClient
  done?: () => void
}> {
  var pool = new pg.Pool({ connectionString: url })

  const client = await pool.connect()

  return {
    client,
    done: () => client.release(),
  }
}
