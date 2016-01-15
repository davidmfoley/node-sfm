module.exports = function(client, cb) {
  client.query("insert into foobar(id, name) values(1, 'one');", function(err) {
    if (err) return cb(err);
    client.query("insert into foobar(id, name) values($1, $2);", [2, 'two'],  cb);
  });
};
