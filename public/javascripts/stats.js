google.load("visualization", "1", { packages:["corechart"] });

$(function() {
  google.setOnLoadCallback(getData);

  function getData() {
    var loadAndDrawChart = function(appId) {
      $.get('/data' + (appId ? '/' + encodeURI(appId) : ''))
        .done(function(data) {
          console.log(data);
          if (Object.keys(data).length == 0) {
            $('.alert').hide().text("We cannot display any stats as we've not yet recorded any for the app '" + appId + "'.  Have you added the tracking code correctly?").slideDown();
            $('#stats-container').hide();
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
            setTimeout(function() {
              $('html, body').animate({
                scrollTop: ($('#stats-container').offset().top - $('.nav-space').height()) + 'px'
              }, 'fast');
            }, 10);
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
      $('#view-stats-button').on('click', function(event) {
        event.preventDefault();
        var appId = $('#app-id'),
            val = appId.val().replace(/\s/, '').replace(/https?\:\/\//, '');
        if (val == '') {
          appId.animate({ 'margin-left': "-5px" }, 50, function() { appId.animate({ 'margin-left': "5px" }, 50, function() { appId.animate({ 'margin-left': "0" }, 50); }); });
          appId.closest('.form-group').addClass('has-error').removeClass('has-success');
          appId.closest('.form-group').find('.help-block').hide().text('Please enter a valid app ID in the format yourwebsite.com').slideDown(250);
        } else {
          appId.closest('.form-group').removeClass('has-error').addClass('has-success');
          appId.closest('.form-group').find('.help-block').hide();
          appId.val(val);

          $('.progress').show();
          $('.progress-bar').css('width', '33%');
          $('#stats-container').show();
          $('.alert').hide();

          loadAndDrawChart(val);
        }
      });
    }
  }

  function drawChart(data, dataSet, chartId) {
    var googleData = google.visualization.arrayToDataTable([
      ['Javascript', 'Users'],
      ['Enabled', Number(data[dataSet + ':jsEnabled'])],
      ['Disabled', Number(data[dataSet + ':jsDisabled'])]
    ]);

    var sampleSize = Number(data[dataSet + ':jsDisabled']) + Number(data[dataSet + ':jsEnabled']);
    var options = {
      title: 'Javascript Stats from a sample size of ' + sampleSize.toLocaleString(),
      is3D: true
    };

    var chart = new google.visualization.PieChart(document.getElementById(chartId, '-piechart'));
    chart.draw(googleData, options);
  }
});