google.load("visualization", "1", { packages:['corechart', 'geomap'] });

$(function() {
  function StatsPresenter() {
    var globalPieChart, geoChart;

    function ready() {
      // unless on the track your site page, show the stats automatically
      if ($('form.track-site').length == 0) {
        loadAndPresentData();
      } else {
        setupTrackYourSite();
      }
    }

    // private methods
    function loadAndPresentData(appId) {
      // clean up the interface whilst loading and show progress var
      clearUI(true);
      $('.progress').show().find('.progress-bar').css('width', '40%').show();

      $.get('/data' + (appId ? '/' + encodeURI(appId) : ''))
        .done(function(data) {
          var startingMeasure = 'users',
              adaptor;
          $('.progress .progress-bar').css('width', '80%');
          if (Object.keys(data).length == 0) {
            $('.alert-danger').hide().text("We cannot display any stats as we've not yet recorded any for the app '" + appId + "'.  Have you added the tracking code correctly?").slideDown();
          } else {
            if (appId) {
              $('h3#app-stats-title').text('Stats for ' + appId);
            }
            $('#stats-container').show();
            if (appId) {
              adaptor = dataAdaptors.byApp;
              scrollIntoView('#stats-container');
            } else {
              adaptor = dataAdaptors.allMetrics;
            }
            configurePagesOrUsersTabs(data, adaptor);
            presentData(data, adaptor, startingMeasure);
          }
        })
        .fail(function() {
          $('.alert-danger').hide().text('Sorry, something has gone wrong.  We could not load the stats data from the server.').slideDown();
        })
        .always(function() {
          $('.progress').hide();
        });
    }

    function configurePagesOrUsersTabs(data, adaptor) {
      $('#stats-container ul#measurement-nav li').on('shown.bs.tab', function() {
        $('.progress .progress-bar').css('width', '40%');
        presentData(data, adaptor, $(this).closest('li').data('measure'));
      });
    }

    function presentData(data, adaptor, measure) {
      var regionalChart;

      data = adaptor(data, measure);
      drawGlobalPieChart(data.global, measure);

      regionalChart = drawRegionalChart(data.regional.data, data.regional.statsComment, measure);
      configureRegionZoom(regionalChart, data.regional.data, data.regional.statsComment, measure);
      drawTable(data.regional.table, measure);
    }

    function clearUI(leaveProgress) {
      $('#stats-container').hide();
      if (!leaveProgress) { $('.progress').hide(); }
      $.each([globalPieChart, geoChart], function (index, chart) {
        if (chart) { chart.clearChart(); }
      });
      $('.alert-danger').hide();
      $('#tracking-code').hide();
      $('#app-id').closest('.form-group').removeClass('has-error').find('.help-block').hide();
    }

    function drawGlobalPieChart(globalData, measure) {
      var chart = new google.visualization.PieChart(document.getElementById(measure + '-piechart'));
      chart.draw(google.visualization.arrayToDataTable(globalData.data), {
        colors: ['#00BB00', '#DD0000'],
        width: 750,
        height: 350
      });
      $('#' + measure).find('h4.piechart').html('Javascript global stats <small>(' + globalData.statsComment + ')</small>');
    }

    function drawRegionalChart(regionalData, statsComment, measure, region) {
      var chart = new google.visualization.GeoChart(document.getElementById(measure + '-geochart')),
          disabledCnt = $.grep(regionalData, function(row) { return (typeof(row[1]) == 'number') && (row[1] != 0); }).length
          chartOptions = {
            colors: disabledCnt == 0 ? ['#00CC00'] : ['#00CC00', '#DD0000'], // if noone has JS disabled, we should not show any red
            width: 750,
            height: 400
          };

      if (region) { chartOptions['region'] = region; }
      chart.draw(google.visualization.arrayToDataTable(regionalData), chartOptions);
      $('#' + measure).find('h4.geochart').html('Javascript country level stats <small>(' + statsComment + ')</small>');
      return chart;
    }

    function configureRegionZoom(chart, data, statsComment, measure) {
      var buttons = $('#' + measure).find('.region-container button');
      buttons
        .off()
        .on('click', function() {
          var region = $(this).data('id'),
              dataTable = $('#' + measure).find('table.country-stats-table'),
              regionalChartData = [];
          $(buttons).removeClass('active');
          $(this).addClass('active');
          dataTable.find('tbody tr').each(function() {
            if (GeoData.countryCodeInRegion(region, $(this).data('country'))) {
              $(this).show();
            } else {
              $(this).hide();
            }
          });
          $.each(data, function(index, countryRow) {
            var countryName;
            if (index == 0) {
              regionalChartData.push(countryRow);
            } else {
              countryCode = GeoData.countryCodeFromName(countryRow[0]);
              if (GeoData.countryCodeInRegion(region, countryCode)) {
                regionalChartData.push(countryRow);
              }
            }
          });
          drawRegionalChart(regionalChartData, statsComment, measure, region);
        });
    }

    function drawTable(tabularData, measure) {
      var dataTable = $('#' + measure).find('table.country-stats-table'),
          tbody = $('<tbody>');

      dataTable.slideUp();

      if (tabularData.length > 0) {
        dataTable.find('tbody').remove();
        for (var i=0; i < tabularData.length; i++) {
          var row = tabularData[i],
              tr = $('<tr data-country="' + row.country + '">')
                .append($('<td data-value="' + row.countryName + '">').text(row.countryName))
                .append($('<td data-value="' + row.enabledPct + '">').html(row.enabledPct + '% <small>' + row.enabledComment + '</small>'))
                .append($('<td data-value="' + row.disabledPct + '">').html(row.disabledPct + '% <small>' + row.disabledComment + '</small>'));
          tbody.append(tr);
        }
        dataTable.append(tbody).slideDown();
        $.bootstrapSortable();
      }
    }

    function setupTrackYourSite() {
      var appId;

      $('#view-stats-button').on('click', function(event) {
        event.preventDefault();
        clearUI();

        if (appId = getAndValidateAppId()) {
          clearUI();
          top.location.hash = appId;
          loadAndPresentData(appId);
        }
      });

      $('#generate-tracking-code').on('click', function(event) {
        event.preventDefault();
        clearUI();

        if (appId = getAndValidateAppId()) {
          clearUI();
          $('#tracking-code h3').text('Tracking code for ' + appId);
          $('#tracking-code pre').text($('#tracking-code pre').text().replace(/{{appId}}/g, encodeURI(appId)));
          $('#tracking-code').slideDown();
        }
      });

      $(window).bind('hashchange', loadFromHash);
      loadFromHash();
    }

    function loadFromHash() {
      // load stats if someone has deep-linked
      if (top.location.hash) {
        $('#app-id').val(top.location.hash.substring(1));
        loadAndPresentData(top.location.hash.substring(1));
      }
    }

    var getAndValidateAppId = function() {
      var $appId = $('#app-id'),
          appId = $appId.val().replace(/\s/, '').replace(/https?\:\/\//, '');

      $appId.val(appId); // replace app ID with value with stripped out characters

      if (appId == '') {
        // shake the input
        $appId
          .animate({ 'margin-left': "-5px" }, 50, function() { $appId.animate({ 'margin-left': "5px" }, 50, function() { $appId.animate({ 'margin-left': "0" }, 50); }); })
          .closest('.form-group').addClass('has-error').removeClass('has-success')
          .closest('.form-group').find('.help-block').hide().text('Please enter a valid app ID in the format yourwebsite.com').slideDown(250);
        return false;
      }
      return appId;
    }

    // utilities

    function scrollIntoView(id) {
      setTimeout(function() {
        $('html, body').animate({
          scrollTop: ($(id).offset().top - $('.nav-space').height()) + 'px'
        }, 'fast');
      }, 10);
    }

    function toPercentage(number, doNotRound) {
      if (doNotRound) {
        return number * 100;
      } else {
        return Math.round(number * 100 * 100) / 100;
      }
    }

    function roundSafe(number) {
      return Math.round(number * 100) / 100;
    }

    // Data adaptors convert raw data into a standard format for presentation in the views
    var dataAdaptors = {
      allMetrics: function(data, measure) {
        var measureDescription = measure == 'users' ? 'Visits' : 'Impressions',
            regionalData = [['Disabled', 'Percentage without Javascript']],
            regionalTable = [],
            countryCalculated = {},
            regionalStatsCount = 0,
            matches, jsEnabled, jsDisabled, country;

        // convert to numerics
        for (var key in data) {
          data[key] = Number(data[key]) || 0;
        }

        // build up regional data
        for (var key in data) {
          if (key.indexOf(measure) == 0) {
            if (matches = key.match(/^(?:users|pages)\:(?:no)?js\:([A-Z0-9]{2})$/)) {
              country = matches[1];
              if (!countryCalculated[country]) {
                countryCalculated[country] = true;
                jsEnabled = data[measure + ':js:' + country] || 0;
                jsDisabled = data[measure + ':nojs:' + country] || 0;
                countryName = GeoData.countryNameFromCode(country);
                regionalData.push([countryName, toPercentage(jsDisabled / (jsEnabled + jsDisabled))]);
                regionalTable.push({
                  country: country,
                  countryName: countryName,
                  disabledComment: '(' + jsDisabled.toLocaleString() + ')',
                  enabledComment: '(' + jsEnabled.toLocaleString() + ')',
                  disabledPct: toPercentage(jsDisabled / (jsEnabled + jsDisabled)),
                  enabledPct: toPercentage(jsEnabled / (jsEnabled + jsDisabled))
                });
                regionalStatsCount += jsEnabled + jsDisabled;
              }
            }
          }
        }

        return {
          global: {
            data: [
              ['Javascript',                                                  measureDescription      ],
              ['Enabled (' + data[measure + ':js'].toLocaleString() + ')',    data[measure + ':js']   ],
              ['Disabled (' + data[measure + ':nojs'].toLocaleString() + ')', data[measure + ':nojs'] ]
            ],
            disabledTotal: data[measure + ':nojs'],
            statsComment: 'sample size ' + (data[measure + ':js'] + data[measure + ':nojs']).toLocaleString()
          },
          regional: {
            data: regionalData,
            table: regionalTable,
            statsComment: 'sample size ' + regionalStatsCount.toLocaleString()
          }
        };
      },
      byApp: function(data, measure) {
        var measureDescription = measure == 'users' ? 'Visits' : 'Impressions',
            regionalData = [['Disabled', 'Percentage without Javascript']],
            regionalTable = [],
            matches, country;

        // round if a number
        for (var key in data) {
          if (data[key].jsDisabledPct) {
            data[key].jsDisabledPct = roundSafe(data[key].jsDisabledPct);
            data[key].jsEnabledPct = roundSafe(100 - data[key].jsDisabledPct);
          } else {
            data[key].jsEnabledPct = 100;
          }
        }

        // build up regional data
        for (var key in data) {
          if (key.indexOf(measure) == 0) {
            if (matches = key.match(/^(?:users|pages)\:([A-Z0-9]{2})$/)) {
              country = matches[1];
              countryName = GeoData.countryNameFromCode(country);
              regionalData.push([countryName, data[key].jsDisabledPct]);
              regionalTable.push({
                country: country,
                countryName: countryName,
                disabledComment: data[key].statisticallyGood ? '' : '(minimal data)',
                enabledComment: data[key].statisticallyGood ? '' : '(minimal data)',
                disabledPct: data[key].jsDisabledPct,
                enabledPct: data[key].jsEnabledPct
              });
            }
          }
        }

        return {
          global: {
            data: [
              ['Javascript',                                      measureDescription          ],
              ['Enabled (' + data[measure].jsEnabledPct + '%)',   data[measure].jsEnabledPct  ],
              ['Disabled (' + data[measure].jsDisabledPct + '%)', data[measure].jsDisabledPct ]
            ],
            disabledTotal: data[measure].jsDisabledPct,
            statsComment: data[measure + ':accuracy']
          },
          regional: {
            data: regionalData,
            table: regionalTable,
            statsComment: data[measure + ':accuracy']
          }
        };
      }
    };

    // public interface
    return {
      googleReady: ready
    }
  }

  // function getData() {
  //   var loadAndDrawChart = function(appId) {
  //     $.get('/data' + (appId ? '/' + encodeURI(appId) : ''))
  //       .done(function(data) {
  //         if (Object.keys(data).length == 0) {
  //           $('.alert-danger').hide().text("We cannot display any stats as we've not yet recorded any for the app '" + appId + "'.  Have you added the tracking code correctly?").slideDown();
  //         } else {
  //           var impressionsShown = false; // we need to show the chart once after the tab is visible else the sizing is wrong

  //           drawChart(data, 'users', 'visits');
  //           $('li.impressions').on('shown.bs.tab', function() {
  //             if (!impressionsShown) {
  //               drawChart(data, 'pages', 'impressions');
  //               impressionsShown = true;
  //             }
  //           });

  //         }
  //       })

  //   }

  //     var trackingCode = $('#tracking-code pre').text(),
  //         appId = $('#app-id');

  //     $('#view-stats-button').on('click', function(event) {
  //       event.preventDefault();
  //       resetUI();

  //       if (validateAppId()) {
  //         appId.closest('.form-group').removeClass('has-error').addClass('has-success');
  //         appId.closest('.form-group').find('.help-block').hide();
  //         appId.val(appIdVal());
  //         top.location.hash = appIdVal();

  //         $('.progress').show();
  //         $('.progress-bar').css('width', '33%');

  //         loadAndDrawChart(appIdVal());
  //       }
  //     });


  //   }
  // }

  var GeoData = (function() {
    var countriesByCodes = {
      '00': "Unknown Country",
      'A1': "Anonymous Proxy",
      'A2': "Satellite Provider",
      'O1': "Other Country",
      'AD': "Andorra",
      'AE': "United Arab Emirates",
      'AF': "Afghanistan",
      'AG': "Antigua and Barbuda",
      'AI': "Anguilla",
      'AL': "Albania",
      'AM': "Armenia",
      'AO': "Angola",
      'AP': "Asia/Pacific Region",
      'AQ': "Antarctica",
      'AR': "Argentina",
      'AS': "American Samoa",
      'AT': "Austria",
      'AU': "Australia",
      'AW': "Aruba",
      'AX': "Aland Islands",
      'AZ': "Azerbaijan",
      'BA': "Bosnia and Herzegovina",
      'BB': "Barbados",
      'BD': "Bangladesh",
      'BE': "Belgium",
      'BF': "Burkina Faso",
      'BG': "Bulgaria",
      'BH': "Bahrain",
      'BI': "Burundi",
      'BJ': "Benin",
      'BL': "Saint Bartelemey",
      'BM': "Bermuda",
      'BN': "Brunei Darussalam",
      'BO': "Bolivia",
      'BQ': "Bonaire:  Saint Eustatius and Saba",
      'BR': "Brazil",
      'BS': "Bahamas",
      'BT': "Bhutan",
      'BV': "Bouvet Island",
      'BW': "Botswana",
      'BY': "Belarus",
      'BZ': "Belize",
      'CA': "Canada",
      'CC': "Cocos (Keeling) Islands",
      'CD': "Congo:  The Democratic Republic of the",
      'CF': "Central African Republic",
      'CG': "Congo",
      'CH': "Switzerland",
      'CI': "Cote d'Ivoire",
      'CK': "Cook Islands",
      'CL': "Chile",
      'CM': "Cameroon",
      'CN': "China",
      'CO': "Colombia",
      'CR': "Costa Rica",
      'CU': "Cuba",
      'CV': "Cape Verde",
      'CW': "Curacao",
      'CX': "Christmas Island",
      'CY': "Cyprus",
      'CZ': "Czech Republic",
      'DE': "Germany",
      'DJ': "Djibouti",
      'DK': "Denmark",
      'DM': "Dominica",
      'DO': "Dominican Republic",
      'DZ': "Algeria",
      'EC': "Ecuador",
      'EE': "Estonia",
      'EG': "Egypt",
      'EH': "Western Sahara",
      'ER': "Eritrea",
      'ES': "Spain",
      'ET': "Ethiopia",
      'EU': "Europe",
      'FI': "Finland",
      'FJ': "Fiji",
      'FK': "Falkland Islands (Malvinas)",
      'FM': "Micronesia:  Federated States of",
      'FO': "Faroe Islands",
      'FR': "France",
      'GA': "Gabon",
      'GB': "United Kingdom",
      'GD': "Grenada",
      'GE': "Georgia",
      'GF': "French Guiana",
      'GG': "Guernsey",
      'GH': "Ghana",
      'GI': "Gibraltar",
      'GL': "Greenland",
      'GM': "Gambia",
      'GN': "Guinea",
      'GP': "Guadeloupe",
      'GQ': "Equatorial Guinea",
      'GR': "Greece",
      'GS': "South Georgia and the South Sandwich Islands",
      'GT': "Guatemala",
      'GU': "Guam",
      'GW': "Guinea-Bissau",
      'GY': "Guyana",
      'HK': "Hong Kong",
      'HM': "Heard Island and McDonald Islands",
      'HN': "Honduras",
      'HR': "Croatia",
      'HT': "Haiti",
      'HU': "Hungary",
      'ID': "Indonesia",
      'IE': "Ireland",
      'IL': "Israel",
      'IM': "Isle of Man",
      'IN': "India",
      'IO': "British Indian Ocean Territory",
      'IQ': "Iraq",
      'IR': "Iran:  Islamic Republic of",
      'IS': "Iceland",
      'IT': "Italy",
      'JE': "Jersey",
      'JM': "Jamaica",
      'JO': "Jordan",
      'JP': "Japan",
      'KE': "Kenya",
      'KG': "Kyrgyzstan",
      'KH': "Cambodia",
      'KI': "Kiribati",
      'KM': "Comoros",
      'KN': "Saint Kitts and Nevis",
      'KP': "Korea:  Democratic People's Republic of",
      'KR': "Korea:  Republic of",
      'KW': "Kuwait",
      'KY': "Cayman Islands",
      'KZ': "Kazakhstan",
      'LA': "Lao People's Democratic Republic",
      'LB': "Lebanon",
      'LC': "Saint Lucia",
      'LI': "Liechtenstein",
      'LK': "Sri Lanka",
      'LR': "Liberia",
      'LS': "Lesotho",
      'LT': "Lithuania",
      'LU': "Luxembourg",
      'LV': "Latvia",
      'LY': "Libyan Arab Jamahiriya",
      'MA': "Morocco",
      'MC': "Monaco",
      'MD': "Moldova:  Republic of",
      'ME': "Montenegro",
      'MF': "Saint Martin",
      'MG': "Madagascar",
      'MH': "Marshall Islands",
      'MK': "Macedonia",
      'ML': "Mali",
      'MM': "Myanmar",
      'MN': "Mongolia",
      'MO': "Macao",
      'MP': "Northern Mariana Islands",
      'MQ': "Martinique",
      'MR': "Mauritania",
      'MS': "Montserrat",
      'MT': "Malta",
      'MU': "Mauritius",
      'MV': "Maldives",
      'MW': "Malawi",
      'MX': "Mexico",
      'MY': "Malaysia",
      'MZ': "Mozambique",
      'NA': "Namibia",
      'NC': "New Caledonia",
      'NE': "Niger",
      'NF': "Norfolk Island",
      'NG': "Nigeria",
      'NI': "Nicaragua",
      'NL': "Netherlands",
      'NO': "Norway",
      'NP': "Nepal",
      'NR': "Nauru",
      'NU': "Niue",
      'NZ': "New Zealand",
      'OM': "Oman",
      'PA': "Panama",
      'PE': "Peru",
      'PF': "French Polynesia",
      'PG': "Papua New Guinea",
      'PH': "Philippines",
      'PK': "Pakistan",
      'PL': "Poland",
      'PM': "Saint Pierre and Miquelon",
      'PN': "Pitcairn",
      'PR': "Puerto Rico",
      'PS': "Palestinian Territory",
      'PT': "Portugal",
      'PW': "Palau",
      'PY': "Paraguay",
      'QA': "Qatar",
      'RE': "Reunion",
      'RO': "Romania",
      'RS': "Serbia",
      'RU': "Russian Federation",
      'RW': "Rwanda",
      'SA': "Saudi Arabia",
      'SB': "Solomon Islands",
      'SC': "Seychelles",
      'SD': "Sudan",
      'SE': "Sweden",
      'SG': "Singapore",
      'SH': "Saint Helena",
      'SI': "Slovenia",
      'SJ': "Svalbard and Jan Mayen",
      'SK': "Slovakia",
      'SL': "Sierra Leone",
      'SM': "San Marino",
      'SN': "Senegal",
      'SO': "Somalia",
      'SR': "Suriname",
      'SS': "South Sudan",
      'ST': "Sao Tome and Principe",
      'SV': "El Salvador",
      'SX': "Sint Maarten",
      'SY': "Syrian Arab Republic",
      'SZ': "Swaziland",
      'TC': "Turks and Caicos Islands",
      'TD': "Chad",
      'TF': "French Southern Territories",
      'TG': "Togo",
      'TH': "Thailand",
      'TJ': "Tajikistan",
      'TK': "Tokelau",
      'TL': "Timor-Leste",
      'TM': "Turkmenistan",
      'TN': "Tunisia",
      'TO': "Tonga",
      'TR': "Turkey",
      'TT': "Trinidad and Tobago",
      'TV': "Tuvalu",
      'TW': "Taiwan",
      'TZ': "Tanzania:  United Republic of",
      'UA': "Ukraine",
      'UG': "Uganda",
      'UM': "United States Minor Outlying Islands",
      'US': "United States",
      'UY': "Uruguay",
      'UZ': "Uzbekistan",
      'VA': "Holy See (Vatican City State)",
      'VC': "Saint Vincent and the Grenadines",
      'VE': "Venezuela",
      'VG': "Virgin Islands:  British",
      'VI': "Virgin Islands:  U.S.",
      'VN': "Vietnam",
      'VU': "Vanuatu",
      'WF': "Wallis and Futuna",
      'WS': "Samoa",
      'YE': "Yemen",
      'YT': "Mayotte",
      'ZA': "South Africa",
      'ZM': "Zambia",
      'ZW': "Zimbabwe"
    };

    var codesByCountry = {};
    for (var code in countriesByCodes) {
      codesByCountry[countriesByCodes[code]] = code;
    }

    var regions = {
      // Europe
      '150':
        'GG,JE,AX,DK,EE,FI,FO,GB,IE,IM,IS,LT,LV,NO,SE,SJ,AT,BE,CH,DE,DD,FR,FX,LI,LU,MC,NL,BG,BY,CZ,HU,MD,PL,RO,RU,SU,SK,UA,AD,AL,BA,ES,GI,GR,HR,IT,ME,MK,MT,CS,RS,PT,SI,SM,VA,YU',
      // Americas
      '019':
        'BM,CA,GL,PM,US,AG,AI,AN,AW,BB,BL,BS,CU,DM,DO,GD,GP,HT,JM,KN,KY,LC,MF,MQ,MS,PR,TC,TT,VC,VG,VI,BZ,CR,GT,HN,MX,NI,PA,SV,AR,BO,BR,CL,CO,EC,FK,GF,GY,PE,PY,SR,UY,VE',
      // Asia
      '142':
        'TM,TJ,KG,KZ,UZ,CN,HK,JP,KP,KR,MN,MO,TW,AF,BD,BT,IN,IR,LK,MV,NP,PK,BN,ID,KH,LA,MM,BU,MY,PH,SG,TH,TL,TP,VN,AE,AM,AZ,BH,CY,GE,IL,IQ,JO,KW,LB,OM,PS,QA,SA,NT,SY,TR,YE,YD',
      // Oceania
      '009':
        'AU,NF,NZ,FJ,NC,PG,SB,VU,FM,GU,KI,MH,MP,NR,PW,AS,CK,NU,PF,PN,TK,TO,TV,WF,WS',
      // Africa
      '002':
        'DZ,EG,EH,LY,MA,SD,TN,BF,BJ,CI,CV,GH,GM,GN,GW,LR,ML,MR,NE,NG,SH,SL,SN,TG,AO,CD,ZR,CF,CG,CM,GA,GQ,ST,TD,BI,DJ,ER,ET,KE,KM,MG,MU,MW,MZ,RE,RW,SC,SO,TZ,UG,YT,ZM,ZW,BW,LS,NA,SZ,ZA'
    };

    var countriesHashInRegion = {};

    for (var region in regions) {
      var countriesInRegionArray = regions[region].split(',');
      countriesHashInRegion[region] = {};
      for (var i = 0; i < countriesInRegionArray.length; i++) {
        countriesHashInRegion[region][countriesInRegionArray[i]] = true;
      }
    }

    return {
      countryNameFromCode: function(countryCode) {
        return countriesByCodes[countryCode] || 'Unknown Country';
      },
      countryCodeFromName: function(countryName) {
        return codesByCountry[countryName] || '00';
      },
      countriesHashInRegion: countriesHashInRegion,
      countryCodeInRegion: function(regionId, countryCode) {
        if (regionId) {
          return countriesHashInRegion[regionId][countryCode] ? true : false;
        } else {
          return true; // if no region ID then always return true i.e. all countries in null
        }
      }
    }
  })();

  var presenter = new StatsPresenter();

  google.setOnLoadCallback(presenter.googleReady);
});