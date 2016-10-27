(function(){

  L.Control.LinearMeasurement = L.Control.LinearCore.extend({

      options: {
          unitSystem: 'imperial' // imperial | metric
      },

      onAdded: function () {
          this.link.title = 'Toggle measurement tool';
      },

      onRenderNode: function(latLng, options, layer){
          if(!this.rulerEnable) return;
          var label = options.label,
              type = options.type,
              color = this.options.color,
              p = this._map.latLngToContainerPoint(latLng);

          p_latLng = this._map.containerPointToLatLng(p);

          if(!label && type === 'node'){
              label = this.calculateSum();
          }

          if(label){
            var cicon = L.divIcon({
                className: 'total-popup-label',
                html: '<span style="color: '+color+';">'+label+'</span>'
            });

            options.icon = cicon;
            options.marker = L.marker(p_latLng, { icon: cicon, type: type }).addTo(layer);
            options.label = label;
          }
      },

      onClick: function(e){
          if(!this.rulerEnable) return;
          this.cleanUpMarkers(true);
          this.fixedLast = this.last;
      },

      onDraw: function(e, multi, layer){
          if(!this.rulerEnable) return;
          this.drawTooltip(e);
          this.drawRuler();
      },

      onRedraw: function(layer, multi, poly){
          if(!this.rulerEnable) return;
          this.drawRulerLines(layer, multi, poly);
      },

      onDblClick: function(e){
          if(!this.rulerEnable) return;
          var me = this;

          if(!this.total){
              return;
          }

          L.DomEvent.stop(e);

          var workspace = this.layer,
              map = this._map,
              label = this.measure.scalar + ' ' + this.measure.unit + ' ',
              total_scalar = this.measure.unit === this.SUB_UNIT ? this.measure.scalar/this.UNIT_CONV : this.measure.scalar,
              total_latlng = this.total.getLatLng(),
              total_label = this.total,
              html = [
                  '<div class="total-popup-content" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+'">' + label,
                  '  <svg class="close" viewbox="0 0 45 35">',
                  '   <path style="stroke: '+this.options.contrastingColor+'" class="close" d="M 10,10 L 30,30 M 30,10 L 10,30" />',
                  '  </svg>',
                  '</div>'
              ].join('');

          this.totalIcon = L.divIcon({ className: 'total-popup', html: html });
          this.total.setIcon(this.totalIcon);

          var data = {
              total: this.measure,
              total_label: total_label,
              unit: this.UNIT_CONV,
              sub_unit: this.SUB_UNIT_CONV
          };

          var fireSelected = function(e){
              L.DomEvent.stop(e);

              if(L.DomUtil.hasClass(e.originalEvent.target, 'close')){
                  map.off('mousemove', workspace);
                  map.off('mouseup', workspace);
                  me.mainLayer.removeLayer(workspace);
              } else {
                  workspace.fireEvent('selected', data);
              }
          };

          workspace.off('click');
          workspace.on('click', fireSelected);
          workspace.fireEvent('selected', data);
      },

      resetRuler: function(resetLayer){
          L.Control.LinearCore.prototype.resetRuler.call(this, resetLayer);

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

      clearAll: function(layer){
          if(layer){
              layer.eachLayer(function(l){
                  if(l.options && l.options.type === 'tmp' || l.options.type === 'fixed'){
                      layer.removeLayer(l);
                  }
              });
          }
      },

      cleanUpMarkers: function(fixed){
          layer = this.layer;

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

      displayMarkers: function(latlngs, multi, sum, layer) {
          var x, y, label, ratio, p,
              latlng = latlngs[latlngs.length-1],
              prevLatlng = latlngs[0],
              original = prevLatlng.distanceTo(latlng)/this.UNIT_CONV,
              dis = original;

          var p2 = this._map.latLngToContainerPoint(latlng),
              p1 = this._map.latLngToContainerPoint(prevLatlng),
              unit = 1;

          if(layer.measure.unit === this.SUB_UNIT){
              unit = this.SUB_UNIT_CONV;
              dis = dis * unit;
          }

          var t = (sum * unit) + dis,
              qu = sum * unit;

          for(var q = Math.floor(qu); q < t; q++){
              ratio = (t-q) / dis;

              if(q % layer.separation || q < qu) {
                  continue;
              }

              x = (p2.x - ratio * (p2.x - p1.x));
              y = (p2.y - ratio * (p2.y - p1.y));

              p = L.point(x, y);

              /* render a circle spaced by separation */

              latlng = this._map.containerPointToLatLng(p);

              label = (q + ' ' + layer.measure.unit);

              if(q) {
                  this.renderCircle(latlng, 0, layer, multi ? 'fixed' : 'tmp', label);
              }

              this.last = t;
          }

          return original;
      },

      formatDistance: function(distance, precision) {
          var s = L.Util.formatNum((distance < 1 ? distance*parseFloat(this.SUB_UNIT_CONV) : distance), precision),
              u = (distance < 1 ? this.SUB_UNIT : this.UNIT);

          return { scalar: s, unit: u };
      },

      getSum: function(){
          this.sum = 0;

          var o;
          for(var l in this.latlngsList){
              o = this.latlngsList[l];
              this.sum += o[0].distanceTo(o[1])/this.UNIT_CONV;
          }

          return this.sum;
      },

      calculateSum: function(){
          var dis;

          this.getSum();

          if(this.measure.unit === this.SUB_UNIT){
              dis = this.sum * this.SUB_UNIT_CONV;
          } else {
              dis = this.sum;
          }

          var s = dis.toFixed(2);

          return parseInt(s) ? (s + ' ' + this.measure.unit) : '';
      },

      drawTooltip: function(e){
          /* Distance in miles/meters */
          this.distance = parseFloat(this.prevLatlng.distanceTo(e.latlng))/this.UNIT_CONV;

          /* scalar and unit */
          this.measure = this.formatDistance(this.distance + this.sum, 2);

          /* tooltip with total distance */
          var label = this.measure.scalar + ' ' + this.measure.unit,
              html = '<span class="total-popup-content" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+'">' + label + '</span>';

          if(!this.total){
              this.totalIcon = L.divIcon({ className: 'total-popup', html: html });

              this.total = L.marker(e.latlng, {
                  icon: this.totalIcon,
                  clickable: true,
                  total: true
              }).addTo(this.layer);

          } else {
              this.totalIcon = L.divIcon({ className: 'total-popup', html: html });
              this.total.setLatLng(e.latlng);
              this.total.setIcon(this.totalIcon);
          }
      },

      drawRulerLines: function(layer, multi, poly){
          this.clearAll(layer);

          var latlngs = multi ? multi.getLatLngs() : [],
              prev,
              dimension = 0;

          for(var s in latlngs){
              if(s != 0) {
                 dimension += this.displayMarkers.apply(this, [ [prev, latlngs[s]], true, dimension, layer]);
              }
              prev = latlngs[s];
          }

          if(poly){
              this.displayMarkers.apply(this, [poly.getLatLngs(), false, dimension, layer]);
          }
      },

      drawRuler: function(){
          /* Rules for separation using only distance criteria */
          var ds = this.measure.scalar,
              old_separation = this.separation,
              digits = parseInt(ds).toString().length,
              num = Math.pow(10, digits),
              real = ds > (num/2) ? (num/10) : (num/20),
              multi = this.multi,
              layer = this.layer,
              poly = this.poly;

          this.separation = real;
          layer.separation = real;
          layer.measure = this.measure;
          this.getSum();

          /* If there is a change in the segment length we want to re-space
             the dots on the multi line */
          if(old_separation !== this.separation && this.fixedLast && multi){
              this.drawRulerLines(layer, multi, poly);
              /* Review that the dots are in correct units */
              this.convertDots();
          } else {
              this.cleanUpMarkers();
              this.displayMarkers.apply(this, [poly.getLatLngs(), false, this.sum, layer]);
          }
      },

      convertDots: function(){
          var me = this,
              layer = this.layer;

          if(layer) {
              layer.eachLayer(function(l){
                  if(l.options && (l.options.type === 'node')){

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
      }
  });

})();
