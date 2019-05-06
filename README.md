## SIMPLY FABULOUS MIGRATIONS

The simplest postgresql migration tool.

### Migrations?

You write fabulous scripts.

This tool runs them and remembers which ones have been run, so each one is only fabulously run once.

All of the scripts are run inside a single transaction.

If there is an error running migration, the migration process is stopped and all migrations are rolled back.

### What kind of fabulous scripts?

Two fabulous kinds:

#### 1. Fabulous SQL scripts.

Not much to fabulously say about this. 

#### 2. Javascript files

Javascript migrations can either use callbacks or promises (async/await).

Each javascript migration exports one fabulous function that has one of the two following signatures:

##### Callbacks

Not preferred, but supported. Upgrade your node version, yo.

```
module.exports = (client, done) => {
  client.query('CREATE TABLE whatever (who_cares text)', done);
}
```

##### Async/await or promise

If your migration function returns a promise, SFM will wait for that promise to resolve.
```
module.exports = async (client) => {
  await client.query('CREATE TABLE whatever (who_cares text)');
}
```

Check out https://node-postgres.com/features/queries for more information on the client interface.

See the /examples directory for a couple of simple examples.

### In what order?

The scripts will be sorted alphabetically by filename so use some sort of fabulous system with dates or numbers or something for naming the files.

### For which databases?

PostgreSQL. What else?

### How do I run this fabulous thing?

You pass it the following arguments:

- the command: either "run", "test", or "info"

- the database url (or database name for localhost)

Guess what this is? That's right: a fabulous postgresql url!

- the path to the migration scripts

Defaults to pwd which probably is fabulously stupid so set this fabulous variable.

### examples

#### sfm run

Run migrations:
```
$ sfm run my_local_db db/migrations/
```

#### sfm info

Find out which migrations have been run:
```
$ sfm info my_local_db
```

#### sfm test

Test your migrations (note: terrible, terrible SQL query output at present)

This will run all unapplied migrations in a transaction and roll back at the end, while logging some information about the queries that were executed.

```
$ sfm test my_local_db db/migrations/
```

### What about down migrations?
Fabulous idea, but no.
