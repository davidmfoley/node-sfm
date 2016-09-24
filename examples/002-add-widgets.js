var async = require('async');

module.exports = function(client, done) {
  var books = [
    {id: '42', name: "hitchhiker's guide"},
    {id: '56', name: "restaurant at the end"},
    {id: '77', name: "life, the universe"},
  ];

  async.mapSeries(books, function(book, next) {
    client.query('INSERT INTO books(id, name) VALUES ($1, $2)', [next.id, next.name], next);
  }, done);
};

