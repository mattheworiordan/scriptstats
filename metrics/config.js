var redis = require('redis'),
    url = require('url'),
    redisURL = url.parse(process.env.REDISCLOUD_URL || 'redis://localhost:6379');

exports.redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (redisURL.auth) { exports.redisClient.auth(redisURL.auth.split(":")[1]); }

exports.appNamespace = 'stats:app';
exports.globalNamespace = 'stats:global';

exports.santizeAppId = function(appId) {
  return appId.replace(':', '_'); // santize appId as : is reserved for namespacing
};
