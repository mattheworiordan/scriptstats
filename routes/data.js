var stats = require('../metrics/stats.js'),
    inspect = require('util').inspect,
    dataCache = {},
    expireAfter = 5;

function setCacheHeader(res) {
  res.set('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=' + expireAfter);
}

// GET /data OR /data/:app_id
exports.get = function(req, res) {
  var appId = req.params.app_id,
      cacheKey = "global";

  if (appId) {
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
        res.send(200, response);
        dataCache[cacheKey] = response;
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