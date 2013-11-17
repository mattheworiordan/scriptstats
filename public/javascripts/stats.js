google.load("visualization", "1", { packages:["corechart"] });
$(function() {
  google.setOnLoadCallback(getData);

  function getData() {
    $('.progress-bar').css('width', '50%');
    $.get('/data')
      .done(function(data) {
        var impressionsShown = false; // we need to show the chart once after the tab is visible else the sizing is wrong
        drawChart(data, 'total:users', 'visits');
        $('li.impressions').on('shown.bs.tab', function() {
          if (!impressionsShown) {
            drawChart(data, 'total:pageImpressions', 'impressions');
            impressionsShown = true;
          }
        });
      })
      .fail(function() {
        $('.alert').show();
      })
      .always(function() {
        $('.progress').hide();
      })
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