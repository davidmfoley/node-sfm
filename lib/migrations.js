'use strict';
var pg = require('pg');
var async = require('async');

var migrationsTableName = 'sfm_migrations';

module.exports = function(url) {
  return {
    fromDirectory: function(pathname) {
      return runner(url, fileSource.bind(null, pathname));
    }
  };

  function runner(url, source) {
    return {
      run: function(cb) {
        pg.connect(url, function(err, client, done) {
          if (err) return cb(err);

          source(function(err, migrations) {
            if (err) { done(); return cb(err);}

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
        });
      }
    };
  }

  function applyMigration(client, migration, cb) {
    migration.action(client, function(err) {
      if (err) {
        return cb(err);
      }

      markAsComplete(client, migration.name, cb);
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

  function getAppliedMigrationNames(client, cb) {
    client.query('select name from ' + migrationsTableName, function(err, result) {
      if (err) return cb(err);
      var names = result.rows.map(function(row) { return row.name; });
      return cb(undefined, names);
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
    files = files.filter(isFile);
    files.sort();

    return cb(undefined, files.map(buildMigration));

    function isFile(f) {
      return fs.statSync(f).isFile();
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
    client.query(contents, function(err) {
      cb(err);
    });
  }

  function jsMigration(file, client, cb) {
    var migration = require(file);

    if (typeof migration === 'function') {
      migration(client, cb);
    }
  }
};
