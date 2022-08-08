import fs from 'node:fs'
import path from 'node:path'
import { DatabaseClient } from './db'

const sqlMigration = (file: string) => {
  var contents = fs.readFileSync(file, 'utf-8')
  return async (client: DatabaseClient) => {
    const result = await client.query(contents)
    return { rows: result.rows, rowCount: result.rowCount }
  }
}

const jsMigration = (file: string) => {
  const migration = require(file)
  return async (client: DatabaseClient) => {
    if (typeof migration === 'function') {
      return migration(client)
    }
  }
}

function buildMigration(file) {
  var path = require('path')
  var extname = path.extname(file)
  if (extname === '.sql') {
    return {
      name: path.basename(file),
      action: sqlMigration(file),
    }
  }
  if (extname === '.js') {
    return {
      name: path.basename(file),
      action: jsMigration.bind(null, file),
    }
  }
}

function isFileWeCareAbout(f: string) {
  var extname = path.extname(f)
  return fs.statSync(f).isFile() && (extname === '.sql' || extname === '.js')
}

export const fileSource = (pathname: string) => async () => {
  var path = require('path')
  var fs = require('fs')

  if (!fs.existsSync(pathname)) {
    throw new Error('bad path ' + pathname)
  }

  var files = fs
    .readdirSync(pathname)
    .map((f: string) => path.join(pathname, f))
    .filter(isFileWeCareAbout)
    .sort()

  return files.map(buildMigration)
}
