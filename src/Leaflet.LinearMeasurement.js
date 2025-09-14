(function(){

  L.Control.LinearMeasurement = L.Control.extend({

      options: {
          position: 'topleft',
          unitSystem: 'imperial', // imperial | metric
          color: '#4D90FE',
          contrastingColor: '#fff',
          show_last_node: false,
          show_azimut: false,
          pane: undefined,
          costAboveGround: 0,
          costUnderground: 0
      },

      clickSpeed: 200,

      onAdd: function (map) {
          var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
              link = L.DomUtil.create('a', 'icon-ruler', container),
              map_container = map.getContainer(),
              me = this;

          link.href = '#';
          link.title = 'Toggle measurement tool';

          L.DomEvent.on(link, 'click', L.DomEvent.stop).on(link, 'click', function(){
              if(L.DomUtil.hasClass(link, 'icon-active')){
                  me.resetRuler(!!me.mainLayer);
                  L.DomUtil.removeClass(link, 'icon-active');
                  L.DomUtil.removeClass(map_container, 'ruler-map');

              } else {
                  me.initRuler();
                  L.DomUtil.addClass(link, 'icon-active');
                  L.DomUtil.addClass(map_container, 'ruler-map');
              }
          });

          function contrastingColor(color){
              return (luma(color) >= 165) ? '000' : 'fff';
          }

          function luma(color){
              var rgb = (typeof color === 'string') ? hexToRGBArray(color) : color;
              return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]); // SMPTE C, Rec. 709 weightings
          }

          function hexToRGBArray(color){
              if (color.length === 3)
                  color = color.charAt(0) + color.charAt(0) + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2);
              else if (color.length !== 6)
                  throw('Invalid hex color: ' + color);
              var rgb = [];
              for (var i = 0; i <= 2; i++)
                  rgb[i] = parseInt(color.substr(i * 2, 2), 16);
              return rgb;
          }

          if(this.options.color && this.options.color.indexOf('#') === -1){
              this.options.color = '#' + this.options.color;
          } else if(!this.options.color){
              this.options.color = '#4D90FE';
          }

          var originalColor = this.options.color.replace('#', '');

          this.options.contrastingColor = '#'+contrastingColor(originalColor);

          return container;
      },

      onRemove: function(map){
          this.resetRuler(!!this.mainLayer);
      },

      initRuler: function(){
          var me = this,
              map = this._map;

          this.mainLayer = L.featureGroup();
          this.mainLayer.addTo(this._map);

          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();

          if(map.tap) {
              map.tap.disable();
          }

          this.dblClickEventFn = function(e){ L.DomEvent.stop(e); };
          map.on('dblclick', this.finish, this);

          this.keyDownFn = function(e) {
            // ctrl-x cancel measurement
            if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && e.originalEvent.key.toLowerCase() === 'x') {
                if (this.layer) {
                    //console.log('esc pressed!')                
                    this.layer.off('click');
                    this.layer.off('keydown');          
                    this.mainLayer.removeLayer(this.layer);
                    L.DomEvent.stop(e);
                    this.resetRuler(false);
                }
            }            
          }

          this.clickEventFn = function(e){
            me.preClick(e);
            me.getMouseClickHandler(e);
          };
        
          this.moveEventFn = function(e){
            if(!me.clickHandle){
              me.getMouseMoveHandler(e);
            }
          };
          map.on('click', this.clickEventFn, this);
          map.on('mousemove', this.moveEventFn, this);
          map.on('keydown', this.keyDownFn, this);
          this.resetRuler();
      },

      initLayer: function(){
          this.layer = L.featureGroup();
          this.layer.addTo(this.mainLayer);
          this.layer.on('selected', this.layerSelected);
          this.layer.on('click', this.clickEventFn, this);
      },

      resetRuler: function(resetLayer){
          var map = this._map;

          if(resetLayer){
              map.off('click', this.clickEventFn, this);
              map.off('mousemove', this.moveEventFn, this);
              map.off('dblclick', this.finish, this);

              if(this.mainLayer){
                  this._map.removeLayer(this.mainLayer);
              }

              this.mainLayer = null;

              this._map.touchZoom.enable();
              this._map.boxZoom.enable();
              this._map.keyboard.enable();

              if(this._map.tap) {
                  this._map.tap.enable();
              }
          }

          this.layer = null;
          this.prevLatlng = null;
          this.poly = null;
          this.multi = null;
          this.latlngs = null;
          this.latlngsList = [];
          this.sum = 0;
          this.distance = 0;
          this.separation = 1;
          this.last = 0;
          this.fixedLast = 0;
          this.totalIcon = null;
          this.total = null;
          this.lastCircle = null;

          /* Leaflet return distances in meters */
          this.UNIT_CONV = 1000;
          this.SUB_UNIT_CONV = 1000;
          this.UNIT = 'km';
          this.SUB_UNIT = 'm';

          if(this.options.unitSystem === 'imperial'){
              this.UNIT_CONV = 1609.344;
              this.SUB_UNIT_CONV = 5280;
              this.UNIT = 'mi';
              this.SUB_UNIT = 'ft';
          }

          this.measure = {
              scalar: 0,
              unit: this.SUB_UNIT
          };
      },

      cleanUpMarkers: function(fixed){
          var layer = this.layer;

          if(layer){
              layer.eachLayer(function(l){
                  if(l.options && l.options.type === 'tmp'){
                      if(fixed){
                          l.options.type = 'fixed';
                      } else {
                          layer.removeLayer(l);
                      }
                  }
              });
          }
      },

      cleanUpFixed: function(){
          var layer = this.layer;

          if(layer) {
              layer.eachLayer(function(l){
                  if(l.options && (l.options.type === 'fixed')){
                      layer.removeLayer(l);
                  }
              });
          }
      },

      convertDots: function(){
          var me = this,
              layer = this.layer;

          if(layer) {
              layer.eachLayer(function(l){
                  if(l.options && (l.options.type === 'dot')){

                      var m = l.options.marker,
                          i = m ? m.options.icon.options : null,
                          il = i ? i.html : '';

                      if(il && il.indexOf(me.measure.unit) === -1){
                          var str = l.options.label,
                              s = str.split(' '),
                              e = parseFloat(s[0]),
                              u = s[1],
                              label = '';

                          if(l.options.label.indexOf(me.measure.unit) !== -1){
                              label = l.options.label;

                          } else if(u === me.UNIT){
                              label = (e * me.SUB_UNIT_CONV).toFixed(2) + ' ' + me.SUB_UNIT;

                          } else if(u === me.SUB_UNIT){
                              label = (e / me.SUB_UNIT_CONV).toFixed(2) + ' ' + me.UNIT;
                          }

                          var cicon = L.divIcon({
                              className: 'total-popup-label',
                              html: label
                          });

                          m.setIcon(cicon);
                      }
                  }
              });
          }
      },

      displayMarkers: function(latlngs, multi, sum) {
          var x, y, label, ratio, p,
              latlng = latlngs[latlngs.length-1],
              prevLatlng = latlngs[0],
              original = prevLatlng.distanceTo(latlng)/this.UNIT_CONV,
              dis = original;

          var p2 = this._map.latLngToContainerPoint(latlng),
              p1 = this._map.latLngToContainerPoint(prevLatlng),
              unit = 1;

          if(this.measure.unit === this.SUB_UNIT){
              unit = this.SUB_UNIT_CONV;
              dis = dis * unit;
          }

          var t = (sum * unit) + dis,
              qu = sum * unit;

          for(var q = Math.floor(qu); q < t; q++){
              ratio = (t-q) / dis;

              if(q % this.separation || q < qu) {
                  continue;
              }

              x = (p2.x - ratio * (p2.x - p1.x));
              y = (p2.y - ratio * (p2.y - p1.y));

              p = L.point(x, y);

              /* render a circle spaced by separation */

              latlng = this._map.containerPointToLatLng(p);

              label = (q + ' ' + this.measure.unit);

              this.renderCircle(latlng, 0, this.layer, multi ? 'fixed' : 'tmp', label);

              this.last = t;
          }

          // Add a small label at the segment midpoint with length and costs
          try {
            var midx = (p2.x + p1.x) / 2, midy = (p2.y + p1.y) / 2;
            var midLatLng = this._map.containerPointToLatLng(L.point(midx, midy));
            // original here is in km (metric) or mi (imperial); convert to meters unified
            var meters;
            if (this.UNIT === 'mi') {
              meters = original * 1609.344; // miles -> meters
            } else {
              meters = original * 1000; // km -> meters
            }
            var costA = (this.options.costAboveGround || 0) * meters;
            var costU = (this.options.costUnderground || 0) * meters;
            var segHtml = '<span class="seg-label">'+(meters.toFixed(2))+' m · $'+(costA.toFixed(2))+' / $'+(costU.toFixed(2))+'</span>';
            var segIcon = L.divIcon({ className: 'seg-label', html: segHtml });
            L.marker(midLatLng, { icon: segIcon, interactive: false, keyboard: false, pane: this.options.pane }).addTo(this.layer);
          } catch(e) {}

          return original;
      },

      renderCircle: function(latLng, radius, layer, type, label) {
          var color = this.options.color,
              lineColor = this.options.color,
              azimut = '',
              nodeCls = '';

          type = type || 'circle';

          var linesHTML = [];

          var options = {
              color: lineColor,
              fillOpacity: 1,
              opacity: 1,
              fill: true,
              type: type,
              pane: this.options.pane
          };

          var a = this.prevLatlng ? this._map.latLngToContainerPoint(this.prevLatlng) : null,
              b = this._map.latLngToContainerPoint(latLng);

          if(type === 'dot'){
            nodeCls = 'node-label';

            if(a && this.options.show_azimut){
              azimut = ' <span class="azimut"> '+this.lastAzimut+'&deg;</span>';
            }
          }

          var p_latLng = this._map.containerPointToLatLng(b);

          if(label){
              var cicon = L.divIcon({
                  className: 'total-popup-label ' + nodeCls,
                  html: '<span style="color: '+color+';">'+label+azimut+'</span>'
              });

              options.icon = cicon;
              options.marker = L.marker(p_latLng, { icon: cicon, type: type, pane: this.options.pane }).addTo(layer);
              options.label = label;
          }

          var circle = L.circleMarker(latLng, options);

          circle.setRadius(3);
          circle.addTo(layer);

          return circle;
      },

      getAzimut: function(a, b){
        var deg = 0;

        if(a && b){
          deg = parseInt(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);

          if(deg > 0){
            deg += 90;
          } else if(deg < 0){
            deg = Math.abs(deg);
            if(deg <= 90){
              deg = 90 - deg;
            } else {
              deg = 360 - (deg - 90);
            }
          }
        }

        this.lastAzimut = deg;

        return deg;
      },

      renderPolyline: function(latLngs, dashArray, layer) {
          var poly = L.polyline(latLngs, {
              color: this.options.color,
              weight: 2,
              opacity: 1,
              dashArray: dashArray,
              pane: this.options.pane
          });

          poly.addTo(layer);

          return poly;
      },

      renderMultiPolyline: function(latLngs, dashArray, layer) {
          /* Leaflet version 1+ delegated the concept of multi-poly-line to the polyline */
          var multi;

          if(L.version.startsWith('0')){
              multi = L.multiPolyline(latLngs, {
                  color: this.options.color,
                  weight: 2,
                  opacity: 1,
                  dashArray: dashArray,
                  pane: this.options.pane
              });
          } else {
              multi = L.polyline(latLngs, {
                  color: this.options.color,
                  weight: 2,
                  opacity: 1,
                  dashArray: dashArray,
                  pane: this.options.pane
              });
          }

          multi.addTo(layer);

          return multi;
      },

      formatDistance: function(distance, precision) {
          var s = L.Util.formatNum((distance < 1 ? distance*parseFloat(this.SUB_UNIT_CONV) : distance), precision),
              u = (distance < 1 ? this.SUB_UNIT : this.UNIT);

          return { scalar: s, unit: u };
      },

      hasClass: function(target, classes){
          var fn = L.DomUtil.hasClass;

          for(var i in classes){
              if(fn(target, classes[i])){
                  return true;
              }
          }

          return false;
      },

      preClick: function(e){
        var me = this,
            target = e.originalEvent.target;

        if(this.hasClass(target, ['leaflet-popup', 'total-popup-content'])){
            return;
        }

        if(!me.layer){
            me.initLayer();
        }

        me.cleanUpMarkers(true);

        me.fixedLast = me.last;
        me.prevLatlng = e.latlng;
        me.sum = 0;
      },

      getMouseClickHandler: function(e){
          var me = this;
          me.fixedLast = me.last;
          me.sum = 0;

          if(me.poly){
              me.latlngsList.push(me.latlngs);

              if(!me.multi){
                  me.multi = me.renderMultiPolyline(me.latlngsList, '5 5', me.layer, 'dot');
              } else {
                  me.multi.setLatLngs(me.latlngsList);
              }
          }

          var o, dis;
          for(var l in me.latlngsList){
              o = me.latlngsList[l];
              me.sum += o[0].distanceTo(o[1])/me.UNIT_CONV;
          }

          if(me.measure.unit === this.SUB_UNIT){
              dis = me.sum * me.SUB_UNIT_CONV;
          } else {
              dis = me.sum;
          }

          var s = dis.toFixed(2);

          me.renderCircle(e.latlng, 0, me.layer, 'dot', parseInt(s) ? (s + ' ' + me.measure.unit) : '' );
          me.prevLatlng = e.latlng;
      },

      getMouseMoveHandler: function(e){
          var azimut = '';

          if(this.prevLatlng){
              var latLng = e.latlng;

              this.latlngs = [this.prevLatlng, e.latlng];

              if(!this.poly){
                  this.poly = this.renderPolyline(this.latlngs, '5 5', this.layer);
              } else {
                  this.poly.setLatLngs(this.latlngs);
              }

              /* Distance in miles/meters */
              this.distance = parseFloat(this.prevLatlng.distanceTo(e.latlng))/this.UNIT_CONV;

              /* scalar and unit */
              this.measure = this.formatDistance(this.distance + this.sum, 2);

              var a = this.prevLatlng ? this._map.latLngToContainerPoint(this.prevLatlng) : null,
                  b = this._map.latLngToContainerPoint(latLng);

              if(a && this.options.show_azimut){
                var style = 'color: '+this.options.contrastingColor+';';
                azimut = ' <span class="azimut azimut-final" style="'+style+'"> &nbsp; '+this.getAzimut(a, b)+'&deg;</span>';
              }

              /* tooltip with total distance */
              var label = this.measure.scalar + ' ' + this.measure.unit,
                  html = '<span class="total-popup-content" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+'">' + label + azimut + '</span>';

              if(!this.total){
                  this.totalIcon = L.divIcon({ className: 'total-popup', html: html });

                  this.total = L.marker(e.latlng, {
                      icon: this.totalIcon,
                      clickable: true
                  }).addTo(this.layer);

              } else {
                  this.totalIcon = L.divIcon({ className: 'total-popup', html: html });
                  this.total.setLatLng(e.latlng);
                  this.total.setIcon(this.totalIcon);
              }

              /* Rules for separation using only distance criteria */
              var ds = this.measure.scalar,
                  old_separation = this.separation,
                  digits = parseInt(ds).toString().length,
                  num = Math.pow(10, digits),
                  real = ds > (num/2) ? (num/10) : (num/20),
                  dimension = 0;

              this.separation = real;

              /* If there is a change in the segment length we want to re-space
                 the dots on the multi line */
              if(old_separation !== this.separation && this.fixedLast){
                  this.cleanUpMarkers();
                  this.cleanUpFixed();

                  var multi_latlngs = this.multi.getLatLngs();

                  for(var s in multi_latlngs){
                      dimension += this.displayMarkers.apply(this, [multi_latlngs[s], true, dimension]);
                  }

                  this.displayMarkers.apply(this, [this.poly.getLatLngs(), false, this.sum]);

                  /* Review that the dots are in correct units */
                  this.convertDots();

              } else {
                  this.cleanUpMarkers();
                  this.displayMarkers.apply(this, [this.poly.getLatLngs(), false, this.sum]);
              }
          }
      },

      getDblClickHandler: function(e){ L.DomEvent.stop(e); this.finish(); },

      purgeLayers: function(layers){
          for(var i in layers){
              if(layers[i]) {
                this.layer.removeLayer(layers[i]);
              }
          }
      },

      layerSelected: function(e){}
  });

  /* Public API for external controls */
  L.Control.LinearMeasurement.prototype.start = function(){
    var map_container = this._map && this._map.getContainer ? this._map.getContainer() : null;
    if(!this.mainLayer){
      this.initRuler();
      if(this.link){ L.DomUtil.addClass(this.link, 'icon-active'); }
      if(map_container){ L.DomUtil.addClass(map_container, 'ruler-map'); }
    }
  };

  L.Control.LinearMeasurement.prototype.stop = function(){
    var map_container = this._map && this._map.getContainer ? this._map.getContainer() : null;
    if(this.mainLayer){
      this.resetRuler(!!this.mainLayer);
      if(this.link){ L.DomUtil.removeClass(this.link, 'icon-active'); }
      if(map_container){ L.DomUtil.removeClass(map_container, 'ruler-map'); }
    }
  };

  L.Control.LinearMeasurement.prototype.clear = function(){
    try {
      if(this.layer){
        var toRemove = [];
        this.layer.eachLayer(function(l){ toRemove.push(l); });
        for(var i=0;i<toRemove.length;i++){ this.layer.removeLayer(toRemove[i]); }
      }
      if(this.mainLayer){
        var grp = this.mainLayer, rm = [];
        grp.eachLayer(function(l){ rm.push(l); });
        for(var j=0;j<rm.length;j++){ grp.removeLayer(rm[j]); }
      }
      this.resetRuler(false);
    } catch(e){}
  };

  L.Control.LinearMeasurement.prototype.isActive = function(){
    return !!this.mainLayer;
  };

  L.Control.LinearMeasurement.prototype.finish = function(){
    var me = this;
    if(!this.layer){ return; }

    // Build segments array from latlngsList
    var segments = [];
    if(this.latlngsList && this.latlngsList.length){
      for(var i=0;i<this.latlngsList.length;i++){
        var seg = this.latlngsList[i];
        if(seg && seg.length === 2){
          segments.push([seg[0], seg[1]]);
        }
      }
    }

    if(segments.length === 0){ return; }

    var totalMeters = 0;
    var totalCostAbove = 0;
    var totalCostUnder = 0;
    var lines = [];

    function fmt(n){ return (Math.round(n * 100) / 100).toLocaleString(); }

    for(var j=0;j<segments.length;j++){
      var a = segments[j][0], b = segments[j][1];
      var meters = a.distanceTo(b);
      var costA = meters * (me.options.costAboveGround || 0);
      var costU = meters * (me.options.costUnderground || 0);
      totalMeters += meters;
      totalCostAbove += costA;
      totalCostUnder += costU;
      lines.push('<li>Segment '+(j+1)+': '+fmt(meters)+' m — Above: $'+fmt(costA)+' | Underground: $'+fmt(costU)+'</li>');
    }

    var summary = [
      '<div class="total-popup-content popup-window" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+';">',
      '  <div class="popup-header">',
      '    <span>measurement/cost summary</span>',
      '    <span class="popup-controls">',
      '      <button class="popup-btn" data-action="min">–</button>',
      '      <button class="popup-btn" data-action="max">+</button>',
      '      <button class="popup-btn" data-action="print">Print</button>',
      '      <button class="popup-btn" data-action="close">×</button>',
      '    </span>',
      '  </div>',
      '  <div>Total Length: '+fmt(totalMeters)+' m</div>',
      '  <div>Total Cost (Above): $'+fmt(totalCostAbove)+'</div>',
      '  <div>Total Cost (Underground): $'+fmt(totalCostUnder)+'</div>',
      '</div>',
      '<div class="popup-body" style="background:#fff; color:#333; padding:8px 10px; border-radius:6px; margin-top:6px; max-height:220px; overflow:auto;">',
      '  <ul style="margin:0; padding-left:18px;">'+lines.join('')+'</ul>',
      '</div>'
    ].join('');

    // Place popup at south-east of bounding box with offset
    var minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for(var b=0;b<segments.length;b++){
      var a1 = segments[b][0], b1 = segments[b][1];
      [a1,b1].forEach(function(ll){
        if(ll.lat < minLat) minLat = ll.lat;
        if(ll.lat > maxLat) maxLat = ll.lat;
        if(ll.lng < minLng) minLng = ll.lng;
        if(ll.lng > maxLng) maxLng = ll.lng;
      });
    }
    var se = L.latLng(minLat, maxLng);
    var at = this._map.unproject(this._map.project(se).add([30,30]));
    var icon = L.divIcon({ className: 'total-popup', html: summary });
    if(this.total){
      this.total.setLatLng(at);
      this.total.setIcon(icon);
    } else {
      this.total = L.marker(at, { icon: icon, clickable: true }).addTo(this.layer);
    }

    // Finalize and fire selected for external hooks
    var data = { total: { scalar: totalMeters, unit: 'm' }, total_label: this.total, unit: this.UNIT_CONV, sub_unit: this.SUB_UNIT_CONV };
    // attach popup control handlers
    try {
      var node = this.total && this.total._icon ? this.total._icon : null;
      if (node) {
        var body = node.querySelector('.popup-body');
        node.addEventListener('click', function(ev){
          var act = ev.target && ev.target.getAttribute('data-action');
          if(!act) return;
          ev.preventDefault(); ev.stopPropagation();
          if(act==='close') { try{ if(me.layer && me.total){ me.layer.removeLayer(me.total); } }catch(e){} }
          if(act==='min') { if(body){ body.style.display='none'; } }
          if(act==='max') { if(body){ body.style.display='block'; } }
          if(act==='print') {
            try {
              var w = window.open('', '_blank');
              var branding = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><img src="https://newlighttechnologies.com/hubfs/nlt-square.png" alt="NLT" style="height:36px;"/><div><div style="font-size:18px;font-weight:600;">Measurement Report (Demo)</div><div style="color:#666;font-size:12px;">This is for demo purposes only and not an actual cost analysis worksheet for your project. Contact us at <a href="https://newlighttechnologies.com" target="_blank">NewLightTechnologies.com</a> or see <a href="https://newlighttechnologies.com/solutions#analytics-insights" target="_blank">UtilityLine capabilities</a>.</div></div></div>';
              var doc = [
                '<!doctype html><html><head><meta charset="utf-8"/>',
                '<title>Measurement Report</title>',
                '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
                '<style>body{font-family:Arial,Helvetica,sans-serif;padding:16px;} #map{height:420px;margin:10px 0;border:1px solid #ddd;border-radius:6px;} .card{border:1px solid #ddd;border-radius:6px;padding:10px;} .muted{color:#666}</style>',
                '</head><body>',
                branding,
                '<div class="muted">Total Length: '+fmt(totalMeters)+' m — Above: $'+fmt(totalCostAbove)+' — Underground: $'+fmt(totalCostUnder)+'</div>',
                '<div id="map"></div>',
                '<div class="card"><strong>Segments</strong><ul>'+lines.join('')+'</ul></div>',
                '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
                '<script>(function(){\n var map=L.map("map").setView(['+((minLat+maxLat)/2).toFixed(6)+','+((minLng+maxLng)/2).toFixed(6)+'], 12);\n L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);\n var latlngs='+JSON.stringify((function(){var arr=[]; for(var s=0;s<segments.length;s++){arr.push([segments[s][0].lat,segments[s][0].lng]); arr.push([segments[s][1].lat,segments[s][1].lng]);} return arr;})())+';\n var poly=L.polyline(latlngs,{color:"#048abf"}).addTo(map);\n map.fitBounds(poly.getBounds(),{padding:[20,20]});\n setTimeout(function(){window.print();},600);\n})();</script>',
                '</body></html>'
              ].join('');
              w.document.open(); w.document.write(doc); w.document.close();
            } catch(e){}
          }
        });
      }
    } catch(e){}

    this.layer.fireEvent('selected', data);
    this.resetRuler(false);
  };

})();
