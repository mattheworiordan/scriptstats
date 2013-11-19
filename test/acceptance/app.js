var setup = require('../../lib/test/setup'), // this must run first to ensure environment vars are set
    request = require('supertest');

process.env.PORT = 10000 + Math.floor(Math.random(10000));
var app = require('../../app.js').app;

describe('app', function () {
  it('should respond to a home page request', function (done) {
    request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200, /ScriptStats/)
      .end(function(err, res){
        if (err) throw err;
        done();
      });
  });
});