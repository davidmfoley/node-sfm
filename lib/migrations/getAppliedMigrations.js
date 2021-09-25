
  module.exports = function getAppliedMigrations(client, cb) {
    client.query('select applied, name from ' + migrationsTableName + ' order by applied', function(err, result) {
      if (err) {
        // sfm table not yet setup, no migrations applied
        if (err.code === '42P01') return cb(undefined, []);
        return cb(err);
      }
      return cb(undefined, result.rows);
    });
  }
