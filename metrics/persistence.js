function Persistence() {
  var APP_NAMESPACE = 'stats:app',
      GLOBAL_NAMESPACE = 'stats:global',
      redis = require('redis'),
      url = require('url'),
      inspect = require('util').inspect,
      redisURL = url.parse(process.env.REDISCLOUD_URL || 'redis://localhost:6379'),
      redisClient = redis.createClient(),
      persistTimer = null,
      appCache = {};

  var appBase = {
    users: {
      js_enabled: 0,
      js_disabled: 0
    },
    pageImpressions: {
      js_enabled: 0,
      js_disabled: 0
    }
  };

  // public methods

  var santizeAppId = function(appId) {
    return appId.replace(':', '_'); // santize appId as : is reserved for namespacing
  };

  // save method persists metrics to appCache
  var save = function(appId, javascriptEnabled, newUserSession) {
    appId = santizeAppId(appId);
    if (!appCache[appId]) { appCache[appId] = appBase; }
    if (!persistTimer) { persistTimer = setTimeout(persistCacheToDatabase, 1000); }

    var app = appCache[appId],
        js_key = javascriptEnabled ? 'js_enabled' : 'js_disabled';

    // increment counters in appCache
    if (newUserSession) { app['users'][js_key] += 1; }
    app['pageImpressions'][js_key] += 1;
  };

  // private methods

  var persistCacheToDatabase = function() {
    var commands = []

    for (var appId in appCache) {
      var app = appCache[appId],
          metric;

      ['users', 'pageImpressions'].forEach(function(scope) {
        ['js_enabled','js_disabled'].forEach(function(js) {
          metric = app[scope][js];
          if (metric) {
            commands.push([
              'HINCRBY',
              APP_NAMESPACE + ':' + appId,
              scope + ':' + js,
              metric
            ]);

            commands.push([
              'HINCRBY',
              GLOBAL_NAMESPACE,
              scope + ':' + js,
              metric
            ]);
          }
        });
      });
    }

    if (commands.length) {
      redisClient.multi(commands).exec(function (err, replies) {
        if (err) {
          console.error('! Error persisting to Redis: ' + inspect(err))
        } else {
          console.log('Persisted ' + commands.length + ' items to Redis successfully');
        }
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

persistence = new Persistence();
exports.save = persistence.save;