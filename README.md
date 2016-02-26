## SIMPLE FUCKING MIGRATIONS

### Migrations?

You write fucking scripts. This tool runs them and remembers which ones have been run.

### What kind of fucking scripts?
1. Fucking SQL scripts.
2. Javascript files that export a function that takes a pg client and calls a callback:

```javascript
module.exports = function(client, callback) {
  // call the callback when you are done, passing an error if you fail.
}
```

### In what order?

The scripts will be sorted alphabetically by filename so use some sort of fucking system with dates or numbers or some shit for naming the files.

### For which databases?

Fucking PostgreSQL. What else?

### How do I run this fucking thing?

You pass it the following arguments:

- the command: either "run" or "info"

- the database url (or database name for localhost)

Guess what this is? That's right: a fucking postgresql url!

- the path to the migration scripts

Defaults to pwd which probably is fucking stupid so set this fucking variable.

### examples

Run migrations:
```
$ sfm run my_local_db db/migrations/
```

Find out which migrations have been run:
```
$ sfm info my_local_db
```

Test your migrations (note: terrible, terrible SQL query output at present)

This will run all unapplied migrations in a transaction and roll back at the end.

```
$ sfm test my_local_db db/migrations/
```
### What about down migrations?
Fuck, no.
