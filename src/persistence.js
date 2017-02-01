var Geo = {

    repaintGeoJson: function(layer){
      if(layer && layer.options.id){
          var id = layer.options.id;
          this.persistGeoJson(layer);
          this._map.fire('linear_feature_on');
      }
    },

    getGeoJsons: function(){
        var g = sessionStorage.geos;

        try {
          g = JSON.parse(g);
        } catch(err){
          sessionStorage.geos = '{}';
          return {};
        }

        return g;
    },

    getGeoJson: function(id){
        var geos = this.getGeoJsons();

        return geos[id];
    },

    updateGeoJson: function(geo){
        var geos = this.getGeoJsons();
        geos[geo.id] = geo;
        geo.operation = 'update';
        this._map.fire('shape_changed', geo);
        this.saveGeoJsons(geos);
    },

    insertGeoJson: function(geo){
        var geos = this.getGeoJsons();
        geos[geo.id] = geo;
        geo.operation = 'insert';
        this._map.fire('shape_changed', geo);
        this.saveGeoJsons(geos);
    },

    deleteGeoJson: function(id){
      var geos = this.getGeoJsons(),
          geo = geos[id];

      delete geos[geo.id];
      geo.operation = 'delete';
      this._map.fire('shape_changed', geo);
      this.saveGeoJsons(geos);
    },

    saveGeoJsons: function(geos){
        geos = JSON.stringify(geos);
        sessionStorage.geos = geos;
    },

    purgeGeoJsons: function(){
        this.saveGeoJsons({});
    },

    geoFromLayer: function(layer){
        var me = this,
            geo, g,
            features = [],
            operation = layer.options.id ? 'update' : 'insert',
            id = layer.options.id || (new Date()).getTime();

        layer.options.id = id;

        layer.eachLayer(function(l){
            g = l.toGeoJSON();
            g.properties.styles = l.options;
            if(!g.id){
              g.id = (new Date()).getTime() + Math.floor(1000 + Math.random() * 9000);
            }
            features.push(g);
        });

        // Do not store empty layers...

        if(features.length){

            geo = {
                id: id,
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

        }

        return geo;
    },

    persistGeoJson: function(layer){
        var me = this,
            geo, g,
            features = [],
            operation = layer.options.id ? 'update' : 'insert',
            id = layer.options.id || (new Date()).getTime();

        layer.options.id = id;

        layer.eachLayer(function(l){
            g = l.toGeoJSON();
            g.properties.styles = l.options;
            if(!g.id){
              g.id = (new Date()).getTime() + Math.floor(1000 + Math.random() * 9000);
            }
            features.push(g);
        });

        // Do not store empty layers...

        if(features.length){

            geo = {
                id: id,
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
            if(!geos[g]){
                continue;
            }

            props = geos[g].properties;

            if(!props || props.hidden){
                continue;
            }

            if(id && id !== props.id){
                continue;
            }

            gLayer = L.geoJson(geos[g], {
                id: geos[g].id || props.id,
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
            }
        }


    }
};
