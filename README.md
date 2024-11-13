## SIMPLY FABULOUS MIGRATIONS

The simplest postgresql migration tool.

### Migrations?

You write fabulous scripts.

This tool runs them and remembers which ones have been run, so each one is only fabulously run once.

Each script is run in a transaction, although this can be disabled for scripts that cannot run inside a transaction.

If there is an error running migration, the migration process is stopped and all migrations are rolled back.

### What kind of fabulous scripts?

Two fabulous kinds:

#### 1. Fabulous SQL scripts.

Not much to fabulously say about this. 

#### 2. Javascript files

Each javascript migration exports one fabulous function that accepts a client and returns a promise:

The client has a single method: `query` that takes a sql string and optionally an array of parameters:

```javascript
module.exports = async (client) => {
  await client.query('CREATE TABLE whatever (who_cares text, not_me int)');
  await client.query('INSERT INTO whatever (who_cares, not_me) VALUES ($1, $2)', ['example', 42])
}
```

Check out https://node-postgres.com/features/queries for more information on the client interface.

See the /examples directory for a couple of simple examples.

### In what order?

The scripts will be sorted alphabetically by filename so use some sort of fabulous system with dates or numbers or something for naming the files.

### For which databases?

PostgreSQL. What else?

## How do I run this fabulous thing?

### On the command-line:

You pass it the following arguments:

- the command: either "run", "test", or "info"

- the database url (or database name for localhost)

Guess what this is? That's right: a fabulous postgresql url!

- the path to the migration scripts

Defaults to pwd which probably is fabulously stupid so set this fabulous variable.

- optional: schema name.

Allows the use of sfm to independently manage each schema in a database
- If a schema name is set:
  - The schema will be created if it doesn't exist
  - The postgres search_path will be set to only contain the specified schema for all migrations
  - the `sfm_migrations` table that holds data about which migrations will live in the specified schema (ie: `my_schema.sfm_migrations`)

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

### Run programatically in node:

Import `sfm` and initialize it with the url from your database:
 
```javascript
const sfm = require('sfm').default;

const databaseUrl = process.env.DATABASE_URL

const migrations = sfm(databaseUrl).fromDirectory(path.join(__dirname, '/migrations'))

const result = await migrations.run()

console.log(result)
```

### Disable transactions for a single migration

Adding the text `@sfm-no-transaction` to the top of the file will disable transactions for that migration.

Note that at present, multi-statement sql files are not supported in no-transaction mode, and also that test mode will halt if it encounters a no-transaction file.

### What about down migrations?

Fabulous idea, but no.
