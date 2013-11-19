var redis = require('redis'),
    url = require('url'),
    redisURL = url.parse(process.env.REDISCLOUD_URL || 'redis://localhost:6379');

var redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (redisURL.auth) { exports.redisClient.auth(redisURL.auth.split(":")[1]); }

exports.redisClient = redisClient;
exports.appNamespace = (process.env.TEST_NAMESPACE || '') + 'ap';
exports.globalNamespace = (process.env.TEST_NAMESPACE || '') + 'gl';
exports.globalDayNamespace = (process.env.TEST_NAMESPACE || '') + 'gl-dy';
exports.globalHourNamespace = (process.env.TEST_NAMESPACE || '') + 'gl-hr';

exports.santizeAppId = function(appId) {
  return appId.replace(':', '_'); // santize appId as : is reserved for namespacing
};

exports.cleanUp = function(done) {
  if (process.env.TEST_NAMESPACE) {
    redisClient.KEYS(process.env.TEST_NAMESPACE + '*', function(err, replies) {
      if (err) throw err;
      var delCommands = [];
      replies.forEach(function(key) {
        delCommands.push(['DEL',key]);
      });
      redisClient.multi(delCommands).exec(function (err, replies) {
        if (err) {
          console.error('! Error cleaning up after test: ' + inspect(err));
        }
        done();
      });
    });
  } else {
    throw 'Cannot clean up Redis unless test namespace is defined';
  }
}