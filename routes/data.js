var stats = require('../metrics/stats.js'),
    inspect = require('util').inspect,
    dataCache = {},
    expireAfter = 5;

function setCacheHeader(res) {
  res.set('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=' + expireAfter);
}

// only show averages in data for apps to avoid security concerns with app tracking
function hideTotalsFromAppData(data) {
  var metrics = {},
      parts, measure, key, metricsKey, countryKey, jsVal, noJsVal,
      totals = { pages: 0, users: 0 };

  for (var key in data) {
    parts = key.split(':');
    measure = parts[0]; // pages / users
    // ignore date data
    if (measure.match(/^users|pages/)) {
      countryKey = parts[2] ? ':' + parts[2] : '';
      metricsKey = measure + countryKey;
      if (!metrics[metricsKey]) {
        jsVal = Number(data[measure + ':js' + countryKey]) || 0;
        noJsVal = Number(data[measure + ':nojs' + countryKey]) || 0;
        totals[measure] += jsVal + noJsVal;
        metrics[metricsKey] = {
          jsDisabledPct: (noJsVal / (noJsVal + jsVal)) * 100,
          statisticallyGood: (noJsVal + jsVal) > 500 ? true : false
        };
      }
    }
  }

  ['users','pages'].forEach(function(measure) {
    if (totals[measure] < 10000) {
      metrics[measure + ':accuracy'] = 'very few stats - accuracy is poor';
    } else if (totals[measure] < 40000) {
      metrics[measure + ':accuracy'] = 'decent level of stats - accuracy is moderate';
    } else {
      metrics[measure + ':accuracy'] = 'large volume of stats - statistically accurate';
    }
  });

  return metrics;
}

// GET /data OR /data/:app_id
exports.get = function(req, res) {
  var appId = req.params.app_id,
      cacheKey = "global";

  if (appId) {
    // if appID suffixed with another path such as /example, add to appId
    if (req.params[0]) { appId += req.params[0]; }
    cacheKey = "app:" + appId;
  }

  if (dataCache[cacheKey]) {
    setCacheHeader(res);
    res.send(200, dataCache[cacheKey]);
  } else {
    var resultCallback = function(err, response) {
      if (err) {
        res.set('Content-Type', 'text/plain');
        res.send(500, 'Internal Error: Could not retrieve stats: ' + inspect(err));
      } else {
        setCacheHeader(res);
        if (appId) {
          dataCache[cacheKey] = hideTotalsFromAppData(response);
        } else {
          dataCache[cacheKey] = response;
        }
        res.send(200, dataCache[cacheKey]);
        setTimeout(function() { delete dataCache[cacheKey]; }, expireAfter * 1000)
      }
    }

    if (appId) {
      stats.getAppStats(appId, resultCallback);
    } else {
      stats.getGlobalStats(resultCallback);
    }
  }
};