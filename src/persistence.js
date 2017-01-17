var Geo = {

    repaintGeoJson: function(layer){
      if(layer && layer.options.id){
          var id = layer.options.id;

          this.mainLayer.removeLayer(layer);

          this.deleteGeoJson(id, true);

          this.persistGeoJson(layer, true);

          this.plotGeoJsons(id, true);
      }
    },

    getGeoJsons: function(){
        return sessionStorage.geos ? JSON.parse(sessionStorage.geos) : [];
    },

    getGeoJson: function(id){
        var geos = this.getGeoJsons();

        for(var g in geos){
            if(geos[g].properties.id === id){
                geos[g].index = parseInt(g);
                return geos[g];
            }
        }

        return null;
    },

    deleteGeoJson: function(id, bypass){
        var geos = this.getGeoJsons(),
            geo = this.getGeoJson(id);

        if(geo){
           geos.splice(geo.index, 1);
           this.saveGeoJsons(geos, bypass);
        }
    },

    purgeGeoJsons: function(){
        this.saveGeoJsons([]);
    },

    saveGeoJsons: function(geos, bypass){
        geos = JSON.stringify(geos);
        sessionStorage.geos = geos;

        if(!bypass){
          this._map.fire('shape_changed');
        }
    },

    updateGeoJson: function(geo, bypass){
        this.deleteGeoJson(geo.properties.id, true);
        this.insertGeoJson(geo, bypass);
    },

    insertGeoJson: function(geo, bypass){
        var geos = this.getGeoJsons();
        geos.push(geo);
        this.saveGeoJsons(geos, bypass);
    },

    persistGeoJson: function(layer, bypass){
        var me = this,
            geo, g,
            features = [],
            operation = layer.options.id ? 'update' : 'insert',
            id = layer.options.id || (new Date()).getTime();

        layer.options.id = id;

        if(this.poly){
            layer.removeLayer(this.poly);
        }

        layer.eachLayer(function(l){
            g = l.toGeoJSON();

            g.properties.styles = l.options;

            features.push(g);
        });

        // Do not store empty layers...

        if(features.length){
            geo = {
                type: "FeatureCollection",
                properties: {
                    id: id,
                    hidden: false,
                    description: layer.options.description,
                    name: layer.options.title,
                    type: layer.options.type,
                    lastPoint: layer.options.lastPoint
                },
                features: features
            };

            this[operation+'GeoJson'](geo, bypass);
        }
    },

    plotGeoJsons: function(id, repaint){
        var me = this;

        this.resetRuler();

        var geos = this.getGeoJsons(),
            gLayer;

        var pointToLayerFn = function (feature, latlng) {
            var l;

            if(feature.properties.styles.label){
              l = me.nodeFeature.renderLabel(latlng, feature.properties.styles.label, feature.properties.styles, false);

            } else {
              l = me.nodeFeature.renderCircle(latlng, false, false, false, true, feature.properties.styles);
            }

            return l;
        };

        var styleFn = function(feature){
            return feature.properties.styles;
        };

        var searchLayerFn = function(layer){
            if(layer.getLatLngs){
                multi = layer;
            }
        };

        for(var g in geos){
            props = geos[g].properties;

            if(!props || props.hidden){
                continue;
            }

            if(id && id !== props.id){
                continue;
            }

            gLayer = L.geoJson(geos[g], {
                id: props.id,
                pointToLayer: pointToLayerFn,
                style: styleFn,
                hidden: props.hidden,
                description: props.description,
                title: props.name,
                lastPoint: props.lastPoint,
                type: props.type
            }).addTo(this.mainLayer);

            gLayer.eachLayer(searchLayerFn);

            if(props.lastPoint){
                this.labelFeature.drawTooltip(props.lastPoint, gLayer, props.name);
            }

            if(repaint){
              this.selectedLayer = gLayer;
              this.layer = gLayer;
            }
        }
    }
};
