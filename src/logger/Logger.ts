export interface Logger {
  start: () => void
  migrationStart: (migration: Migration) => void
  migrationComplete: (migration: Migration) => void
  migrationFailed: (migration: Migration, error: error) => void
  complete: (result: MigrationResult) => void
  info: (info: string) => void
  failed: (error: Error) => void
}
