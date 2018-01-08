'use strict';
var migrations = require('../lib/migrations');
var expect = require('chai').expect;
var pg = require('pg');
var async = require('async');

describe('migrations', function() {
  beforeEach(function(cb) {
    var connectionString = process.env.SFM_TEST_DATABASE_URL || 'postgresql://localhost/sfm_test';
    var pool = new pg.Pool({ connectionString: connectionString });

    var getTables = "select table_name from information_schema.tables where table_schema='public';";
    pool.query(getTables, function(err, result) {
      if (err) return cb(err);
      async.map(result.rows, function(row, cb) {
        var dropTable = 'DROP TABLE ' + row.table_name + ';';
        pool.query(dropTable, cb);
      }, function(err) {
        pool.end();
        cb(err);
      });
    });
  });

  //afterEach(pgDone);
  var databaseUrl = process.env.SFM_TEST_DATABASE_URL || 'postgres://localhost/sfm_test';

  it('errors with non-existent file path', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/doesnotexist').run(function(err, result) {
      expect(!!err).to.equal(true);
      done();
    });
  });

  it('errors when there is a bad migration', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/migrations/error').run(function(err, result) {
      expect(!!err).to.equal(true);
      expect(err.failedMigration).to.equal('001-cause-error.sql');
      expect(!!err.sqlError).to.equal(true);
      done();
    });
  });

  it('is transactional when an error occurs', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/migrations/midpoint-error').run(function(err, result) {
      expect(!!err).to.equal(true);
      expect(err.failedMigration).to.equal('003-delete-records-with-error.sql');
      expect(!!err.sqlError).to.equal(true);
      query('select count(*) as count from foo', function(err, result) {
        if (err) return done(err);
        expect(result.rows[0].count).to.equal('3');
        done();
      });
    });
  });

  it('handles empty directory', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/migrations/empty').run(function(err, result) {
      expect(err).to.equal(undefined);
      expect(result.applied.length).to.equal(0);
      done(err);
    });
  });

  describe('test mode', function() {
    var result;

    beforeEach(function(done) {
      migrations(databaseUrl).fromDirectory(__dirname + '/migrations/sql').test(function(err, result_) {
        result = result_;
        done(err);
      });
    });

    it('does not commit to the db',  function(done) {
      migrations(databaseUrl).fromDirectory(__dirname + '/migrations/sql').info(function(err, info) {
        expect(info.applied.length).to.equal(0);
        done(err);
      });
    });

    it('returns metadata about the migration', function() {
      expect(result.applied.length).to.equal(2);
    });

    it('handles SQL files', function(done) {
      query('select * from foo', function(err, result) {
        expect(err).to.be.ok();
        done();
      });
    });
  });

  describe('with SQL files', function() {
    var result;

    beforeEach(function(done) {
      migrations(databaseUrl).fromDirectory(__dirname + '/migrations/sql').run(function(err, result_) {
        result = result_;
        done(err);
      });
    });

    it('returns metadata about the migration', function() {
      expect(result.applied.length).to.equal(2);
    });

    it('handles SQL files', function(done) {
      query('select * from foo', function(err, result) {
        expect(result.rows.length).to.equal(3);
        done(err);
      });
    });

    it('can get info', function(done) {
      migrations(databaseUrl).fromDirectory(__dirname + '/migrations/sql').info(function(err, info) {
        expect(info.applied.length).to.equal(2);
        done(err);
      });
    });

    it('only runs each migration once', function(done) {
      migrations(databaseUrl).fromDirectory(__dirname + '/migrations/sql').run(function(err, rerunResult) {
        if (err) return done(err);
        expect(rerunResult.applied.length).to.equal(0);
        query('select * from foo', function(err, result) {
          expect(result.rows.length).to.equal(3);
          done(err);
        });
      });
    });
  });

  function query(sql, cb) {
    const client = new pg.Client({ connectionString: databaseUrl });
    client.connect(err => {
      if (err) return cb(err);
      client.query(sql, (err, result) => {
        client.end();
        cb(err, result);
      });
    });

  }

  it('handles JS files', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/migrations/js').run(function(err, result) {
      expect(err).to.equal(undefined);
      expect(result.applied.length).to.equal(2);
      done(err);
    });
  });

  it('handles JS files with promises', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/migrations/js-promise').run(function(err, result) {
      expect(err).to.equal(undefined);
      expect(result.applied.length).to.equal(2);
      done(err);
    });
  });

  it('executes JS files once', function(done) {
    migrations(databaseUrl).fromDirectory(__dirname + '/migrations/js').run(function(err, result) {
      expect(err).to.equal(undefined);
      migrations(databaseUrl).fromDirectory(__dirname + '/migrations/js').run(function(err, result) {
        expect(err).to.equal(undefined);
        expect(result.applied.length).to.equal(0);
        done(err);
      });
    });
  });
});
