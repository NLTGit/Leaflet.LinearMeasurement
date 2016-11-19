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

                var m = L.marker(p_latLng, { icon: cicon, type: type });

                options.icon = cicon;
                options.marker = m.addTo(layer);
                options.label = label;
            }
        },

        onClick: function(e){
            if(!this.rulerEnable) return;
            this.cleanUpMarkers(true, this.layer);
            this.fixedLast = this.last;
        },

        onDraw: function(e, multi, layer, poly){
            this.clearAll(layer);

            if(this.rulerEnable) {
              this.drawRulerLines(layer, multi, poly);
            }

            this.drawTooltip(e.latlng, multi, layer);
        },

        onRedraw: function(layer, multi, poly){
            this.clearAll(layer);

            if(this.rulerEnable && layer.measure) {
              this.drawRulerLines(layer, multi, poly);
            }

            var latlng,
                latlngs = multi.getLatLngs();

            if(latlngs.length){
                latlng = latlngs[latlngs.length-1];
            }

            this.drawTooltip(latlng, multi, layer);
        },

        onDblClick: function(e, layer){
            var me = this;

            L.DomEvent.stop(e);

            var rerun = layer.options.simple,
                workspace = layer,
                map = this._map,
                label = this.measure.scalar + ' ' + this.measure.unit + ' ',
                total_scalar = this.measure.unit === this.SUB_UNIT ? this.measure.scalar/this.UNIT_CONV : this.measure.scalar;

            if(!this.rulerEnable || (layer.options.complete && layer.options.simple)){
              label = layer.options.title;
            }

            var baloon = [
                    '<div class="total-popup-content" style="background-color:'+this.options.color+';">',
                    '  <input class="tip-input hidden-el" type="text" />',
                    '  <div class="tip-layer">'+label+'</div>',
                    '  <svg class="close" viewbox="0 0 45 35">',
                    '   <path class="close" d="M 10,10 L 30,30 M 30,10 L 10,30" />',
                    '  </svg>',
                    '</div>'
                ].join('');

            var html =  baloon;

            if(this.rulerEnable && !layer.options.simple){
              layer.measure = this.measure;
              layer.separation = this.separation;
            } else {
              layer.options.simple = true;
            }

            layer.removeLayer(layer.total);

            layer.totalIcon = L.divIcon({ className: 'total-popup', html: html });

            layer.total = L.marker(e.latlng, {
                icon: layer.totalIcon,
                clickable: true,
                total: true,
                type: 'tmp',
            }).addTo(layer);

            layer.options.complete = true;

            var total_label = layer.total,
                title = label === 'Untitled' ? '' : label;

            workspace.total = layer.total;

            var data = {
                latlng: e.latlng,
                total: this.measure,
                total_label: total_label,
                unit: this.UNIT_CONV,
                sub_unit: this.SUB_UNIT_CONV,
                workspace: workspace,
                rulerOn: this.rulerEnable
            };

            var fireSelected = function(e){
                L.DomEvent.stop(e);

                if(e.originalEvent && L.DomUtil.hasClass(e.originalEvent.target, 'close')){
                    me._map.fire('shape_delete', { id: workspace.options.id });
                    me._map.fire('shape_changed');

                } else {
                    var target_layer = e.target || layer;

                    if(!target_layer.options.simple) {
                      return;
                    }

                    workspace.fireEvent('selected', data);

                    var label_field = '',
                        parent = layer.total._icon.children[0],
                        children = parent.children,
                        input;

                    var fn1 = function(es){
                        L.DomUtil.addClass(input, 'hidden-el');
                        L.DomUtil.removeClass(label_field, 'hidden-el');

                        me.persistGeoJson(target_layer, true);

                        input.removeEventListener('blur', fn1);
                        input.removeEventListener('keyup', fn2);
                    };

                    var fn2 = function(es){
                        var v = input.value;
                        label_field.innerHTML = v || '&nbsp;';
                        target_layer.title = v || '';
                        title = v || '';

                        if(es.key === 'Enter'){
                          fn1();
                        } else {
                          label_field.innerHTML = input.value || '&nbsp;';
                          w = label_field.offsetWidth + 7;
                          input.style.width = w + 'px';
                        }
                    };

                    for(var n in children){
                        if(!children[n].nodeName) return;

                        if(L.DomUtil.hasClass(children[n], 'tip-layer')){
                            label_field = children[n];
                            L.DomUtil.addClass(label_field, 'hidden-el');

                        } else if(L.DomUtil.hasClass(children[n], 'tip-input')){
                            input = children[n];
                            input.value = title;
                            L.DomUtil.removeClass(input, 'hidden-el');
                            input.addEventListener('keyup', fn2);
                            input.addEventListener('blur', fn1);
                            input.focus();
                        }
                    }

                    var w = label_field.offsetWidth + 7;
                    input.style.width = w + 'px';
                }
            };

            workspace.off('click');
            workspace.on('click', fireSelected);

            if(!rerun){
              workspace.fireEvent('click', fireSelected);
            }

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

        cleanUpMarkers: function(fixed, layer){
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
                dis = original,
                measure = layer.measure || this.measure;

            var p2 = this._map.latLngToContainerPoint(latlng),
                p1 = this._map.latLngToContainerPoint(prevLatlng),
                unit = 1;

            if(measure.unit === this.SUB_UNIT){
                unit = this.SUB_UNIT_CONV;
                dis = dis * unit;
            }

            var t = (sum * unit) + dis,
                qu = sum * unit,
                sep = layer.separation || this.separation,
                un = measure.unit;

                if(measure.unit === 'ft' && sep < 100){
                  sep = 100;
                }

            for(var q = Math.floor(qu); q < t; q++){
                ratio = (t-q) / dis;

                if(q % sep || q < qu) {
                    continue;
                }

                x = (p2.x - ratio * (p2.x - p1.x));
                y = (p2.y - ratio * (p2.y - p1.y));

                p = L.point(x, y);

                /* render a circle spaced by separation */

                latlng = this._map.containerPointToLatLng(p);

                label = (q + ' ' + un);

                if(q) {
                    this.renderCircle(latlng, layer, (multi ? 'fixed' : 'tmp'), label, false, false);
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
            this.sum = this.getStaticSum(this.latlngsList);
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

        getStaticSum: function(latLngs){
            var sum = 0;

            if(latLngs.length){
                if(latLngs[0].length){
                    for(var s in latLngs){
                      sum += this.countLine(latLngs[s]);
                    }
                } else {
                    sum = this.countLine(latLngs);
                }

            } else {
                sum = this.sum;
            }
            return sum;
        },

        countLine: function(latLngs){
          var o, sum = 0, prev;
          for(var l in latLngs){
              o = latLngs[l];

              if(prev){
                  sum += prev.distanceTo(o)/this.UNIT_CONV;
              }

              prev = latLngs[l];
          }

          return sum;
        },

        drawRulerLines: function(layer, multi, poly){
            var latlngs = multi ? multi.getLatLngs() : [],
                prev,
                dimension = 0;

            for(var s in latlngs){
                if( Object.prototype.toString.call( latlngs[s] ) === '[object Array]' ) {
                    prev = latlngs[s];

                    var p;

                    for(var t in prev){
                        if(p){
                            dimension += this.displayMarkers.apply(this, [[p, prev[t]], true, dimension, layer]);
                        }
                        p = prev[t];
                    }

                    if(!poly){
                        dimension += this.displayMarkers.apply(this, [[p, prev[0]], true, dimension, layer]);
                    }

                } else {
                    if(prev) {
                        dimension += this.displayMarkers.apply(this, [[prev, latlngs[s]], true, dimension, layer]);
                    }
                    prev = latlngs[s];
                }
            }

            if(poly){
                var polyLatLngs = poly.getLatLngs();
                this.displayMarkers.apply(this, [polyLatLngs, false, dimension, layer]);
            }
        },

        drawTooltip: function(latlng, multi, layer){
            var latLngs = multi ? multi.getLatLngs() : [];
            var sum = 0, prev, o;

            sum = this.getStaticSum(latLngs);

            if(latlng.length){
              latlng = latlng[latlng.length-1];
            }

            /* Distance in miles/meters */
            if(this.prevLatlng){
                this.distance = parseFloat(this.prevLatlng.distanceTo(latlng))/this.UNIT_CONV;
            } else {
                this.distance = 0;
            }

            /* scalar and unit */
            this.measure = this.formatDistance(this.distance + sum, 2);

            if(layer.options.complete){
              this.onDblClick({ latlng: latlng }, layer);
            } else {
              /* tooltip with total distance */
              var label = this.measure.scalar + ' ' + this.measure.unit;

              if(!this.rulerEnable || (layer.options.complete && layer.options.simple)){
                label = layer.options.title;
              }

              var html = '<span class="total-popup-content" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+'">' + label + '</span>';

              layer.totalIcon = L.divIcon({ className: 'total-popup', html: html });

              layer.total = L.marker(latlng, {
                  icon: layer.totalIcon,
                  clickable: true,
                  total: true,
                  type: 'tmp'
              }).addTo(layer);
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
