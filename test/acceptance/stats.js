var setup = require('../../lib/test/setup'), // this must run first to ensure environment vars are set
    request = require('supertest'),
    should = require('should'),
    stats = require('../../metrics/stats'),
    redis = require('../../metrics/config');

var app = require('../../app.js').app,
    persistPause = 1000 + 100;

describe('persistence', function () {
  this.timeout(3000);

  after(function(done) {
    redis.cleanUp(function () {
      done();
    });
  });

  it('should fail if invalid stats URL because of js/nojs used', function (done) {
    request(app)
      .get('/track/aaa/appid')
      .expect(400)
      .end(function(err, res){
        if (err) throw err;
        done();
      });
  });

  it('should fail if app ID is missing', function (done) {
    request(app)
      .get('/track/js')
      .expect(404)
      .end(function(err, res){
        if (err) throw err;
        done();
      });
  });

  it('should record global and app stats', function (done) {
    var now = new Date();
        yearMonth = now.getUTCFullYear() + '-' + (now.getUTCMonth()+1) + ':';

    var checkData = function(data) {
      // should have stat for user, page, by month, global, and both for unidentified country and global
      ['users','pages'].forEach(function(scope) {
        [yearMonth, ''].forEach(function(datePrefix) {
          data[datePrefix + scope + ':js'].should.equal('1');
          data[datePrefix + scope + ':js:00'].should.equal('1');
        })
      });
    }

    request(app)
      .get('/track/js/appid')
      .expect('Content-Type', /gif/)
      .expect('Content-Length', '43')
      .expect(200)
      .end(function(err, res){
        if (err) throw err;
        setTimeout(function() {
          var requestsComplete = 0;

          // app stats
          request(app)
            .get('/data/appid')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) throw err;
              checkData(res.body);
              requestsComplete++;
              if (requestsComplete == 2) { done(); }
            });

          // global stats
          request(app)
            .get('/data')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) throw err;
              // should have stat for user, page, by month, global, and both for unidentified country and global
              checkData(res.body);
              requestsComplete++;
              if (requestsComplete == 2) { done(); }
            });
        }, 1500);
      });
  });
});