import { Logger } from './Logger'

const noOp = () => {}
export const noOpLogger: Logger = {
  start: noOp,
  migrationStart: noOp,
  migrationComplete: noOp,
  migrationFailed: noOp,
  complete: noOp,
  info: noOp,
  failed: noOp,
}
