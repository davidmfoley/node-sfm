import { Migration } from '../Migration'
import { MigrationResult } from '../migrationResult'

export interface Logger {
  start: () => void
  migrationStart: (migration: Migration) => void
  migrationComplete: (migration: Migration) => void
  migrationFailed: (migration: Migration, error: Error) => void
  complete: (result: MigrationResult) => void
  info: (...info: any[]) => void
  failed: (error: Error) => void
}
