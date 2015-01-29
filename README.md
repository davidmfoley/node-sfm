## SIMPLE FUCKING MIGRATIONS

### Migrations?

You write fucking scripts. This tool runs them and remembers which ones have been run.

### What kind of fucking scripts?

Fucking SQL scripts. There are no DSLs here.

### In what order?

The scripts will be sorted alphabetically by filename so use some sort of fucking system with dates or some shit for naming the files.

### For which databases?

Fucking PostgreSQL. What else?

### How do I configure this fucking thing?

Use fucking environment variables

```DATABASE_URL```
Guess what this is? That's right: a fucking postgresql url!

```MIGRATIONS_TABLE```
The name of the table to store the scripts that have already been fucking run. Defaults to 'migrations'.

```SCRIPTS_LOCATION```
Path to the fucking SQL scripts. Defaults to pwd which probably is fucking stupid so set this fucking variable.

### What about down migrations?

Fuck, no.
