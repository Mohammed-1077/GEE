// pt= β0+ β1 t + c

var addVariables = function(image) {
    var date = ee.Date(image.get(timeField));// compute the date ...if date field is not stored in the system column #time_properties#
    var years = date.difference(ee.Date('1970-01-01'), 'year'); // compute the time in years 
    return image
    .addBands(image.normalizedDifference(['B5', 'B4']).rename('NDVI')).float() // add NDVI to the image (dependent variable)
    .addBands(ee.Image(years).rename('t').float())//independent var
    .addBands(ee.Image.constant(1));// adding const to every pixel = adding 1 to the design matrix (independent var)
   
};



var independents = ee.List(['constant', 't']);

var dependent = ee.String('NDVI');

//learRegression function takes: no.ind var + no.dep var
var trend = filteredLandsat.select(independents.add(dependent)) 
.reduce(ee.Reducer.linearRegression(independents.length(), 1));//learRegression function expects the bands to be in specific order: independent var the dep var 
var coefficients = trend.select('coefficients')
.arrayProject([0])
.arrayFlatten([independents]);
      