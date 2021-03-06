var persistence = require('../metrics/persistence.js'),
    countries = require('../lib/countries').countries,
    geoip = require('geoip-lite');

// GET /track/:script/:app_id
exports.impression = function(req, res) {
  var javascriptEnabled,
      appId = req.params.app_id,
      firstVisit = true,
      country = null;

  res.set("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.set("Pragma", "no-cache"); // HTTP 1.0.
  res.set("Expires", 0); // Proxies.

  // if appID suffixed with another path such as /example, add to appId
  if (req.params[0]) { appId += req.params[0]; }

  switch (req.params.script) {
    case 'js':
      javascriptEnabled = true;
      break;
    case 'no-js':
      javascriptEnabled = false;
      break;
    default:
      res.set('Content-Type', 'text/plain');
      res.send(400, 'Invalid URL - expected js/no-js after /track/');
      return;
  };

  if (!req.params.app_id) {
    res.set('Content-Type', 'text/plain');
    res.send(400, 'Invalid URL - expected application ID after /track/' + req.params.script + '/');
    return;
  }

  var persistAndRespond = function() {
    persistence.save(appId, javascriptEnabled, firstVisit, country);
    res.set('Content-Type', 'image/gif');
    res.sendfile('public/images/blank.gif');
  };

  if (req.session.subsequentVisit) {
    firstVisit = false;
    if (countries[req.session.country]) {
      country = req.session.country;
    }
    persistAndRespond();
  } else {
    req.session.subsequentVisit = true;
    var geo = geoip.lookup(req.ip);
    if (geo && countries[geo.country]) {
      country = geo.country;
    } else {
      country = '00'; // special unknown country we can measure traffic against
    }

    req.session.country = country; // prevent further GeoIP lookups for this session

    // allow country to be injected for CURL tests
    if (req.query.country)
      if (process.env.NODE_ENV != 'production') {
        if ( (req.host == 'localhost') || (req.host == '127.0.0.1') ) {
        {
          country = req.query.country;
          req.session.param = country;
          console.warn('Warn: Country for debugging assigned as ' + country);
        }
      }
    }
    persistAndRespond();
  }
};