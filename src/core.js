(function(){

    var mixins = [Utils, Geo, Shapes, Handlers, Features, Paint, Nodes, Measurement];

    L.Control.LinearCore = L.Control.extend({

        options: {
            position: 'topleft',
            color: '#4D90FE',
            fillColor: '#fff',
            type: 'node',
            features: ['node', 'line', 'polygon', 'ruler', 'paint', 'drag', 'rotate', 'nodedrag', 'trash'],
            pallette: ['#FF0080', '#4D90FE', 'red', 'blue', 'green', 'orange', 'black'],
            dashArrayOptions: ['5, 5', '5, 10', '10, 5', '5, 1', '1, 5', '0.9', '15, 10, 5', '15, 10, 5, 10', '15, 10, 5, 10, 15', '5, 5, 1, 5'],
            fill: true,
            stroke: true,
            dashArray: '5, 5',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
            radius: 3,
            unitSystem: 'imperial'
        },

        includes: mixins,

        /* */

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
                map_container = map.getContainer(),
                me = this;

            this.link = L.DomUtil.create('a', 'icon-draw', container);

            this.link.href = '#';
            this.link.title = '';

            map.on('linear_feature_on', function(data){
                if(!me.active){
                    me.active = true;
                    me.initRuler(container);
                    L.DomUtil.addClass(me.link, 'icon-active');
                    L.DomUtil.addClass(map_container, 'ruler-map');
                }
            });

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

            this.setUpColor();

            this.onAdded();

            return container;
        },

        /* When plugin is removed from map dynmically a clean up is necessary */

        onRemove: function(map){
            this.resetRuler(true);
        },

        /* */

        initRuler: function(container){
            var me = this,
                map = this._map;

            this.features = this.options.features;

            this.iconsInitial(container);

            this.featureList = [];

            //this.featureList.push(new L.Class.Feature('node', container));

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

            map.on('click', this.getMouseClickHandler, this);

            map.on('dblclick', this.dblClickEventFn, map);

            map.on('mousemove', this.getMouseMoveHandler, this);

            this.mainLayer.on('dblclick', this.dblClickEventFn, this.mainLayer);

            this.shapeInit();

            this.plotGeoJsons();
        },

        /* */

        iconsInitial: function(container){
            var features = this.features, cap;

            for(var i in features){
                cap = this.capString(features[i]);
                this[features[i]] = L.DomUtil.create('a', 'icon-'+features[i], container);
                this.toggleFeature(this[features[i]], this['enable'+cap], this['disable'+cap], features[i]);
                this[features[i]].href = '#';
                this[features[i]].title = '';
            }
        },

        /* */

        toggleFeature: function(button, activeFn, inactiveFn, feature){
            var me = this;
            L.DomEvent.on(button, 'click', L.DomEvent.stop).on(button, 'click', function(){
                if(me[feature+'Enable']){
                    inactiveFn.call(me);
                } else {
                    activeFn.call(me);
                }
            });
        },

        /* */

        initLayer: function(){
            this.layer = L.geoJson();
            this.layer.options.type = this.options.type;
            this.layer.options.title = 'Untitled';
            this.layer.options.description = '...';
            this.layer.addTo(this.mainLayer);
            this.layer.on('selected', this.onSelect);
            this.anodes = this.fillAllnodes(this.layer);
        },

        /* */

        resetRuler: function(resetLayer){
            var map = this._map;

            if(resetLayer){
                map.off('click', this.clickEventFn, this);
                map.off('mousemove', this.moveEventFn, this);
                map.off('dblclick', this.dblClickEventFn, map);

                this.mainLayer.off('dblclick', this.dblClickEventFn, this.mainLayer);

                this.disablePaint();

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

                var features = this.features;

                for(var i in features){
                    if(this[features[i]]){
                      L.DomUtil.remove(this[features[i]]);
                    }
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

            /* TODO: migrate this to reset feature */

            this.resetMeasurement();

            for(var f in this.featureList){
              if(this[this.featureList[f].options.name+'Enable']){
                this.featureList[f].resetFeature();
              }
            }

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

        /* */

        setUpColor: function(){
            if(this.options.color.indexOf('#') === -1){
                this.options.color = '#' + this.options.color;
            }

            if(this.options.fillColor.indexOf('#') === -1){
                this.options.fillColor = '#' + this.options.fillColor;
            }

            this.includeColor(this.options.color);
            this.includeColor(this.options.fillColor);
        },

        /* */

        includeColor: function(color){
            var colorFound = false;

            for(var o in this.options.pallette){
                if(this.options.pallette[o] === color){
                    colorFound = true;
                }
            }

            if(!colorFound){
                this.options.pallette.push(color);
            }
        },

        enableFeature: function(feature, isType, isFeature){

            /* TODO: Refactor to be treated by each feature */

            if(feature != 'trash'){
                this.disableFeature('node');
                this.disableFeature('line');
                this.disableFeature('ruler');
                this.disableFeature('polygon');
                this.disableFeature('drag');
                this.disableFeature('rotate');
                this.disableFeature('nodedrag');
            }

            if(isType){
                this.disableFeature('node');
                this.disableFeature('line');
                this.disableFeature('polygon');
                this.disableFeature('ruler');
                this.options.type = feature;
            }

            if(isFeature && this.nodeEnable){
                return;
            }

            var button = this[feature];
            L.DomUtil.addClass(button, 'sub-icon-active');
            this[feature+'Enable'] = true;
        },

        disableFeature: function(feature){
            var button = this[feature];
            if(button){
              L.DomUtil.removeClass(button, 'sub-icon-active');
            }
            this[feature+'Enable'] = false;
        }

    });

})();
