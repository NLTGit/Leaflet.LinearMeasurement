(function(){

    L.Class.NodeFeature = L.Class.ControlFeature.extend({

        options: {
          name: 'node'
        },

        onClick: function(e){
            var ret = L.Class.ControlFeature.prototype.onClick.call(this, e);

            if(ret){
                /* When feature is enabled a click on the feature button should not proceed */

                if(L.DomUtil.hasClass(e.originalEvent.target, 'icon-node')){
                    return false;
                }

                this.renderCircle(e.latlng, this.core.layer, 'node', '', true);
            }

            return ret;
        },

        renderCircle: function(latLng, layer, type, label, skipLabel, config) {
            var color = this.options.color,
                options = this.core.options,
                r = 3;

            type = type || 'circle';

            if(type != 'node'){
                r = 1;
                color = 'blue';
            }

            var options = config || {
                color: color,
                opacity: options.opacity,
                fillOpacity: options.fillOpacity,
                weight: options.weight,
                fill: options.fill,
                fillColor: options.fillColor,
                type: type
            };

            var circle = L.circleMarker(latLng, options);

            circle.setRadius(r);

            if(layer) {
                circle.addTo(layer);
            }

            if(!skipLabel){
                this.renderLabel(latLng, label, options, layer);
            }

            return circle;
        },

        renderLabel: function(latLng, label, options, layer){
            var type = options.type,
                color = this.options.color,
                p = this.core._map.latLngToContainerPoint(latLng),
                m;

            p_latLng = this.core._map.containerPointToLatLng(p);

            if(label){
                var cicon = L.divIcon({
                    className: 'total-popup-label',
                    html: this.getIconLabelHtml(label, color)
                });

                m = L.marker(p_latLng, { icon: cicon, type: type, label: label });

                options.label = label;

                if(layer){
                  m.addTo(layer);
                }
            }

            return m;
        }

    });

})();
