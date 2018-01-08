module.exports = async function(client) {
  await client.query("insert into foobar(id, name) values(1, 'one');");
  await client.query("insert into foobar(id, name) values($1, $2);", [2, 'two']);
};
