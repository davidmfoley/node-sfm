import { Migration } from './Migration'

export type AppliedMigration = (Migration & { result: any })[]

export type MigrationResult = {
  applied: AppliedMigration
}
