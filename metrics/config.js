var redis = require('redis'),
    url = require('url'),
    redis = require('redis'),
    url = require('url'),
    redisURL = url.parse(process.env.REDISCLOUD_URL || 'redis://localhost:6379');

exports.redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
exports.appNamespace = 'stats:app';
exports.globalNamespace = 'stats:global';