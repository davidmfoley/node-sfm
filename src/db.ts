import pg from 'pg'

export type DatabaseClient = {
  query: pg.Pool['query']
}

export async function connect(config: pg.PoolConfig): Promise<{
  client?: DatabaseClient
  done?: () => void
}> {
  var pool = new pg.Pool(config)

  const client = await pool.connect()

  return {
    client,
    done: () => client.release(),
  }
}
