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

// Basemap control in top-left
L.control.layers(baseLayers, null, { collapsed: true, position: 'topleft' }).addTo(map);

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
