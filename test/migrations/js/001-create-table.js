module.exports = function(client, cb) {
  var query = 'create table foobar(id int, name varchar);';
  client.query(query, cb);
};
