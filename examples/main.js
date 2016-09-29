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

var Ruler = L.Control.LinearMeasurement.extend({
    layerSelected: function(e){

        var data = {
          total_above_ground: numberWithCommas(L.Util.formatNum(cost_above_ground * e.total * 1000, 2)),
          total_underground: numberWithCommas(L.Util.formatNum(cost_underground * e.total * 1000, 2))
        };

        var content = L.Util.template(html, data),
            popup = L.popup().setContent(content);

        e.total_label.bindPopup(popup, { offset: [45, 0] });
        e.total_label.openPopup();

    }
});

map.addControl(new Ruler({
  unitSystem: 'metric',
  color: '#FF0080'
}));
