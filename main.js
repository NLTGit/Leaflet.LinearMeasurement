var map = L.map('map', {
  zoomControl: false
}).setView([38.9072, -77.0369], 10);

// Base layers
var osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Open imagery providers
var usgsImagery = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagery: USGS The National Map'
});

var s2cloudless = L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg', {
    attribution: 'Imagery: Sentinel-2 cloudless by EOX IT Services GmbH'
});

// DC GIS ArcGIS MapServer tiles (Web Mercator)
var dcBasemap = L.tileLayer('https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/DC_Basemap_WebMercator/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Basemap: DC GIS'
});

var dcAerial = L.tileLayer('https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/DC_Aerial_Photo_WebMercator/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Aerial: DC GIS'
});

// Add default layer
osmStandard.addTo(map);

// (Default zoom/layers controls replaced by custom toolbar below)

// Layer control
var baseLayers = {
    "OSM Standard": osmStandard,
    "OSM HOT": osmHOT,
    "USGS Imagery (Aerial)": usgsImagery,
    "Sentinel-2 Cloudless (Satellite)": s2cloudless
};

// Create a simple horizontal toolbar (top-right) with zoom, pan, measure, clear, and basemap select
var toolbar = L.control({ position: 'topright' });
toolbar.onAdd = function() {
  var div = L.DomUtil.create('div', 'map-toolbar leaflet-control');
  // Zoom in
  var zoomInBtn = L.DomUtil.create('button', 'map-btn', div);
  zoomInBtn.type = 'button';
  zoomInBtn.innerHTML = '+';
  // Zoom out
  var zoomOutBtn = L.DomUtil.create('button', 'map-btn', div);
  zoomOutBtn.type = 'button';
  zoomOutBtn.innerHTML = '−';
  // Pan button
  var panBtn = L.DomUtil.create('button', 'map-btn active', div);
  panBtn.type = 'button';
  panBtn.innerHTML = 'Pan';
  // Measure button
  var measureBtn = L.DomUtil.create('button', 'map-btn', div);
  measureBtn.type = 'button';
  measureBtn.innerHTML = 'Measure';
  // Clear measurements button
  var clearBtn = L.DomUtil.create('button', 'map-btn', div);
  clearBtn.type = 'button';
  clearBtn.innerHTML = 'Clear';
  // Print report button (replaces former Finish)
  var printBtn = L.DomUtil.create('button', 'map-btn', div);
  printBtn.type = 'button';
  printBtn.innerHTML = 'Print';
  // Finish button
  var finishBtn = L.DomUtil.create('button', 'map-btn', div);
  finishBtn.type = 'button';
  finishBtn.innerHTML = 'Finish';
  // Basemap select
  var select = L.DomUtil.create('select', '', div);
  var options = [
    { label: 'OSM Standard', value: 'standard' },
    { label: 'OSM HOT', value: 'hot' },
    { label: 'USGS Imagery', value: 'usgs' },
    { label: 'Sentinel-2 Cloudless', value: 's2' },
    { label: 'DC Basemap (Web Mercator)', value: 'dcbase' },
    { label: 'DC Aerial Photo (Web Mercator)', value: 'dcaerial' }
  ];
  options.forEach(function(opt){
    var o = document.createElement('option');
    o.value = opt.value; o.text = opt.label; select.appendChild(o);
  });

  // Stop map drag when interacting with toolbar
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);

  // Button handlers
  L.DomEvent.on(zoomInBtn, 'click', function(){ map.zoomIn(); });
  L.DomEvent.on(zoomOutBtn, 'click', function(){ map.zoomOut(); });
  L.DomEvent.on(panBtn, 'click', function(){
    panBtn.classList.add('active');
    measureBtn.classList.remove('active');
    map.dragging.enable();
    // Turn off measurement if active
    if (toolbar._rulerActive && measureCtrl && measureCtrl.stop) {
      try { measureCtrl.stop(); } catch(e){}
      toolbar._rulerActive = false;
    }
  });
  L.DomEvent.on(measureBtn, 'click', function(){
    measureBtn.classList.add('active');
    panBtn.classList.remove('active');
    map.dragging.disable();
    if (measureCtrl && measureCtrl.start) { measureCtrl.start(); }
    toolbar._rulerActive = true;
  });
  L.DomEvent.on(clearBtn, 'click', function(){
    try {
      if (measureCtrl && measureCtrl.clear) { measureCtrl.clear(); }
    } catch (e) { /* no-op */ }
  });
  L.DomEvent.on(printBtn, 'click', function(){
    try {
      if (!measureCtrl || !measureCtrl.latlngsList || !measureCtrl.latlngsList.length) return;
      var segments = measureCtrl.latlngsList;
      var fmt = function(n){ return (Math.round(n * 100) / 100).toLocaleString(); };
      var totalMeters = 0, totalAbove = 0, totalUnder = 0; var lines = [];
      var minLat=90, maxLat=-90, minLng=180, maxLng=-180; var coords=[];
      for (var i=0;i<segments.length;i++){
        var a=segments[i][0], b=segments[i][1];
        var meters = a.distanceTo(b);
        var cA = meters * (measureCtrl.options.costAboveGround || 0);
        var cU = meters * (measureCtrl.options.costUnderground || 0);
        totalMeters += meters; totalAbove += cA; totalUnder += cU;
        lines.push('<li>Segment '+(i+1)+': '+fmt(meters)+' m — Above: $'+fmt(cA)+' | Underground: $'+fmt(cU)+'</li>');
        coords.push([a.lat,a.lng]); coords.push([b.lat,b.lng]);
        [a,b].forEach(function(ll){ if(ll.lat<minLat)minLat=ll.lat; if(ll.lat>maxLat)maxLat=ll.lat; if(ll.lng<minLng)minLng=ll.lng; if(ll.lng>maxLng)maxLng=ll.lng; });
      }
      var w = window.open('', '_blank');
      var branding = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">'+
        '<img src="https://newlighttechnologies.com/hubfs/nlt-square.png" alt="NLT" style="height:36px;"/>'+
        '<div><div style="font-size:18px;font-weight:600;">Measurement Report (Demo)</div>'+
        '<div style="color:#666;font-size:12px;">This is for demo purposes only and not an actual cost analysis worksheet for your project. '+
        'Contact us at <a href="https://newlighttechnologies.com" target="_blank">NewLightTechnologies.com</a> or see '+
        '<a href="https://newlighttechnologies.com/solutions#analytics-insights" target="_blank">UtilityLine capabilities</a>.</div></div></div>';
      var doc = [
        '<!doctype html><html><head><meta charset="utf-8"/>',
        '<title>Measurement Report</title>',
        '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
        '<style>body{font-family:Arial,Helvetica,sans-serif;padding:16px;} #map{height:420px;margin:10px 0;border:1px solid #ddd;border-radius:6px;} .card{border:1px solid #ddd;border-radius:6px;padding:10px;} .muted{color:#666}</style>',
        '</head><body>',branding,
        '<div class="muted">Total Length: '+fmt(totalMeters)+' m — Above: $'+fmt(totalAbove)+' — Underground: $'+fmt(totalUnder)+'</div>',
        '<div id="map"></div>',
        '<div class="card"><strong>Segments</strong><ul>'+lines.join('')+'</ul></div>',
        '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
        '<script>(function(){\n var map=L.map("map").setView(['+((minLat+maxLat)/2).toFixed(6)+','+((minLng+maxLng)/2).toFixed(6)+'], 12);\n'+
        'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);\n var latlngs='+JSON.stringify(coords)+';\n'+
        'var poly=L.polyline(latlngs,{color:"#048abf"}).addTo(map);\n map.fitBounds(poly.getBounds(),{padding:[20,20]});\n setTimeout(function(){window.print();},600);\n})();</script>',
        '</body></html>'
      ].join('');
      w.document.open(); w.document.write(doc); w.document.close();
    } catch(e){}
  });
  L.DomEvent.on(finishBtn, 'click', function(){
    try { if (!measureCtrl) return; measureCtrl.finish(); } catch(e){}
  });

  // Basemap switching
  var currentBase = osmStandard;
  select.value = 'standard';
  L.DomEvent.on(select, 'change', function(){
    map.removeLayer(currentBase);
    if (select.value === 'hot') currentBase = osmHOT;
    else if (select.value === 'usgs') currentBase = usgsImagery;
    else if (select.value === 's2') currentBase = s2cloudless;
    else if (select.value === 'dcbase') currentBase = dcBasemap;
    else if (select.value === 'dcaerial') currentBase = dcAerial;
    else currentBase = osmStandard;
    currentBase.addTo(map);
  });

  return div;
};
toolbar.addTo(map);

