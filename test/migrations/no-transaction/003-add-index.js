// @sfm-no-transaction
module.exports = (client) =>
  client.query('create index concurrently on foo(baz);')
