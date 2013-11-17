var persistence = require('../metrics/persistence.js');

// GET /track/:script/:app_id
exports.impression = function(req, res) {
  var javascriptEnabled,
      appId = req.params.app_id,
      firstVisit = true;

  res.set("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.set("Pragma", "no-cache"); // HTTP 1.0.
  res.set("Expires", 0); // Proxies.

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
  }

  if (!req.params.app_id) {
    res.set('Content-Type', 'text/plain');
    res.send(400, 'Invalid URL - expected application ID after /track/' + req.params.script + '/');
    return;
  }

  if (req.session.subsequentVisit) {
    firstVisit = false;
  } else {
    req.session.subsequentVisit = true;
  }

  persistence.save(appId, javascriptEnabled, firstVisit);
  res.set('Content-Type', 'image/gif');
  res.sendfile('public/images/blank.gif');
};