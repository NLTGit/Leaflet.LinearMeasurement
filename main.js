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
  // Basemap select
  var select = L.DomUtil.create('select', '', div);
  var options = [
    { label: 'OSM Standard', value: 'standard' },
    { label: 'OSM HOT', value: 'hot' },
    { label: 'USGS Imagery', value: 'usgs' },
    { label: 'Sentinel-2 Cloudless', value: 's2' }
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

  // Basemap switching
  var currentBase = osmStandard;
  select.value = 'standard';
  L.DomEvent.on(select, 'change', function(){
    map.removeLayer(currentBase);
    if (select.value === 'hot') currentBase = osmHOT;
    else if (select.value === 'usgs') currentBase = usgsImagery;
    else if (select.value === 's2') currentBase = s2cloudless;
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
var Measurement = L.Control.LinearMeasurement.extend({
  layerSelected: function(e){
    if(!e || !e.total) return;
    var distance = e.total.scalar;
    if(e.total.unit === 'mi'){
      distance *= e.sub_unit;
    } else if(e.total.unit === 'km'){
      distance *= 3280.84;
    } else if(e.total.unit === 'm'){
      distance *= 3.28084;
    }
    var data = {
      total_above_ground: numberWithCommas(L.Util.formatNum(cost_above_ground * distance, 2)),
      total_underground: numberWithCommas(L.Util.formatNum(cost_underground * distance, 2))
    };
    // Show popup here (this event only fires on finish/dblclick)
    var content = L.Util.template(html, data), popup = L.popup().setContent(content);
    if (e.total_label && e.total_label.bindPopup) {
      e.total_label.bindPopup(popup, { offset: [45, 0] });
      e.total_label.openPopup();
    }
  }
});

var measureCtrl = new Measurement({
  unitSystem: 'imperial',
  color: '#048abf'
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
