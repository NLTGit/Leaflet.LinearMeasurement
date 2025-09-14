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

// Add a custom top-left control group container and move controls there
var controlContainer = L.control({ position: 'topleft' });
controlContainer.onAdd = function() {
  var div = L.DomUtil.create('div', 'leaflet-bar');
  return div;
};
controlContainer.addTo(map);

// Re-add default zoom control in top-left inside group
L.control.zoom({ position: 'topleft' }).addTo(map);

// Layer control
var baseLayers = {
    "OSM Standard": osmStandard,
    "OSM HOT": osmHOT,
    "USGS Imagery (Aerial)": usgsImagery,
    "Sentinel-2 Cloudless (Satellite)": s2cloudless
};

// Create a simple horizontal toolbar (top-right) with pan, measure, and basemap select
var toolbar = L.control({ position: 'topright' });
toolbar.onAdd = function() {
  var div = L.DomUtil.create('div', 'map-toolbar leaflet-control');
  // Pan button
  var panBtn = L.DomUtil.create('button', 'map-btn active', div);
  panBtn.type = 'button';
  panBtn.innerHTML = 'Pan';
  // Measure button
  var measureBtn = L.DomUtil.create('button', 'map-btn', div);
  measureBtn.type = 'button';
  measureBtn.innerHTML = 'Measure';
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
  L.DomEvent.on(panBtn, 'click', function(){
    panBtn.classList.add('active');
    measureBtn.classList.remove('active');
    map.dragging.enable();
    // Turn off ruler if active
    if (toolbar._rulerActive) {
      map.fire('linear_feature_on'); // toggle off via control click simulation
      toolbar._rulerActive = false;
    }
  });
  L.DomEvent.on(measureBtn, 'click', function(){
    measureBtn.classList.add('active');
    panBtn.classList.remove('active');
    map.dragging.disable();
    map.fire('linear_feature_on');
    toolbar._rulerActive = true;
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

var Core = L.Control.LinearCore.extend({
    onSelect: function(e){

        if(!e.total){
          return;
        }

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

        if(e.rulerOn){
            var content = L.Util.template(html, data),
                popup = L.popup().setContent(content);

            e.total_label.bindPopup(popup, { offset: [45, 0] });
            e.total_label.openPopup();
        }
    }
});

map.addControl(new Core({
  unitSystem: 'imperial',
  color: '#048abf',
  features: ['ruler']
}));

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
