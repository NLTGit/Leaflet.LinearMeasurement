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

    persistGeoJson: function(layer, simple){
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

            if(l.options.marker){
                delete g.properties.styles.marker;
            }
            features.push(g);
        });

        geo = {
            type: "FeatureCollection",
            properties: {
                id: id,
                measure: simple ? false : layer.measure,
                separation: simple ? false : layer.separation,
                hidden: false,
                description: layer.description,
                name: layer.title,
                type: layer.options.type,
                simple: simple || !this.rulerEnable
            },
            features: features
        };

        this[operation+'GeoJson'](geo);
    },

    plotGeoJsons: function(id){
        var me = this;

        this.resetRuler();

        var geos = this.getGeoJsons(),
            gLayer, multi;

        var pointToLayerFn = function (feature, latlng) {
            return me.renderCircle(latlng, false, false, false, true, feature.properties.styles);
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
                pointToLayer: pointToLayerFn,
                style: styleFn,
                id: props.id,
                hidden: props.hidden,
                description: props.description,
                title: props.name,
                measure: props.measure,
                separation: props.separation,
                type: props.type,
                complete: true,
                simple: props.simple
            }).addTo(this.mainLayer);

            multi = null;

            gLayer.eachLayer(searchLayerFn);

            gLayer.multi = multi;
            gLayer.measure = gLayer.options.measure;
            gLayer.separation = gLayer.options.separation;
            gLayer.type = gLayer.options.type;
            gLayer.title = gLayer.options.title;

            if(multi){
                me.onRedraw(gLayer, multi);
            }

            me.enableShapeDrag(gLayer);
        }
    }
};