var cost_underground = 12.55,
    cost_above_ground = 17.89,
    html = [
        '<table>',
        ' <tr><td class="cost_label">Cost Above Ground:</td><td class="cost_value">${total_above_ground}</td></tr>',
        ' <tr><td class="cost_label">Cost Underground:</td><td class="cost_value">${total_underground}</td></tr>',
        '</table>'
    ].join(''),
    numberWithCommas = function(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

// Extend the measurement control to hook into completion and show costs
var measureCtrl = new L.Control.LinearMeasurement({
  unitSystem: 'imperial',
  color: '#048abf',
  costAboveGround: cost_above_ground,
  costUnderground: cost_underground
});
map.addControl(measureCtrl);
// Hide the default control button; we use our own toolbar
if (measureCtrl && measureCtrl._container) {
  try { measureCtrl._container.style.display = 'none'; } catch(e) {}
}

// Open the measurement control by default (highlighted via CSS .icon-active)
setTimeout(function(){
  map.fire('linear_feature_on');
}, 0);

// Fit map to approximate DC beltway bounds
var beltwayBounds = L.latLngBounds(
  [39.05, -77.35], // NW of beltway
  [38.70, -76.75]  // SE of beltway
);
map.fitBounds(beltwayBounds, { padding: [10, 10] });
