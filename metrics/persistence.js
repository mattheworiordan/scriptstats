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
        jsEnabled: 0,
        jsDisabled: 0
      },
      pageImpressions: {
        jsEnabled: 0,
        jsDisabled: 0
      }
    }
  };

  // public methods

  // save method persists metrics to appCache
  var save = function(appId, javascriptEnabled, newUserSession) {
    appId = config.santizeAppId(appId);
    if (!appCache[appId]) { appCache[appId] = appBase(); }
    if (!persistTimer) { persistTimer = setTimeout(persistCacheToDatabase, 1000); }

    var app = appCache[appId],
        js_key = javascriptEnabled ? 'jsEnabled' : 'jsDisabled';

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
          // e.g. users:jsEnabled and date-2013-01:users:jsEnabled
          commands.push(['HINCRBY',namespace,'total:' + key,value]);
          commands.push(['HINCRBY',namespace,yearMonth + key,value]);
        };

    for (var appId in appCache) {
      var app = appCache[appId],
          metric,
          key;

      ['users', 'pageImpressions'].forEach(function(scope) {
        ['jsEnabled','jsDisabled'].forEach(function(js) {
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
    save: save
  };
}

var persistence = new Persistence();
exports.save = persistence.save;