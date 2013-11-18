exports.nav = function(req, res, next) {
  var navItems = [
    ['/', 'Home'],
    ['/track-your-site','Track your site for free'],
    ['/faq','FAQs'],
    ['/about','About']
  ];
  res.locals.navItems = [];

  navItems.forEach(function(navItem) {
    res.locals.navItems.push({
      url: navItem[0],
      cssClass: req.path == navItem[0] ? 'active' : '',
      title: navItem[1]
    })
  });

  next();
};