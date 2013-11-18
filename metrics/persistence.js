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
        jsEnabled: {
          global: 0,
          countries: {}
        },
        jsDisabled: {
          global: 0,
          countries: {}
        }
      },
      pageImpressions: {
        jsEnabled: {
          global: 0,
          countries: {}
        },
        jsDisabled: {
          global: 0,
          countries: {}
        }
      }
    }
  };

  // public methods

  // save method persists metrics to appCache
  var save = function(appId, javascriptEnabled, newUserSession, country) {
    appId = config.santizeAppId(appId);
    if (!appCache[appId]) { appCache[appId] = appBase(); }
    if (!persistTimer) { persistTimer = setTimeout(persistCacheToDatabase, 1000); }

    var app = appCache[appId],
        js_key = javascriptEnabled ? 'jsEnabled' : 'jsDisabled';

    var updateCountryCount = function(countriesCollection, country) {
      if (country) {
        if (!countriesCollection[country]) {
          countriesCollection[country] = 1;
        } else {
          countriesCollection[country] += 1;
        }
      }
    };

    // increment counters in appCache
    if (newUserSession) {
      app['users'][js_key].global += 1;
      updateCountryCount(app['users'][js_key].countries, country);
    }
    app['pageImpressions'][js_key].global += 1;
    updateCountryCount(app['pageImpressions'][js_key].countries, country);
  };

  // private methods

  var persistCacheToDatabase = function() {
    var commands = [],
        yearMonth = 'date-' + new Date().getUTCFullYear() + '-' + (new Date().getUTCMonth()+1) + ':',
        push = function(namespace, key, metric) {
          // persist metrics with two key metrics, one date based
          // e.g. users:jsEnabled and date-2013-01:users:jsEnabled
          commands.push(['HINCRBY',namespace,'total:' + key,metric]);
          commands.push(['HINCRBY',namespace,yearMonth + key,metric]);
        },
        pushAppAndGlobal = function(appId, key, metric) {
          // persist stats for this app but also globally
          push(APP_NAMESPACE + ':' + appId, key, metric);
          push(GLOBAL_NAMESPACE, key, metric);
        };

    for (var appId in appCache) {
      var app = appCache[appId],
          metric,
          key;

      ['users', 'pageImpressions'].forEach(function(scope) {
        ['jsEnabled','jsDisabled'].forEach(function(js) {
          metric = app[scope][js].global;
          if (metric) {
            key = scope + ':' + js;
            pushAppAndGlobal(appId, key, metric);
          }
          for (var country in app[scope][js].countries) {
            key = scope + ':' + js + ':' + country;
            pushAppAndGlobal(appId, key, metric);
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