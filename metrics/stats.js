"use strict";

function Stats() {
  var config = require('./config'),
      APP_NAMESPACE = config.appNamespace,
      GLOBAL_NAMESPACE = config.globalNamespace,
      redisClient = config.redisClient;

  // private methods
  var getStats = function(appId, callback) {
    var key = GLOBAL_NAMESPACE;
    if (appId) {
      key = APP_NAMESPACE + ':' + config.santizeAppId(appId);
    }
    redisClient.hgetall(key, function (redisErr, redisObj) {
      callback(redisErr, redisObj);
    });
  };

  // public interface
  return {
    getGlobalStats: function(callback) { getStats(null, callback); },
    getAppStats: function(app, callback) { getStats(app, callback); }
  }
}

var stats = new Stats();
exports.getGlobalStats = stats.getGlobalStats;
exports.getAppStats = stats.getAppStats;