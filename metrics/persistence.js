"use strict";

function Persistence() {
  var config = require('./config'),
      APP_NAMESPACE = config.appNamespace,
      GLOBAL_NAMESPACE = config.globalNamespace,
      redisClient = config.redisClient,
      inspect = require('util').inspect,
      persistTimer = null,
      appCache = {};

  var appBase = function() {
    return {
      users: {
        js_enabled: 0,
        js_disabled: 0
      },
      pageImpressions: {
        js_enabled: 0,
        js_disabled: 0
      }
    }
  };

  // public methods

  var santizeAppId = function(appId) {
    return appId.replace(':', '_'); // santize appId as : is reserved for namespacing
  };

  // save method persists metrics to appCache
  var save = function(appId, javascriptEnabled, newUserSession) {
    appId = santizeAppId(appId);
    if (!appCache[appId]) { appCache[appId] = appBase(); }
    if (!persistTimer) { persistTimer = setTimeout(persistCacheToDatabase, 1000); }

    var app = appCache[appId],
        js_key = javascriptEnabled ? 'js_enabled' : 'js_disabled';

    // increment counters in appCache
    if (newUserSession) { app['users'][js_key] += 1; }
    app['pageImpressions'][js_key] += 1;
  };

  // private methods

  var persistCacheToDatabase = function() {
    var commands = [],
        yearMonth = 'date-' + new Date().getUTCFullYear() + '-' + (new Date().getUTCMonth()+1) + ':',
        push = function(namespace, key, value) {
          // persist metrics with two key values, one date based
          // e.g. users:js_enabled and date-2013-01:users:js_enabled
          commands.push(['HINCRBY',namespace,'total:' + key,value]);
          commands.push(['HINCRBY',namespace,yearMonth + key,value]);
        };

    for (var appId in appCache) {
      var app = appCache[appId],
          metric,
          key;

      ['users', 'pageImpressions'].forEach(function(scope) {
        ['js_enabled','js_disabled'].forEach(function(js) {
          metric = app[scope][js];
          if (metric) {
            key = scope + ':' + js;
            // persist stats for this app but also globally
            push(APP_NAMESPACE + ':' + appId, key, metric);
            push(GLOBAL_NAMESPACE, key, metric);
          }
        });
      });
    }

    if (commands.length) {
      redisClient.multi(commands).exec(function (err, replies) {
        if (err) {
          console.error('! Error persisting to Redis: ' + inspect(err))
        } /* else {
          console.log('Persisted ' + commands.length + ' items to Redis successfully');
          console.log(commands);
        } */
      });
    }

    // clear persist timer & cache
    persistTimer = null;
    appCache = {};
  }

  // public interface
  return {
    save: save,
    santizeAppId: santizeAppId
  };
}

var persistence = new Persistence();
exports.save = persistence.save;