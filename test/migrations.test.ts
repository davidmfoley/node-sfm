'use strict'
import { describe, it, beforeEach } from 'mocha'
import sfm from '../src'
import assert from 'node:assert'
import { noOpLogger } from '../src/logger'
import pg from 'pg'
import { MigrationResult } from '../src/migrationResult'

describe('sfm', function () {
  let pool: pg.Pool

  var connectionString =
    process.env.SFM_TEST_DATABASE_URL || 'postgresql://localhost/sfm_test'

  const migrations = sfm(connectionString, { logger: noOpLogger })

  beforeEach(async () => {
    pool = new pg.Pool({ connectionString })
    var getTables =
      "select table_schema, table_name from information_schema.tables where table_schema in ('public', 'example_schema');"

    const result = await pool.query(getTables)
    for (const row of result.rows) {
      await pool.query(`DROP TABLE ${row.table_schema}.${row.table_name}`)
    }
  })

  afterEach(async () => {
    await pool.end()
  })

  it('errors with non-existent file path', async () => {
    await assert.rejects(
      migrations.fromDirectory(__dirname + '/doesnotexist').run()
    )
  })

  it('errors when there is a bad migration', async () => {
    await assert.rejects(
      migrations.fromDirectory(__dirname + '/migrations/error').run(),
      {
        failedMigration: '001-cause-error.sql',
      }
    )
  })

  it('is transactional when an error occurs', async () => {
    await assert.rejects(
      migrations.fromDirectory(__dirname + '/migrations/midpoint-error').run(),
      {
        failedMigration: '003-delete-records-with-error.sql',
      }
    )

    const result = await pool.query('select count(*) as count from foo')
    assert.strictEqual(result.rows[0].count, '3')
  })

  it('handles empty directory', async () => {
    const result = await migrations
      .fromDirectory(__dirname + '/migrations/empty')
      .run()
    assert.strictEqual(result.applied.length, 0)
  })

  describe('test mode', function () {
    let result: MigrationResult

    beforeEach(async () => {
      result = await migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .test()
    })

    it('does not commit to the db', async () => {
      const info = await migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .info()

      assert.strictEqual(info.applied.length, 0)
    })

    it('returns metadata about the migration', function () {
      assert.strictEqual(result.applied.length, 2)
    })

    it('handles SQL files', async () => {
      await assert.rejects(pool.query('select * from foo'), {
        message: 'relation "foo" does not exist',
      })
    })
  })

  describe('with SQL files', function () {
    let result

    beforeEach(async () => {
      result = await migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .run()
    })

    it('returns metadata about the migration', function () {
      assert.strictEqual(result.applied.length, 2)
    })

    it('handles SQL files', async () => {
      const result = await pool.query('select * from foo')
      assert.strictEqual(result.rows.length, 3)
    })

    it('can get info', async function () {
      const info = await migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .info()
      assert.strictEqual(info.applied.length, 2)
    })

    it('only runs each migration once', async () => {
      const rerunResult = await migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .run()
      assert.strictEqual(rerunResult.applied.length, 0)
    })
  })

  describe('specifying schema', function () {
    it('migrates with search_path set to the specified schema', async () => {
      const migrations = sfm(connectionString, {
        logger: noOpLogger,
        schema: 'example_schema',
      })
      const result = await migrations
        .fromDirectory(__dirname + '/migrations/sql-other-schema')
        .run()
      assert.strictEqual(result.applied.length, 2)

      const foos = await pool.query(`select * from example_schema.foo`)
      assert.strictEqual(foos.rows.length, 3)

      const result2 = await migrations
        .fromDirectory(__dirname + '/migrations/sql-other-schema')
        .run()
      assert.strictEqual(result2.applied.length, 0)
    })
  })

  it('handles JS files', async () => {
    const result = await migrations
      .fromDirectory(__dirname + '/migrations/js')
      .run()
    assert.strictEqual(result.applied.length, 2)
  })

  it('handles JS files with promises', async () => {
    const result = await migrations
      .fromDirectory(__dirname + '/migrations/js-promise')
      .run()
    assert.strictEqual(result.applied.length, 2)
  })

  it('executes JS files once', async () => {
    await migrations.fromDirectory(__dirname + '/migrations/js').run()
    const result = await migrations
      .fromDirectory(__dirname + '/migrations/js')
      .run()
    assert.strictEqual(result.applied.length, 0)
  })
})
