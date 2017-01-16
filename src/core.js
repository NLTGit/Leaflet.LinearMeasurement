(function(){

    var mixins = [Utils, Geo, Handlers];

    L.Control.LinearCore = L.Control.extend({

        options: {
            position: 'topleft',
            color: '#4D90FE',
            fillColor: '#fff',
            features: ['node', 'line', 'poly', 'ruler', 'nap', 'label', 'style', 'drag', 'trash'],
            pallette: ['#FF0080', '#4D90FE', 'red', 'blue', 'green', 'orange', 'black'],
            dashArrayOptions: ['5, 5', '5, 10', '10, 5', '5, 1', '1, 5', '0.9', '15, 10, 5', '15, 10, 5, 10', '15, 10, 5, 10, 15', '5, 5, 1, 5'],
            fill: true,
            stroke: true,
            dashArray: '5, 5',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
            radius: 3,
            unitSystem: 'imperial',
            doubleClickSpeed: 300
        },

        includes: mixins,
        tik: 0, // used to calculate double click based on doubleClickSpeed option

        /* Control Leaflet Cycle method implemented */

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
                map_container = map.getContainer(),
                me = this,
                cls = 'draw';

            if(this.options.features && this.options.features.length === 1){
              cls = me.options.features[0];
            }

            this.link = L.DomUtil.create('a', 'icon-'+cls, container);

            this.link.href = '#';
            this.link.title = '';

            this.container = container;

            /* listening to a global map event in order to allow external activation */

            map.on('linear_feature_on', function(data){
                if(!me.active){
                    me.active = true;
                    me.initRuler(container);
                    L.DomUtil.addClass(me.link, 'icon-active');
                    L.DomUtil.addClass(map_container, 'ruler-map');
                } else {
                    me.resetRuler();

                    me.mainLayer.eachLayer(function(l){
                      me.mainLayer.removeLayer(l);
                    });

                    me.plotGeoJsons();
                }
            });

            /* Handling click event on map application icon */

            L.DomEvent.on(me.link, 'click', L.DomEvent.stop).on(me.link, 'click', function(){
                if(L.DomUtil.hasClass(me.link, 'icon-active')){
                    me.active = false;
                    me.resetRuler(true);
                    L.DomUtil.removeClass(me.link, 'icon-active');
                    L.DomUtil.removeClass(map_container, 'ruler-map');

                } else {
                    me.active = true;
                    me.initRuler(container);
                    L.DomUtil.addClass(me.link, 'icon-active');
                    L.DomUtil.addClass(map_container, 'ruler-map');
                }
            });

            /* Normalize the list of colors used to render shapes */

            this.setUpColor();

            /* onAdd is a handler (handlers.js in development) that can be
               overriden by subclasses when plugin is initialized the first time */

            this.onAdded();

            return container;
        },

        /* When plugin is removed from map dynmically a clean up is necessary */

        onRemove: function(map){
            this.resetRuler(true);
        },

        verifyFeatureName: function(f){
          var features = ['node', 'label', 'nap', 'line', 'poly', 'ruler', 'style', 'trash', 'drag', 'trash'];

          if(this.featureMap[f]){
            return false;
          } else {
            this.featureMap[f] = true;
          }

          for(var i in features){
            if(features[i] === f){
              return true;
            }
          }

          return false;
        },

        /* */

        initRuler: function(container){
            var me = this,
                map = this._map;

            this.featureMap = {};
            this.features = [];

            for(var j in this.options.features){
              this.features.push(this.options.features[j]);
            }

            /* Initialize old version of features */

            this.featureList = [];

            this.originalFeaturesCount = this.features.length;

            /* Features are base for everything else for now */

            if(this.originalFeaturesCount === 1){
              this.features.push('node');
              this.features.push('label');
            }

            var f;

            for(var i in this.features){
              f = this.features[i];

              if(this.verifyFeatureName(f)){
                this[f+'Feature'] = eval('new L.Class.'+this.capString(f)+'Feature(this, this._map)');
                this.featureList.push(this[f+'Feature']);
              } else {
                console.log('One or more feature is invalid: ' + f);
              }
            }

            this.mainLayer = L.featureGroup();
            this.mainLayer.addTo(this._map);

            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();

            if(map.tap) {
                map.tap.disable();
            }

            this.dblClickEventFn = function(e){
                L.DomEvent.stop(e);
            };

            /* from handler.js */

            map.on('click', this.getMouseClickHandler, this);

            map.on('dblclick', this.dblClickEventFn, map);

            map.on('mousemove', this.getMouseMoveHandler, this);

            this.mainLayer.on('dblclick', this.dblClickEventFn, this.mainLayer);

            this.shapeInit();

            this.plotGeoJsons();
        },

        /* */

        initLayer: function(){
            this.layer = L.geoJson();
            this.layer.is_new = true;
            this.layer.tik = 0;
            this.layer.options.type = this.options.type;
            this.layer.options.title = 'Untitled';
            this.layer.options.description = '...';
            this.layer.addTo(this.mainLayer);
            this.layer.on('selected', this.onSelect);
        },

        /* */

        resetRuler: function(resetLayer){
            var map = this._map;

            if(resetLayer && this.mainLayer){
                map.off('click', this.clickEventFn, this);
                map.off('mousemove', this.moveEventFn, this);
                map.off('dblclick', this.dblClickEventFn, map);

                this.mainLayer.off('dblclick', this.dblClickEventFn, this.mainLayer);

                if(this.layer){
                    map.removeLayer(this.layer);
                }

                if(this.mainLayer){
                    map.removeLayer(this.mainLayer);
                }

                this.mainLayer = null;

                map.touchZoom.enable();
                map.boxZoom.enable();
                map.keyboard.enable();

                if(map.tap) {
                    map.tap.enable();
                }

                for(var f in this.featureList){
                  this.featureList[f].destroy();
                }
            }

            this.layer = null;
            this.originalLatLng = null;
            this.prevLatlng = null;
            this.poly = null;
            this.multi = null;
            this.latlngs = null;
            this.latlngsList = [];
            this.nodes = [];
        },

        /* */

        reset: function(e){
            if(!this.layer) {
                return;
            }

            this.layer.off('dblclick');

            L.DomEvent.stop(e);

            this.layer.removeLayer(this.poly);

            this.resetRuler(false);
        },

        shapeInit: function(){
            var me = this,
                map = this._map;

            map.on('shape_toggle', function(data){
                var id = data.id,
                    geo = me.getGeoJson(id),
                    selected = me.getLayerById(id);

                geo.properties.hidden = data.hidden;
                me.updateGeoJson(geo);

                if(selected && data.hidden){
                    me.mainLayer.removeLayer(selected);
                } else if(!data.hidden){
                    me.plotGeoJsons(id);
                }
            });

            map.on('shape_delete', function(data){
                var id = data.id,
                    selected = me.getLayerById(id);

                if(selected){
                    me.mainLayer.removeLayer(selected);
                    me.deleteGeoJson(id);
                }
            });

            map.on('shape_focus', function(data){
                var id = data.id,
                    selected = me.getLayerById(id);

                if(selected){
                    me.selectedLayer = selected;
                    map.setView(selected.getBounds().getCenter());
                }
            });

            map.on('shape_update', function(data){
                var id = data.id,
                    geo = me.getGeoJson(id),
                    selected = me.getLayerById(id);

                me.mainLayer.removeLayer(selected);

                geo.properties.hidden = data.hidden;
                geo.properties.name = data.name;
                geo.properties.description = data.description;

                me.updateGeoJson(geo);

                if(!data.hidden){
                    me.plotGeoJsons(id);
                }
            });

        }

    });

})();
