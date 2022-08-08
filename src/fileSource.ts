import fs from 'node:fs'
import path from 'node:path'

function sqlMigration(file, client, cb) {
  var fs = require('fs')
  var contents = fs.readFileSync(file, 'utf-8')
  client.query(contents, function (err, result) {
    cb(err, result && { rows: result.rows, rowCount: result.rowCount })
  })
}

function jsMigration(file, client, cb) {
  var migration = require(file)

  if (typeof migration === 'function') {
    return migration(client, cb)
  }
}

function buildMigration(file) {
  var path = require('path')
  var extname = path.extname(file)
  if (extname === '.sql') {
    return {
      name: path.basename(file),
      action: sqlMigration.bind(null, file),
    }
  }
  if (extname === '.js') {
    return {
      name: path.basename(file),
      action: jsMigration.bind(null, file),
    }
  }
}

function isFileWeCareAbout(f) {
  var extname = path.extname(f)
  return fs.statSync(f).isFile() && (extname === '.sql' || extname === '.js')
}

export function fileSource(pathname: string, cb) {
  var path = require('path')
  var fs = require('fs')

  if (!fs.existsSync(pathname)) {
    return cb(new Error('bad path ' + pathname))
  }

  var files = fs.readdirSync(pathname)
  files = files.map(function (f) {
    return path.join(pathname, f)
  })
  files = files.filter(isFileWeCareAbout)
  files.sort()

  return cb(undefined, files.map(buildMigration))
}
