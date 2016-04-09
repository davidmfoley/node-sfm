'use strict';
var pg = require('pg');
var async = require('async');
var chalkLogger = require('./chalkLogger');

var migrationsTableName = 'sfm_migrations';

module.exports = function(url, opts) {
  var logger = (opts ||{}).logger || chalkLogger;
  return {
    fromDirectory: function(pathname) {
      return runner(url, fileSource.bind(null, pathname));
    }
  };

  function runner(url, source) {
    return {
      run: function(cb) {
        logger.start();
        pg.connect(url, function(err, client, done) {
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
        pg.connect(url, function(err, client, done) {
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
        pg.connect(url, function(err, client, done) {
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
        client.query(sql, params, cb);
      }
    };
  }

  function testMigrations(client, source, cb) {
    source(function(err, migrations) {
      if (err) { return cb(err);}

      client = wrapClient(client);

      client.query('BEGIN;', function(err) {
        if (err) return cb(err);

        ensureMigrationsTableCreated(client, function(err) {
          if (err) return cb(err);

          filterAlreadyApplied(client, migrations, function(err, migrations) {
            if (err) return cb(err);
            async.mapSeries(migrations, function(migration, next) {
              migration.action(client, next);
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

    source(function(err, migrations) {
      if (err) { return cb(err);}

      ensureMigrationsTableCreated(client, function(err) {
        if (err) return cb(err);

        filterAlreadyApplied(client, migrations, function(err, migrations) {
          if (err) return cb(err);

          async.mapSeries(migrations, applyMigration.bind(null, client), function(err, results) {
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
    source(function(err, migrations) {
      if (err) { return cb(err);}

      filterAlreadyApplied(client, migrations, function(err, unapplied) {
        if (err) return cb(err);

        getAppliedMigrations(client, function(err, applied) {
          if (err) { return cb(err);}
          cb(undefined, {applied: applied, unapplied: unapplied});
        });
      });
    });
  }

  function applyMigration(client, migration, cb) {
    logger.migrationStart(migration);
    client.query('BEGIN;', function(err) {
      if (err) return cb(err);
      migration.action(client, function(err) {
        if (err) {
          return handleError(client, migration, err, cb);
        }

        markAsComplete(client, migration.name, function(err) {
          if (err) {
            return handleError(client, migration, err, cb);
          }

          logger.migrationComplete(migration, err);
          client.query('COMMIT;', cb);
        });
      });
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

  function filterAlreadyApplied(client, migrations, cb) {
    getAppliedMigrationNames(client, function(err, applied) {
      if (err) return cb(err);

      var notYetApplied = migrations.filter(function(migration) {
        return applied.indexOf(migration.name) === -1;
      });

      cb(null, notYetApplied);
    });
  }

  function getAppliedMigrations(client, cb) {
    client.query('select applied, name from ' + migrationsTableName + ' order by applied', function(err, result) {
      if (err) {
        // sfm table not yet setup, no migrations applied
        if (err.code === '42P01') return cb(undefined, []);
        return cb(err);
      }
      return cb(undefined, result.rows);
    });
  }

  function getAppliedMigrationNames(client, cb) {
    getAppliedMigrations(client, function(err, migrations) {
      if (err) return cb(err);
      var names = migrations.map(function(row) { return row.name; });
      cb(undefined, names);
    });
  }

  function ensureMigrationsTableCreated(client, cb) {
    client.query('create table if not exists ' + migrationsTableName + '(name varchar, applied timestamp)', cb);
  }

  function markAsComplete(client, name, cb) {
    client.query('insert into ' + migrationsTableName + '(name, applied) values($1, $2)', [name, new Date()], function(err) {
      cb(err);
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
      migration(client, cb);
    }
  }
};
