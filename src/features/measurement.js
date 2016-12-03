var Measurement = {

    options: {
        unitSystem: 'imperial' // imperial | metric
    },

    resetMeasurement: function(resetLayer){
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
};
