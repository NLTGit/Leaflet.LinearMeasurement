<h2>Leaflet Linear Measurement Plugin</h2>

<ul>

  <li>This plugin is a measuring tool that indicates interval marks along the Polyline path</li>

  <li>A tooltip at the end of the last segment indicate the total distance of all segments.</li>

  <li>It is possible to create multiple measure paths.</li>

  <li>Double click event will end a multi line of paths</li>

  <li>The ruler paths can be individually removed from map</li>

</ul>

<h2>Demo</h2>

See the <a href="https://NLTGit.github.io/Leaflet.LinearMeasurement/">demo</a>.

<div style="padding: 20px 20px;">
  <img src="examples/dc.png" />
</div>

<h2>Usage</h2>

<pre>
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
</pre>

<h2>Requirements</h2>

<h2>Author</h2>
Juan Daniel Flores
