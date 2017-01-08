var Geo = {

    repaintGeoJson: function(layer){
      if(layer){
          var id = layer.options.id;

          this.mainLayer.removeLayer(layer);

          this.deleteGeoJson(id);

          this.persistGeoJson(layer, layer.options.simple);

          this.plotGeoJsons(id);
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

    deleteGeoJson: function(id){
        var geos = this.getGeoJsons(),
            geo = this.getGeoJson(id);

        if(geo){
           geos.splice(geo.index, 1);
           this.saveGeoJsons(geos);
        }
    },

    purgeGeoJsons: function(){
        this.saveGeoJsons([]);
    },

    saveGeoJsons: function(geos){
        geos = JSON.stringify(geos);
        sessionStorage.geos = geos;
        this._map.fire('shape_changed');
    },

    updateGeoJson: function(geo){
        this.deleteGeoJson(geo.properties.id);
        this.insertGeoJson(geo);
    },

    insertGeoJson: function(geo){
        var geos = this.getGeoJsons();
        geos.push(geo);
        this.saveGeoJsons(geos);
    },

    persistGeoJson: function(layer){
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

        this[operation+'GeoJson'](geo);
    },

    plotGeoJsons: function(id){
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
            if(id && id !== geos[g].properties.id || geos[g].properties.hidden){
                continue;
            }

            props = geos[g].properties;

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
        }
    }
};
