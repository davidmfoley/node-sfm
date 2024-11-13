# SIMPLY FABULOUS MIGRATIONS

The simplest postgresql migration tool.

## Quick start
```sh
$ export DATABASE_URL="your database url here"
$ mkdir migrations
$ echo "select 'hello world';" > migrations/000-hello-world.sql

# test that migrations work
$ npx sfm test $DATABASE_URL migrations/

# apply migrations
$ npx sfm run $DATABASE_URL migrations/

# get info about migrations:
$ npx sfm info $DATABASE_URL migrations/
```


## Migrations?

This tool runs your postgresql migrations, and records which ones have been run in a table in the database.

Each script is run in a transaction, by default. This can be disabled for scripts that contain SQL statements that cannot run inside a transaction.

If there is an error running migration, the migration process is stopped and failed migrations are rolled back.

## What are migrations?

Migrations can take two forms:

#### 1. SQL scripts.

SQL scripts, with an `sql` file extension. Each can contain multiple statements.

#### 2. Javascript files

Each javascript migration exports a function that accepts a database client and returns a promise.

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

The scripts will be sorted alphabetically by filename so use some sort of system with dates or numbers or something for naming the files.

## sfm command examples

The command-line arguments are the same for all commands:

```
sfm [command] [database url] [migrations path] [optional schema name]
```

- the command: either "run", "test", or "info"

- the database url (or database name for localhost)

- the path to the migration scripts

Defaults to pwd

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

Test your migrations.

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

## Additional notes

### Specifying schema

If a schema name is specified, `sfm` will attempt to create the specified schema if it does not exist.

Note that, even with a schema specified, migrations must still specify the schema of tables or other objects that are outside the default schema, including the schema name.

### Storage of migration information in the database

`sfm` stores the migrations that have been run in a table named `sfm_migrations`.

If `schema` is specified, this table will be created in the specified schema.
If `schema` is not specified, the table will be created in the default schema.

### Disable transactions for a single migration

Adding the text `@sfm-no-transaction` to the top of the file will disable transactions for that migration.

Note that at present, multi-statement sql files are not supported in no-transaction mode, and also that test mode will halt if it encounters a no-transaction file.

