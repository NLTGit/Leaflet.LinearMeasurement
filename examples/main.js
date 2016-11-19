var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

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

var Core = L.Control.LinearMeasurement.extend({
    onSelect: function(e){

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

        } else {
          var layer = e.workspace,
              title = layer.options.title,
              description = layer.options.description,
              dialog = [
                '<div class="dialog">',
                ' <div class="total-popup-content">',
                '  <svg viewbox="0 0 45 35">',
                '   <path class="dialog-close close" d="M 10,10 L 30,30 M 30,10 L 10,30" />',
                '  </svg>',
                ' </div>',
                ' <div class="field-wrapper">',
                '  <span class="label">Title: </span>',
                '  <input type="text" value="'+title+'" />',
                ' </div>',
                ' <div class="field-wrapper">',
                '  <span class="label">Description: </span>',
                '  <textarea type="text">'+description+'</textarea>',
                ' </div>',
                '</div>'
              ].join('');

              //layer.removeLayer(layer.total);

              /*

              layer.totalIcon = L.divIcon({ className: 'total-popup', html: dialog });

              layer.total = L.marker(e.latlng, {
                  icon: layer.totalIcon,
                  clickable: true,
                  total: true,
                  type: 'tmp',
              }).addTo(layer);

              layer.total.on('click', function(e){
                L.DomEvent.stop(e);
              });
              */
        }
    }
});

map.addControl(new Core({
  unitSystem: 'imperial',
  color: '#FF0080',
  type: 'line'
}));
