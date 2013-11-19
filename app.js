require('newrelic');

/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    engine = require('ejs-locals'),
    navHelper = require('./middleware/nav-helper').nav;

var routes = require('./routes'),
    track = require('./routes/track'),
    data = require('./routes/data');

var Exceptional = require('exceptional-node').Exceptional;
if (process.env.EXCEPTIONAL_KEY) {
  Exceptional.API_KEY = process.env.EXCEPTIONAL_KEY;
  process.addListener('uncaughtException', function(err) {
    Exceptional.handle(err);
  });
}

var app = express();

// all environments
app.engine('ejs', engine);
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.enable('trust proxy');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('8h2394iuchu9h324298yfs79g283ug487gcs87gw23'));
app.use(express.session());
app.use(navHelper);
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/track-your-site', routes.trackYourSite);
app.get('/faq', routes.faq);
app.get('/about', routes.about);

// retrieve JSON data
app.get('/data', data.get);
app.get('/data/:app_id*', data.get);

// not technically a GET but needed for tracking
app.get('/track/:script/:app_id*', track.impression);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

exports.app = app;