module.exports = async function(client) {
  var query = 'create table foobar(id int, name varchar);';
  await client.query(query);
};
