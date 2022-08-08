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
      "select table_name from information_schema.tables where table_schema='public';"

    const result = await pool.query(getTables)
    for (const row of result.rows) {
      await pool.query(`DROP TABLE ${row.table_name}`)
    }
  })

  afterEach(async () => {
    await pool.end()
  })

  it('errors with non-existent file path', function (done) {
    migrations
      .fromDirectory(__dirname + '/doesnotexist')
      .run(function (err, result) {
        assert.ok(err)
        done()
      })
  })

  it('errors when there is a bad migration', function (done) {
    migrations
      .fromDirectory(__dirname + '/migrations/error')
      .run(function (err) {
        assert.ok(err)
        assert.strictEqual(err.failedMigration, '001-cause-error.sql')
        assert.ok(err.sqlError)
        done()
      })
  })

  it('is transactional when an error occurs', function (done) {
    migrations
      .fromDirectory(__dirname + '/migrations/midpoint-error')
      .run(function (err) {
        assert.ok(err)
        assert.strictEqual(
          err.failedMigration,
          '003-delete-records-with-error.sql'
        )
        assert.ok(err.sqlError)

        pool.query('select count(*) as count from foo', function (err, result) {
          if (err) return done(err)
          assert.strictEqual(result.rows[0].count, '3')
          done()
        })
      })
  })

  it('handles empty directory', function (done) {
    migrations
      .fromDirectory(__dirname + '/migrations/empty')
      .run(function (err, result) {
        assert.strictEqual(err, undefined)
        assert.strictEqual(result.applied.length, 0)
        done(err)
      })
  })

  describe('test mode', function () {
    let result: MigrationResult

    beforeEach(async () => {
      result = await migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .test()
    })

    it('does not commit to the db', function (done) {
      migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .info(function (err, info) {
          assert.strictEqual(info.applied.length, 0)
          done(err)
        })
    })

    it('returns metadata about the migration', function () {
      assert.strictEqual(result.applied.length, 2)
    })

    it('handles SQL files', function (done) {
      pool.query('select * from foo', function (err, result) {
        assert.strictEqual(err.message, 'relation "foo" does not exist')
        done()
      })
    })
  })

  describe('with SQL files', function () {
    var result

    beforeEach(function (done) {
      migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .run(function (err, result_) {
          result = result_
          done(err)
        })
    })

    it('returns metadata about the migration', function () {
      assert.strictEqual(result.applied.length, 2)
    })

    it('handles SQL files', async () => {
      const result = await pool.query('select * from foo')
      assert.strictEqual(result.rows.length, 3)
    })

    it('can get info', function (done) {
      migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .info(function (err, info) {
          assert.strictEqual(info.applied.length, 2)
          done(err)
        })
    })

    it('only runs each migration once', function (done) {
      migrations
        .fromDirectory(__dirname + '/migrations/sql')
        .run(function (err, rerunResult) {
          if (err) return done(err)
          assert.strictEqual(rerunResult.applied.length, 0)
          done()
        })
    })
  })

  it('handles JS files', function (done) {
    migrations
      .fromDirectory(__dirname + '/migrations/js')
      .run(function (err, result) {
        assert.strictEqual(result.applied.length, 2)
        done(err)
      })
  })

  it('handles JS files with promises', function (done) {
    migrations
      .fromDirectory(__dirname + '/migrations/js-promise')
      .run(function (err, result) {
        assert.strictEqual(result.applied.length, 2)
        done(err)
      })
  })

  it('executes JS files once', function (done) {
    migrations
      .fromDirectory(__dirname + '/migrations/js')
      .run(function (err, result) {
        if (err) return done(err)
        migrations
          .fromDirectory(__dirname + '/migrations/js')
          .run(function (err, result) {
            assert.strictEqual(result.applied.length, 0)
            done(err)
          })
      })
  })
})
