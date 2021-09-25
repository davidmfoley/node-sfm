'use strict';
var pg = require('pg');
var async = require('async');
var chalkLogger = require('../chalkLogger');
const migrationHistory = require('./migrationHistory');


module.exports = function(url, opts) {
  var logger = (opts ||{}).logger || chalkLogger;
  return {
    fromDirectory: function(pathname) {
      return runner(url, fileSource.bind(null, pathname));
    }
  };

  function connect(cb) {
    var pool = new pg.Pool({connectionString: url});

    pool.connect(function(err, client, done) {
      if (err) return cb(err);
      cb(undefined, client, function() {
        done();
        pool.end();
      });
    });
  }

  function runner(url, source) {
    return {
      run: function(cb) {
        logger.start();
        connect(function(err, client, done) {
          if (err) {
            logger.failed(err);
            return cb(err);
          }

          runMigrations(client, source, function(err, result) {
            done();

            if (err) {
              logger.failed(err);
            }
            else {
              logger.complete(result);
            }

            cb(err, result);
          });
        });
      },
      test: function(cb) {
        logger.start();
        connect(function(err, client, done) {
          if (err) {
            logger.failed(err);
            return cb(err);
          }

          testMigrations(client, source, function(err, result) {
            done();

            if (err) {
              logger.failed(err);
            }
            else {
              logger.complete(result);
            }

            cb(err, result);
          });
        });
      },
      info: function(cb) {
        connect(function(err, client, done) {
          if (err) return cb(err);

          getInfo(client, source, function(err, result) {
            done();
            cb(err, result);
          });
        });
      }
    };
  }

  function wrapClient(client) {
    return {
      query: function(sql, params, cb) {
        if (Array.isArray(params)) {
          logger.info(sql, params);
        }
        else {
          logger.info(sql);
        }
        if (typeof params === 'function') {
          cb = params;
          params = [];
        }

        if (typeof cb === 'function') {
          client.query(sql, params, function(err, result) {
            if (result && result.rowCount) {
              console.log(result.rowCount + ' rows affected');
            }
            cb(err, result);
          });
        }
        else {
          return client.query(sql, params).then(result => {
              console.log(result.rowCount + ' rows affected');
            return result;
          });
        }
      }
    };
  }

  function testMigrations(client, source, cb) {
    source(function(err, migrations) {
      if (err) { return cb(err);}

      client = wrapClient(client);
      const history = migrationHistory(client)

      client.query('BEGIN;', function(err) {
        if (err) return cb(err);

        history.ensureMigrationsTableCreated(function(err) {
          if (err) return cb(err);

          history.filterAlreadyApplied(migrations, function(err, migrations) {
            if (err) return cb(err);
            async.mapSeries(migrations, function(migration, next) {
              var result = migration.action(client, next);

              if (result && result.then) {
                result.then(function() { next(); }, next);
              }
            }, function(err, results) {
              client.query('ROLLBACK;', function(rollbackErr) {
                if (err|| rollbackErr) {
                  return cb(err || rollbackErr);
                }
                cb(undefined, {
                  applied: migrations.map(function(m, i) {
                    return Object.assign({results: results[i]}, m);
                  })
                });
              });
            });
          });
        });
      });
    });
  }


  function runMigrations(client, source, cb) {
    const history = migrationHistory(client);

    source(function(err, migrations) {
      if (err) { return cb(err);}

      history.ensureMigrationsTableCreated(function(err) {
        if (err) return cb(err);

        history.filterAlreadyApplied(migrations, function(err, migrations) {
          if (err) return cb(err);

          async.mapSeries(migrations, applyMigration.bind(null, client, history), function(err) {
            if (err) return cb(err);

            cb(undefined, {
              applied: migrations
            });
          });
        });
      });
    });
  }

  function getInfo(client, source, cb) {
    const history = migrationHistory(client)
    source(function(err, migrations) {
      if (err) { return cb(err);}

      history.filterAlreadyApplied(migrations, function(err, unapplied) {
        if (err) return cb(err);

        history.getAppliedMigrations(function(err, applied) {
          if (err) { return cb(err);}
          cb(undefined, {applied: applied, unapplied: unapplied});
        });
      });
    });
  }

  function applyMigration(client, history, migration, cb) {
    logger.migrationStart(migration);
    client.query('BEGIN;', function(err) {
      if (err) return cb(err);
      function handleResult(err) {
        if (err) {
          return handleError(client, migration, err, cb);
        }

        history.markAsComplete(migration.name, function(err) {
          if (err) {
            return handleError(client, migration, err, cb);
          }

          logger.migrationComplete(migration, err);
          client.query('COMMIT;', cb);
        });
      }

      var result = migration.action(client, handleResult);

      if (result && result.then) {
        result.then(function() { handleResult(); }, handleResult);
      }
    });
  }

  function handleError(client, migration, err, cb) {
    logger.migrationFailed(migration, err);

    client.query('ROLLBACK', function(rollbackErr) {
      if (rollbackErr) {
        // log...
      }

      //TODO: real error
      var error = new Error('Migration failed: ' + migration.name + ':' + err.message);
      error.failedMigration = migration.name;
      error.sqlError = err;

      return cb(error);
    });
  }

  function fileSource(pathname, cb) {
    var path = require('path');
    var fs = require('fs');

    if (!fs.existsSync(pathname)) {
      return cb(new Error('bad path ' + pathname));
    }

    var files = fs.readdirSync(pathname);
    files = files.map(function(f) { return path.join(pathname, f); });
    files = files.filter(isFileWeCareAbout);
    files.sort();

    return cb(undefined, files.map(buildMigration));

    function isFileWeCareAbout(f) {
      var extname = path.extname(f);
      return fs.statSync(f).isFile() && (extname === '.sql' || extname === '.js');
    }
  }

  function buildMigration(file) {
    var path = require('path');
    var extname = path.extname(file);
    if (extname === '.sql') {
      return {
        name: path.basename(file),
        action: sqlMigration.bind(null, file)
      };
    }
    if (extname === '.js') {
      return {
        name: path.basename(file),
        action: jsMigration.bind(null, file)
      };
    }
  }

  function sqlMigration(file, client, cb) {
    var fs = require('fs');
    var contents = fs.readFileSync(file, 'utf-8');
    client.query(contents, function(err, result) {
      cb(err, result && { rows: result.rows, rowCount: result.rowCount});
    });
  }

  function jsMigration(file, client, cb) {
    var migration = require(file);

    if (typeof migration === 'function') {
      return migration(client, cb);
    }
  }
};
