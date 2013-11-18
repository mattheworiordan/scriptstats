"use strict";

function Persistence() {
  var config = require('./config'),
      APP_NAMESPACE = config.appNamespace,
      GLOBAL_NAMESPACE = config.globalNamespace,
      GLOBAL_DAY_NAMESPACE = config.globalDayNamespace,
      GLOBAL_HOUR_NAMESPACE = config.globalHourNamespace,
      redisClient = config.redisClient,
      inspect = require('util').inspect,
      persistTimer = null,
      appCache = {};

  var appBase = function() {
    return {
      users: {
        js: {
          global: 0,
          countries: {}
        },
        nojs: {
          global: 0,
          countries: {}
        }
      },
      pages: {
        js: {
          global: 0,
          countries: {}
        },
        nojs: {
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
        js_key = javascriptEnabled ? 'js' : 'nojs';

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
    app['pages'][js_key].global += 1;
    updateCountryCount(app['pages'][js_key].countries, country);
  };

  // private methods

  var dayOfYear = function(now) {
    var start = new Date(now.getUTCFullYear(), 0, 0),
        diff = now - start,
        oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  var persistCacheToDatabase = function() {
    var now = new Date(),
        yearMonth = now.getUTCFullYear() + '-' + (now.getUTCMonth()+1) + ':',
        yearDay = now.getUTCFullYear() + '-' + dayOfYear(now) + ':',
        hourNs = now.getUTCHours() + ':',
        splitKey,
        shortKey;

    var commands = [],
        pushRaw = function(namespace, key, metric) {
          commands.push(['HINCRBY',namespace,key,metric]);
        },
        pushTotalAndByMonth = function(namespace, key, metric) {
          // persist metrics with two key metrics, one date based
          // e.g. users:js and 2013-01:users:js
          pushRaw(namespace, key, metric);
          pushRaw(namespace, yearMonth + key, metric);
        },
        globalStats = {},
        updateGlobals = function(key, metric) {
          if (!globalStats[key]) {
            globalStats[key] = metric;
          } else {
            globalStats[key] += metric;
          }
        };

    for (var appId in appCache) {
      var app = appCache[appId],
          metric,
          key;

      ['users', 'pages'].forEach(function(scope) {
        ['js','nojs'].forEach(function(js) {
          metric = app[scope][js].global;
          if (metric) {
            key = scope + ':' + js;
            pushTotalAndByMonth(APP_NAMESPACE + ':' + appId, key, metric);
            updateGlobals(key, metric);
          }
          for (var country in app[scope][js].countries) {
            key = scope + ':' + js + ':' + country;
            pushTotalAndByMonth(APP_NAMESPACE + ':' + appId, key, metric);
            updateGlobals(key, metric);
          }
        });
      });
    }

    // run through global aggregated stats and add to metrics queue
    for (var key in globalStats) {
      pushTotalAndByMonth(GLOBAL_NAMESPACE, key, globalStats[key]);
      // only aggregate total stats to day or hour aggregations
      if (key.indexOf('month') !== 0) {
        splitKey = key.split(':');
        if (splitKey.length === 3) { // e.g. pages:js:US
          // contains a country code, we measure country traffic by hour
          pushRaw(GLOBAL_HOUR_NAMESPACE, hourNs + key, globalStats[key]);
        } else if (splitKey.length === 2) { // e.g. pages:js
          pushRaw(GLOBAL_HOUR_NAMESPACE, hourNs + key, globalStats[key]);
          pushRaw(GLOBAL_DAY_NAMESPACE, yearDay + key, globalStats[key]);
        }
      }
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
  };

  // public interface
  return {
    save: save
  };
}

var persistence = new Persistence();
exports.save = persistence.save;