## SIMPLE FUCKING MIGRATIONS

The simplest and most profane postgresql migration tool.

### Migrations?

You write fucking scripts.

This tool runs them and remembers which ones have been run, so each one is only fucking run once.

### What kind of fucking scripts?
1. Fucking SQL scripts.
2. Javascript files

  - that export a single function that:

    - takes a pg client and a done callback

      - `module.exports = (client, done) => { client.query('CREATE TABLE WHATEVER (...)', cb); }`

    - takes a pg client and returns a promise (a la async/await)
      - `module.exports = async (client) => { await client.query('CREATE TABLE WHATEVER (...)'); }`

Check out https://github.com/brianc/node-postgres/wiki/Client for more information on the client interface.

See the /examples directory for a couple of simple examples.

### In what order?

The scripts will be sorted alphabetically by filename so use some sort of fucking system with dates or numbers or some shit for naming the files.

### For which databases?

Fucking PostgreSQL. What else?

### How do I run this fucking thing?

You pass it the following arguments:

- the command: either "run", "test", or "info"

- the database url (or database name for localhost)

Guess what this is? That's right: a fucking postgresql url!

- the path to the migration scripts

Defaults to pwd which probably is fucking stupid so set this fucking variable.

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

This will run all unapplied migrations in a transaction and roll back at the end.

It also logs a bunch of stuff that is marginally decipherable depending on your personal level of masochism.

```
$ sfm test my_local_db db/migrations/
```

### What about down migrations?
Fuck, no.
