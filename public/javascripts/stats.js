google.load("visualization", "1", { packages:['corechart', 'geomap'] });

$(function() {
  google.setOnLoadCallback(getData);

  function getData() {
    var loadAndDrawChart = function(appId) {
      $.get('/data' + (appId ? '/' + encodeURI(appId) : ''))
        .done(function(data) {
          if (Object.keys(data).length == 0) {
            $('.alert').hide().text("We cannot display any stats as we've not yet recorded any for the app '" + appId + "'.  Have you added the tracking code correctly?").slideDown();
          } else {
            var impressionsShown = false; // we need to show the chart once after the tab is visible else the sizing is wrong
            $('#stats-container').show().find('h3').text('Stats for ' + appId);
            drawChart(data, 'total:users', 'visits');
            $('li.impressions').on('shown.bs.tab', function() {
              if (!impressionsShown) {
                drawChart(data, 'total:pageImpressions', 'impressions');
                impressionsShown = true;
              }
            });
            if (appId) {
              // only scroll into view if user has just requested the stats
              setTimeout(function() {
                $('html, body').animate({
                  scrollTop: ($('#stats-container').offset().top - $('.nav-space').height()) + 'px'
                }, 'fast');
              }, 10);
            }
          }
        })
        .fail(function() {
          $('.alert').hide().text('Sorry, something has gone wrong.  We could not load the stats data from the server.').slideDown();
        })
        .always(function() {
          $('.progress').hide();
        });
    }

    if ($('#stats-container').hasClass('global')) {
      $('.progress-bar').css('width', '66%');
      loadAndDrawChart();
    } else {
      var trackingCode = $('#tracking-code pre').text(),
          appId = $('#app-id');

      var resetUI = function() {
        $('.alert').hide();
        $('#stats-container').hide();
        $('#tracking-code').hide();
        $('.progress').hide();
      };

      var appIdVal = function() {
        return $('#app-id').val().replace(/\s/, '').replace(/https?\:\/\//, '');
      };

      var validateAppId = function() {
        if (appIdVal() == '') {
          appId.animate({ 'margin-left': "-5px" }, 50, function() { appId.animate({ 'margin-left': "5px" }, 50, function() { appId.animate({ 'margin-left': "0" }, 50); }); });
          appId.closest('.form-group').addClass('has-error').removeClass('has-success');
          appId.closest('.form-group').find('.help-block').hide().text('Please enter a valid app ID in the format yourwebsite.com').slideDown(250);
          return false;
        }
        return true;
      }

      $('#view-stats-button').on('click', function(event) {
        event.preventDefault();
        resetUI();

        if (validateAppId()) {
          appId.closest('.form-group').removeClass('has-error').addClass('has-success');
          appId.closest('.form-group').find('.help-block').hide();
          appId.val(appIdVal());
          top.location.hash = appIdVal();

          $('.progress').show();
          $('.progress-bar').css('width', '33%');

          loadAndDrawChart(appIdVal());
        }
      });

      $('#generate-tracking-code').on('click', function(event) {
        event.preventDefault();
        resetUI();

        if (validateAppId()) {
          $('#tracking-code h3').text('Tracking code for ' + appIdVal());
          $('#tracking-code pre').text(trackingCode.replace(/{{appId}}/g, encodeURI(appIdVal())));
          $('#tracking-code').slideDown();
        }
      });

      // load stats if someone has deep-linked
      if (top.location.hash) {
        appId.val(top.location.hash.substring(1));
        $('.progress').show();
        $('.progress-bar').css('width', '33%');
        loadAndDrawChart(appIdVal());
      }
    }
  }

  function drawChart(data, dataSet, chartId) {
    var googleData = google.visualization.arrayToDataTable([
      ['Javascript', chartId == 'visits' ? 'Visitors' : 'Page views'],
      ['Enabled', Number(data[dataSet + ':jsEnabled'])],
      ['Disabled', Number(data[dataSet + ':jsDisabled'])]
    ]);

    var sampleSize = Number(data[dataSet + ':jsDisabled'] || 0) + Number(data[dataSet + ':jsEnabled'] || 0);
    var chart = new google.visualization.PieChart(document.getElementById(chartId + '-piechart'));
    chart.draw(googleData, {
      colors: ['#00BB00', '#DD0000'],
      width: 750,
      height: 350
    });
    $('#' + chartId).find('h4.piechart').html('Javascript global stats <small>(sample size ' + sampleSize.toLocaleString() + ')</small>');

    var geoChartData = [['Disabled', 'Percentage without Javascript']],
        countryData = {},
        country,
        countryName,
        disabledPct;

    sampleSize = 0;

    for (var countryDataSetKey in data) {
      country = countryDataSetKey.substr(-2,2);
      countryName = allCountries[country];
      if ((countryDataSetKey.indexOf(dataSet + ':js') == 0) && countryName) {
        if (!countryData[countryName]) { countryData[countryName] = { enabled: 0, disabled: 0 }; }
        if (countryDataSetKey.indexOf(dataSet + ':jsEnabled') == 0) {
          countryData[countryName].enabled = data[countryDataSetKey];
        } else if (countryDataSetKey.indexOf(dataSet + ':jsDisabled') == 0) {
          countryData[countryName].disabled = data[countryDataSetKey];
        }
      }
    }

    for (var country in countryData) {
      if (countryData[country].enabled && countryData[country].disabled) {
        var disabledPct = countryData[country].disabled / ((countryData[country].disabled || 0) + (countryData[country].enabled || 0));
        geoChartData.push([country, Math.round((disabledPct) * 10000) / 100]);
      } else if (countryData[country].enabled) {
        // no disabled
        geoChartData.push([country, 0]);
      } else if (countryData[country].disabled) {
        // all disabled
        geoChartData.push([country, 100]);
      }
      sampleSize += Number(countryData[country].disabled) + Number(countryData[country].enabled);
    }

    var geoChart = new google.visualization.GeoChart(document.getElementById(chartId + '-geochart'));
    geoChart.draw(google.visualization.arrayToDataTable(geoChartData), {
      colors: ['#00CC00', '#DD0000'],
      width: 750,
      height: 400
    });
    $('#' + chartId).find('h4.geochart').html('Javascript country level stats <small>(sample size ' + sampleSize.toLocaleString() + ')</small>');
  }

  var allCountries = {
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
});