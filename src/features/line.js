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
                this.poly = this.renderPolyline(latlngs, layer);
            } else {
                this.poly.setLatLngs(latlngs);
            }

        },

        onDblClick: function(e){
            this.poly = null;
            this.latlngs.length = 0;
        },

        renderPolyline: function(latLngs, layer) {
            var options = this.core.options;

            var poly = L.polyline(latLngs, {
                color: options.color,
                fill: options.fill,
                fillColor: options.fillColor,
                stroke: options.stroke,
                opacity: options.opacity,
                fillOpacity: options.fillOpacity,
                weight: options.weight,
                dashArray: options.dashArray
            });

            poly.addTo(layer);

            return poly;
        },

        renderMultiPolyline: function(latLngs, layer) {
            /* Leaflet version 1+ delegated the concept of multi-poly-line to the polyline */
            var multi;

            if(options.type === 'polygon'){
                multi = L.polygon(latLngs, {
                    color: options.color,
                    fill: options.fill,
                    fillColor: options.fillColor,
                    stroke: options.stroke,
                    opacity: options.opacity,
                    fillOpacity: options.fillOpacity,
                    weight: options.weight,
                    dashArray: options.dashArray
                });
            } else {
                if(L.version.startsWith('0')){
                    multi = L.multiPolyline(latLngs, {
                        color: options.color,
                        fill: options.fill,
                        fillColor: options.fillColor,
                        stroke: options.stroke,
                        opacity: options.opacity,
                        fillOpacity: options.fillOpacity,
                        weight: options.weight,
                        dashArray: options.dashArray
                    });
                } else {
                    multi = L.polyline(latLngs, {
                        color: options.color,
                        fill: options.fill,
                        fillColor: options.fillColor,
                        stroke: options.stroke,
                        opacity: options.opacity,
                        fillOpacity: options.fillOpacity,
                        weight: options.weight,
                        dashArray: options.dashArray
                    });
                }
            }

            multi.addTo(layer);

            return multi;
        }

    });

})();
