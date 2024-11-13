export class MultipleStatementsNotSupported extends Error {
  message = `When transactions are disabled with @sfm-no-transaction, sql file migrations can only contain a single statement. 
This may be improved in the future.`
}

export class NoTransactionInTestMode extends Error {
  constructor(migrationName: string) {
    super(
      `@sfm-no-trasaction is not supported in test mode, because it cannot be safely rolled back: ${migrationName}`
    )
  }
}
