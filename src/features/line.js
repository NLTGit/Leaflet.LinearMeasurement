(function(){

    L.Class.LineFeature = L.Class.NodeFeature.extend({

        options: {
          name: 'line',
          doubleClickSpeed: 300
        },

        latlngs: [],

        onClick: function(e){
            var ret = L.Class.NodeFeature.prototype.onClick.call(this, e);

            if(ret){
              if(L.DomUtil.hasClass(e.originalEvent.target, 'icon-line')){
                  return false;
              }

              this.latlngs.push(e.latlng);
            }

            return ret;
        },

        onMove: function(e, layer){
            /* This means that user should click in order to begin new line draw */

            if(!this.latlngs.length){
              return;
            }

            var core = this.core,
                latlngs = this.latlngs.concat([e.latlng]);

            if(!this.poly){
                if(this.options.name === 'polygon'){
                    this.poly = this.renderPolygon(latlngs, layer);
                } else {
                    this.poly = this.renderPolyline(latlngs, layer);
                }
            } else {
                this.poly.setLatLngs(latlngs);
            }

        },

        onDblClick: function(e){
            this.poly = null;
            this.latlngs.length = 0;
        },

        renderPolyline: function(latLngs, layer) {
            console.log('renderPolyLine');

            var options = this.core.options;

            var poly = L.polyline(latLngs, {
                color: options.color,
                fill: layer.options.type === 'polygon' ? options.fill : '',
                fillColor: options.fillColor,
                stroke: options.stroke,
                opacity: options.opacity,
                fillOpacity: options.fillOpacity,
                weight: options.weight,
                dashArray: options.dashArray,
                type: 'line'
            });

            poly.addTo(layer);

            return poly;
        },

        renderPolygon: function(latLngs, layer) {
            console.log('renderPolygon');

            var options = this.core.options;

            var poly = L.polygon(latLngs, {
                color: options.color,
                fill: layer.options.type === 'polygon' ? options.fill : '',
                fillColor: options.fillColor,
                stroke: options.stroke,
                opacity: options.opacity,
                fillOpacity: options.fillOpacity,
                weight: options.weight,
                dashArray: options.dashArray,
                type: 'polygon'
            });

            poly.addTo(layer);

            return poly;
        },

        clearAll: function(layer){
            if(layer){
                layer.eachLayer(function(l){
                    if(l.options && l.options.type === 'tmp' || l.options.type === 'fixed' || l.options.type === 'label'){
                        layer.removeLayer(l);
                    }
                });
            }
        }

    });

})();
