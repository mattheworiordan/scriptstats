
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index');
};

exports.trackYourSite = function(req, res){
  res.render('track-your-site');
};

exports.faq = function(req, res){
  res.render('faq');
};

exports.about = function(req, res){
  res.render('about');
};