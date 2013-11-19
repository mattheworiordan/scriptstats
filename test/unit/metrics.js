require('../../lib/test/setup');

var persistPause = 1000 + 100,
    should = require('should'),
    stats = require('../../metrics/stats'),
    persistence = require('../../metrics/persistence'),
    redis = require('../../metrics/config'),
    now = new Date(),
    yearMonth = now.getUTCFullYear() + '-' + (now.getUTCMonth()+1) + ':';

function checkData(jsEnabled, metric, country, data) {
  ['users','pages'].forEach(function(scope) {
    [yearMonth, ''].forEach(function(datePrefix) {
      data[datePrefix + scope + ':' + (jsEnabled ? 'js' : 'nojs')].should.equal(String(metric));
      data[datePrefix + scope + ':' + (jsEnabled ? 'js' : 'nojs') + ':' + country].should.equal(String(metric));
    });
  });
}

describe('stats persistence and retrieval', function () {
  this.timeout(3000);

  afterEach(function(done) {
    redis.cleanUp(function () {
      done();
    });
  });

  it('should update stats accordingly for 5 of the same requests', function (done) {
    var appId = 'test',
        javascriptEnabled = false,
        newUserSession = true,
        country = 'GB';

    for (var i = 0; i < 5; i++) {
      persistence.save(appId, javascriptEnabled, newUserSession, country);
    }

    setTimeout(function() {
      stats.getAppStats('test', function(err, data) {
        if (err) throw err;
        checkData(javascriptEnabled, 5, country, data);
        stats.getGlobalStats(function(err, data) {
          if (err) throw err;
          checkData(javascriptEnabled, 5, country, data);
          done();
        })
      });
    }, persistPause);
  });

  it('should update stats accordingly for a mix of countries', function (done) {
    var appId = 'test',
        javascriptEnabled = false,
        newUserSession = true,
        country1 = 'GB',
        country2 = 'US';

    function checkCountryData(jsEnabled, countryMetric, allMetric, country, data) {
      ['users','pages'].forEach(function(scope) {
        [yearMonth, ''].forEach(function(datePrefix) {
          data[datePrefix + scope + ':' + (jsEnabled ? 'js' : 'nojs')].should.equal(String(allMetric));
          data[datePrefix + scope + ':' + (jsEnabled ? 'js' : 'nojs') + ':' + country].should.equal(String(countryMetric));
        });
      });
    }

    for (var i = 0; i < 5; i++) {
      persistence.save(appId, javascriptEnabled, newUserSession, country1);
      persistence.save(appId, javascriptEnabled, newUserSession, country2);
    }

    setTimeout(function() {
      stats.getAppStats('test', function(err, data) {
        if (err) throw err;
        checkCountryData(javascriptEnabled, 5, 10, country1, data);
        checkCountryData(javascriptEnabled, 5, 10, country2, data);
        stats.getGlobalStats(function(err, data) {
          if (err) throw err;
          checkCountryData(javascriptEnabled, 5, 10, country1, data);
          checkCountryData(javascriptEnabled, 5, 10, country2, data);
          done();
        });
      });
    }, persistPause);
  });

  it('should update stats accordingly for a mix of javascript & no-javascript', function (done) {
    var appId = 'test',
        newUserSession = true,
        country = 'GB';

    for (var i = 0; i < 25; i++) {
      persistence.save(appId, true, newUserSession, country);
      persistence.save(appId, false, newUserSession, country);
    }

    setTimeout(function() {
      stats.getAppStats('test', function(err, data) {
        if (err) throw err;
        checkData(true, 25, country, data);
        checkData(false, 25, country, data);
        stats.getGlobalStats(function(err, data) {
          if (err) throw err;
          checkData(true, 25, country, data);
          checkData(false, 25, country, data);
          done();
        });
      });
    }, persistPause);
  });

  it('should update stats accordingly for a mix of users and impressions', function (done) {
    var appId = 'test',
        javascriptEnabled = true,
        country = '00';

    function checkUserImpressionData(jsEnabled, userMetric, pageMetric, country, data) {
      [yearMonth, ''].forEach(function(datePrefix) {
        data[datePrefix + 'users:' + (jsEnabled ? 'js' : 'nojs')].should.equal(String(userMetric));
        data[datePrefix + 'users:' + (jsEnabled ? 'js' : 'nojs') + ':' + country].should.equal(String(userMetric));
      });
      [yearMonth, ''].forEach(function(datePrefix) {
        data[datePrefix + 'pages:' + (jsEnabled ? 'js' : 'nojs')].should.equal(String(pageMetric));
        data[datePrefix + 'pages:' + (jsEnabled ? 'js' : 'nojs') + ':' + country].should.equal(String(pageMetric));
      });
    }

    for (var i = 0; i < 25; i++) {
      persistence.save(appId, javascriptEnabled, true, country);
      persistence.save(appId, javascriptEnabled, false, country);
    }

    setTimeout(function() {
      stats.getAppStats('test', function(err, data) {
        if (err) throw err;
        checkUserImpressionData(javascriptEnabled, 25, 50, country, data);
        checkUserImpressionData(javascriptEnabled, 25, 50, country, data);
        stats.getGlobalStats(function(err, data) {
          if (err) throw err;
          checkUserImpressionData(javascriptEnabled, 25, 50, country, data);
          checkUserImpressionData(javascriptEnabled, 25, 50, country, data);
          done();
        });
      });
    }, persistPause);
  });
});