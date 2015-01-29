'use strict';
var migrations = require('../lib/migrations');
var expect = require('chai').expect;
describe('migrations', function() {
  it('is a thing', function() {
    expect(typeof migrations).to.equal('function');
  });
});
