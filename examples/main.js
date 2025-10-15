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

        /* cost should be in feet */

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

// Minimal accordion/toggle behavior for the Project Info section
(function initializeProjectInfo() {
  var container = document.getElementById('project-info');
  if (!container) return;

  var cards = container.querySelectorAll('.card');
  Array.prototype.forEach.call(cards, function(card) {
    var headerButton = card.querySelector('.card-header');
    var content = card.querySelector('.card-content');
    if (!headerButton || !content) return;

    headerButton.addEventListener('click', function() {
      var expanded = headerButton.getAttribute('aria-expanded') === 'true';
      headerButton.setAttribute('aria-expanded', (!expanded).toString());
    });
  });

  // Update source count badge based on list length
  var countBadge = container.querySelector('.sources-count');
  var sources = container.querySelectorAll('#info-sources .source-list li');
  if (countBadge) {
    countBadge.textContent = (sources ? sources.length : 0) + ' data sources';
  }
})();
