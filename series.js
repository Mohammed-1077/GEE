
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}



function rgbToHex(rgb) {
  return "#" +
  componentToHex(rgb[0]) +
  componentToHex(rgb[1]) +
  componentToHex(rgb[2]);
}


function scaleToByte(val, min, max) {
  val = ee.Number(val).clamp(min, max);
  return ee.Number.expression({
    expression: 'round((val - min) / (max - min) * 255)',
    vars: {
      val: val,
      min: min,
      max: max
    } 
  });
}


function rgbTimeSeriesChart(
  col, aoi, yAxisBand, visParams, plotHere, optionalParams) {
  // Since using evaluate, indicate that things are working.
  var message = '⚙️ Processing, please wait.';
  if(plotHere != 'console') {
    plotHere.clear();
    plotHere.add(ui.Label(message));
  } else {
    print(message);
  }
  
  // Define default filter parameters.
  var proj = col.first().projection();
  var _params = {
    reducer: ee.Reducer.first(),
    crs: proj.crs(),
    scale: proj.nominalScale(),
    chartParams: {
      pointSize: 10,
      legend: {position: 'none'},
      hAxis: {title: 'Date', titleTextStyle: {italic: false, bold: true}},
      vAxis: {title: yAxisBand, titleTextStyle: {italic: false, bold: true}},
      interpolateNulls: true
    }
  };

  // Replace default params with provided params.
  if (optionalParams) {
    for (var param in optionalParams) {
      _params[param] = optionalParams[param] || _params[param];
    }
  }
  
  // Perform reduction.
  var fc = col.map(function(img) {
    var reduction = img.reduceRegion({
      reducer: _params.reducer,
      geometry: aoi,
      scale: _params.scale,
      crs: _params.crs,
      bestEffort: true,
      maxPixels: 1e13,
    });

    return ee.Feature(null, reduction).set({
      'system:time_start': img.get('system:time_start'),
      label: ee.String(yAxisBand+' ').cat(img.date().format('YYYY-MM-dd'))
    });
  })
  .filter(ee.Filter.notNull(col.first().bandNames()));
  
  // Add 3-band RGB color as a feature property.
  var fcRgb = fc.map(function(ft) {
    var rgb = ee.List([
      scaleToByte(ft.get(visParams.bands[0]), visParams.min[0], visParams.max[0]),
      scaleToByte(ft.get(visParams.bands[1]), visParams.min[1], visParams.max[1]),
      scaleToByte(ft.get(visParams.bands[2]), visParams.min[2], visParams.max[2])
    ]);
    return ft.set({rgb: rgb});
  });

  // Filter out observations with no data.
  fcRgb = fcRgb.filter(ee.Filter.notNull(fcRgb.first().propertyNames()));
  
  // Get the list of RGB colors.
  var rgbColors = fcRgb.aggregate_array('rgb');
  
  // Make a chart.
  rgbColors.evaluate(function(rgbColors) {
    var rgbList = [];
    for(var i=0; i<rgbColors.length; i++) {
      rgbList.push(rgbToHex(rgbColors[i]));
    }

    _params.chartParams['colors'] = rgbList;
    
    var chart = ui.Chart.feature.groups(
      fcRgb, 'system:time_start', yAxisBand, 'label')
      .setChartType('ScatterChart')
      .setOptions(_params.chartParams);
    
    if(plotHere != 'console'){
      plotHere.clear();
      plotHere.add(chart);
    } else {
      print(chart);
    }
  });
}
exports.rgbTimeSeriesChart = rgbTimeSeriesChart;

// Example points
var geometry1 = ee.Geometry.Point([-122.167503, 44.516868]).buffer(45);  // forest harvest
var geometry2 = ee.Geometry.Point([-122.201595, 44.511052]).buffer(45);  // cool stream bank
