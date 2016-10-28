(function(){

    L.Control.LinearCore = L.Control.extend({

        options: {
            position: 'topleft',
            color: '#4D90FE',
            fillColor: '#fff',
            type: 'node', // node, line, polyline, polygon,
            features: ['node', 'line', 'polygon', 'drag', 'rotate', 'nodedrag', 'ruler', 'paint', 'trash'],
            pallette: ['#FF0080', '#4D90FE', 'red', 'blue', 'green', 'orange', 'black'],
            dashArrayOptions: ['5, 5', '5, 10', '10, 5', '5, 1', '1, 5', '0.9', '15, 10, 5', '15, 10, 5, 10', '15, 10, 5, 10, 15', '5, 5, 1, 5'],
            fill: true,
            stroke: true,
            dashArray: '5, 5',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
            radius: 3
        },

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
                map_container = map.getContainer(),
                me = this;

            this.link = L.DomUtil.create('a', 'icon-draw', container);

            this.link.href = '#';
            this.link.title = '';

            switch(this.options.type){
                case 'node':
                    this.options.shape = 1;
                    break;
                case 'line':
                    this.options.shape = 2;
                    break;
                case 'polygon':
                    this.options.shape = 3;
                    break;
                default:
            }

            L.DomEvent.on(me.link, 'click', L.DomEvent.stop).on(me.link, 'click', function(){
                if(L.DomUtil.hasClass(me.link, 'icon-active')){
                    me.resetRuler(true);
                    L.DomUtil.removeClass(me.link, 'icon-active');
                    L.DomUtil.removeClass(map_container, 'ruler-map');

                } else {
                    me.initRuler(container);
                    L.DomUtil.addClass(me.link, 'icon-active');
                    L.DomUtil.addClass(map_container, 'ruler-map');
                }
            });

            if(this.options.color && this.options.color.indexOf('#') === -1){
                this.options.color = '#' + this.options.color;
            }

            if(this.options.fillColor && this.options.fillColor.indexOf('#') === -1){
                this.options.fillColor = '#' + this.options.fillColor;
            }

            this.includeColor(this.options.color);
            this.includeColor(this.options.fillColor);

            this.onAdded();

            return container;
        },

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

        onRemove: function(map){
            this.resetRuler(true);
        },

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

        initRuler: function(container){
            var me = this,
                map = this._map;

            this.features = this.options.features;

            this.iconsInitial(container);

            if(this.options.type === 'line'){
                this.enableLine();

            } else if(this.options.type === 'polygon'){
                this.enablePolygon();

            } else {
                this.enableNode();

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

            map.on('click', this.getMouseClickHandler, this);

            map.on('dblclick', this.dblClickEventFn, map);

            this.mainLayer.on('dblclick', this.dblClickEventFn, this.mainLayer);

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

            this.plotGeoJsons();
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

                if(l.options.marker){
                    delete g.properties.styles.marker;
                }
                features.push(g);
            });

            geo = {
                type: "FeatureCollection",
                properties: {
                    id: id,
                    measure: layer.measure,
                    separation: layer.separation,
                    hidden: false,
                    description: '... temp string. This would be provided by user.',
                    name: ('Name ' + id),
                },
                features: features
            };

            this[operation+'GeoJson'](geo);
        },

        plotGeoJsons: function(id){
            var me = this;

            this.resetRuler();

            this.enableRuler();

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
                    name: props.name,
                    measure: props.measure,
                    separation: props.separation
                }).addTo(this.mainLayer);

                multi = null;

                gLayer.eachLayer(searchLayerFn);

                gLayer.multi = multi;
                gLayer.measure = gLayer.options.measure;
                gLayer.separation = gLayer.options.separation;

                if(multi){
                    me.onRedraw(gLayer, multi);
                }

                me.enableShapeDrag(gLayer);
            }
        },

        initLayer: function(){
            this.layer = L.geoJson();
            this.layer.addTo(this.mainLayer);
            this.layer.on('selected', this.onSelect);
            this._map.on('mousemove', this.getMouseMoveHandler, this);
            this.anodes = this.fillAllnodes(this.layer);
        },

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
                    L.DomUtil.remove(this[features[i]]);
                }
            }

            this._map.off('mousemove', this.getMouseMoveHandler, this);

            this.layer = null;
            this.originalLatLng = null;
            this.prevLatlng = null;
            this.poly = null;
            this.multi = null;
            this.latlngs = null;
            this.latlngsList = [];
            this.nodes = [];
        },

        getLayerById: function(id){
            var found = null;

            this.mainLayer.eachLayer(function(layer){
                if(layer.options.id === id){
                    found = layer;
                    return;
                }
            });

            return found;
        },

        renderCircle: function(latLng, layer, type, label, skipLabel, config) {
            var color = this.options.color,
                r = 3;

            type = type || 'circle';

            if(type != 'node'){
                r = 1;
                color = 'blue';
            }

            var options = config || {
                color: color,
                opacity: this.options.opacity,
                fillOpacity: this.options.fillOpacity,
                weight: this.options.weight,
                fill: this.options.fill,
                fillColor: this.options.fillColor,
                type: type,
                label: label
            };

            if(!skipLabel){
                this.onRenderNode(latLng, options, layer);
            }

            var circle = L.circleMarker(latLng, options);

            circle.setRadius(r);

            if(layer) {
                circle.addTo(layer);
            }

            return circle;
        },

        renderPolyline: function(latLngs, layer) {
            var poly = L.polyline(latLngs, {
                color: this.options.color,
                fill: this.options.fill,
                fillColor: this.options.fillColor,
                stroke: this.options.stroke,
                opacity: this.options.opacity,
                fillOpacity: this.options.fillOpacity,
                weight: this.options.weight,
                dashArray: this.options.dashArray
            });

            poly.addTo(layer);

            return poly;
        },

        renderMultiPolyline: function(latLngs, layer) {
            /* Leaflet version 1+ delegated the concept of multi-poly-line to the polyline */
            var multi;

            if(this.options.type === 'polygon'){
                multi = L.polygon(latLngs, {
                    color: this.options.color,
                    fill: this.options.fill,
                    fillColor: this.options.fillColor,
                    stroke: this.options.stroke,
                    opacity: this.options.opacity,
                    fillOpacity: this.options.fillOpacity,
                    weight: this.options.weight,
                    dashArray: this.options.dashArray
                });
            } else {
                if(L.version.startsWith('0')){
                    multi = L.multiPolyline(latLngs, {
                        color: this.options.color,
                        fill: this.options.fill,
                        fillColor: this.options.fillColor,
                        stroke: this.options.stroke,
                        opacity: this.options.opacity,
                        fillOpacity: this.options.fillOpacity,
                        weight: this.options.weight,
                        dashArray: this.options.dashArray
                    });
                } else {
                    multi = L.polyline(latLngs, {
                        color: this.options.color,
                        fill: this.options.fill,
                        fillColor: this.options.fillColor,
                        stroke: this.options.stroke,
                        opacity: this.options.opacity,
                        fillOpacity: this.options.fillOpacity,
                        weight: this.options.weight,
                        dashArray: this.options.dashArray
                    });
                }
            }

            multi.addTo(layer);

            return multi;
        },

        hasClass: function(target, classes){
            var fn = L.DomUtil.hasClass;

            for(var i in classes){
                if(fn(target, classes[i])){
                    return true;
                }
            }

            return false;
        },

        getMouseClickHandler: function(e){
            L.DomEvent.stop(e);

            if(this.nearLatLng){
                e.latlng.lat = this.nearLatLng.lat;
                e.latlng.lng = this.nearLatLng.lng;
                this.doRenderNode(e);
                return;
            }

            if(e.originalEvent.target.nodeName === 'INPUT'){
                return;
            }

            if(!this.nodeEnable && !this.lineEnable && !this.polygonEnable){
                return;
            }

            var isNode = this.options.type === 'node';

            if(this.pid || isNode){

                clearTimeout(this.pid);

                if(isNode){
                    this.initLayer();
                }

                if(this.layer){
                    if(!this.multi && !isNode){
                        this.multi = this.renderMultiPolyline(this.nodes, this.layer, 'dot');
                        this.layer.multi = this.multi;
                    }
                    this.getMouseDblClickHandler(e);
                }

                this.pid = 0;

            } else {
                this.displayNode(e);
            }
        },

        displayNode: function(e, isSnapping){
            var me = this,
                t = 200,
                target = e.originalEvent.target;

            if(isSnapping){
                this.nearLatLng = L.latLng(e.latlng);
            }

            this._map.off('mousemove', this.getMouseMoveHandler, this);

            this.pid = setTimeout(function(){
                me.pid = 0;

                if(me.hasClass(target, ['leaflet-popup', 'total-popup-content'])){
                    return;
                }

                if(!me.layer){
                    me.initLayer();
                }

                me.doRenderNode(e, isSnapping);

                me._map.on('mousemove', me.getMouseMoveHandler, me);
            }, t);
        },

        doRenderNode: function(e, isSnapping){
            var latlng = e.latlng,
                nodes = this.nodes,
                me = this;

            if(isSnapping && this.poly){
                this.poly.setLatLngs([me.prevLatlng, latlng]);
                this.onRedraw(this.layer, this.multi, this.poly);
                return;
            }

            me.prevLatlng = latlng;

            if(!me.originalLatLng){
                me.originalLatLng = latlng;
            }

            me.nodes.push(latlng);
            me.onClick(e);

            if(me.poly){
                me.latlngsList.push(me.latlngs);

                if(!me.multi){
                    me.multi = me.renderMultiPolyline(nodes, me.layer, 'node');
                } else {
                    me.multi.setLatLngs(nodes);
                }
            }

            me.renderCircle(latlng, me.layer, 'node', '', true);
        },

        setSnapLatLng: function(e){
            var newLatLng = this.getSnapLatLng(e);

            if(newLatLng){
                e.latlng.lat = newLatLng.lat;
                e.latlng.lng = newLatLng.lng;
                this.displayNode(e, true);
                return true;

            } else {
                return false;
            }
        },

        searchNearNodes: function(e, layer){
            var latlng;
            layer.eachLayer(function(m){
                if(m.options.type === 'node' && m.getLatLng().equals(e.latlng, 0.005)){
                    latlng = L.latLng(m.getLatLng());
                    return;
                }
            });
            return latlng;
        },

        getSnapLatLng: function(e){
            var me = this,
                latlng = false;

            this.mainLayer.eachLayer(function(layer){
                latlng = me.searchNearNodes(e, layer);
                if(latlng){ return; }
            });


            return latlng;
        },

        getMouseMoveHandler: function(e){
            if(this.prevLatlng && this.options.shape > 1 && !this.nodeEnable){

                if(this.nearLatLng && !this.nearLatLng.equals(e.latlng, 0.003)){
                    this.nearLatLng = null;

                } else {
                    this.nearLatLng = this.getNearestNode(e, this.anodes);
                }

                if(this.nearLatLng){
                    e.latlng.lat = this.nearLatLng.lat;
                    e.latlng.lng = this.nearLatLng.lng;
                }

                var start = this.prevLatlng,
                    end = e.latlng;

                this.latlngs = [start, end];

                if(!this.poly){
                    this.poly = this.renderPolyline(this.latlngs, this.layer);
                } else {
                    this.poly.setLatLngs(this.latlngs);
                }

                this.onDraw(e);
            }
        },

        getMouseDblClickHandler: function(e){
            var me = this;

            if(this.options.shape > 1){
                this.doRenderNode(e);
                this.onDblClick(e);
            }

            me.enableShapeDrag(me.layer);

            me.persistGeoJson(me.layer);

            me.reset(e);
        },

        fillOnodes: function(layer){
            var onodes = [];

            layer.eachLayer(function(m){
                if(!m._latlngs) {
                    var latlng = m.getLatLng();
                    latlng.node = m;
                    onodes.push(latlng);
                }
            });

            return onodes;
        },

        searchForAllNodes: function(layer, myLayer, onodes){
            if(layer == myLayer){
                return;
            }
            layer.eachLayer(function(m){
                if(m.options.type === 'node') {
                    var latlng = m.getLatLng();
                    latlng.node = m;
                    onodes.push(latlng);
                }
            });
        },

        fillAllnodes: function(myLayer){
            var me = this, onodes = [];

            this.mainLayer.eachLayer(function(layer){
                me.searchForAllNodes(layer, myLayer, onodes);
            });

            return onodes;
        },

        enableShapeDrag: function(layer){
            var me = this,
                map = this._map,
                m,
                i = null,
                total = layer.total,
                nodes = [],
                onodes = [],
                pos;

            layer.eachLayer(function(l){
                if(l.getLatLngs){
                    m = l;
                } else if(l.options.type === 'node'){
                    nodes.push(L.latLng(l.getLatLng()));
                }
            });

            onodes = me.fillOnodes(layer);
            me.zeroNodes(nodes, onodes);

            layer.on('mousedown', function(e){
                if(!me.dragging && me.dragEnable){
                    me._map.dragging.disable();
                    layer.drag = true;
                    me.dragging = true;
                    i = e.latlng;
                    pos = this._map.latLngToContainerPoint(i);
                }
            });

            map.on('mousemove', function(e){
                if(layer.drag){
                    d = e.latlng;

                    for(var o in onodes){
                        me.setNodePosition(onodes[o], pos, d);
                    }

                    if(total){
                        total.setLatLng(nodes[nodes.length-1]);
                    }

                    if(m){
                        m.setLatLngs(nodes);
                        me.onRedraw(layer, m);
                    }
                }
            }, layer);

            map.on('mouseup', function(e){
                if(layer.drag){
                    layer.drag = false;
                    me._map.dragging.enable();
                    me.dragging = false;
                    i = e.latlng;
                    me.zeroNodes(nodes, onodes);
                    me.persistGeoJson(layer);
                }
            }, layer);

            this.enableShapeNodeDrag(layer, m, nodes);
        },

        getNearestNode: function(e, onodes){
            for(var o in onodes){
                if(onodes[o].equals(e.latlng, 0.003)){
                    return L.latLng(onodes[o]);
                }
            }
            return false;
        },

        getSelectedNode: function(e, latlngs){
            for(var ll in latlngs){
                if(latlngs[ll].equals && latlngs[ll].equals(e.latlng, 0.005)){
                    return latlngs[ll];
                }
            }
        },

        enableShapeNodeDrag: function(layer, multi, nodes){
            var me = this,
                map = this._map,
                total = layer.total,
                selectedNode = null,
                nearLatLng,
                d, delta,
                nearings = [],
                onodes = [],
                type = me.options.type,
                anodes = [];

            if(multi){
                multi.nodes = nodes;
            } else {
                layer.eachLayer(function(m){
                    if(m.options.type === 'node'){
                        selectedNode = { node: m };
                    }
                });
            }

            onodes = me.fillOnodes(layer);
            me.zeroNodes(nodes, onodes);

            var centroid, pos_i, dxi, dyi, i;

            layer.on('mousedown', function(e){
                if(me.rotateEnable || me.nodedragEnable){
                    map.dragging.disable();
                    me.dragging = true;

                    if(multi){
                        centroid = map.latLngToContainerPoint(multi.getCenter());

                        i = e.latlng;

                        pos_i = map.latLngToContainerPoint(i);
                        dxi = pos_i.x - centroid.x;
                        dyi = pos_i.y - centroid.y;

                        var positions = multi.getLatLngs(),
                            latlngs = [];

                        if(type === 'polygon'){
                            for(var p in positions){
                                for(var ll in positions[p]){
                                    latlngs.push(positions[p][ll]);
                                }
                            }
                            selectedNode = me.getSelectedNode(e, latlngs);
                        } else {
                            selectedNode = me.getSelectedNode(e, positions);
                        }
                    }

                    layer.nodedrag = true;

                    anodes = me.fillAllnodes(layer);
                }
            });

            map.on('mousemove', function(e){
                if(layer.nodedrag){
                    d = e.latlng;
                    delta = 0;

                    if(me.nodedragEnable){
                        if(selectedNode){

                            if(nearLatLng && !nearLatLng.equals(d, 0.003)){
                                nearLatLng = null;

                            } else {
                                nearLatLng = me.getNearestNode(e, anodes);
                            }

                            if(nearLatLng){
                                d.lat = nearLatLng.lat;
                                d.lng = nearLatLng.lng;
                            }

                            selectedNode.lat = d.lat;
                            selectedNode.lng = d.lng;

                            if(selectedNode.node){
                                selectedNode.node.setLatLng([d.lat, d.lng]);
                            }

                            if(multi){
                                multi.setLatLngs(nodes);
                                me.onRedraw(layer, multi, false);
                            }
                        }

                    } else if(multi && me.rotateEnable){
                        delta = me.getRotationAngleDelta(d, i, centroid, dxi, dyi);

                        for(var o in onodes){
                            me.rotateNode(onodes[o], centroid, delta);
                        }

                        if(total){
                            total.setLatLng(nodes[nodes.length-1]);
                        }

                        multi.setLatLngs(nodes);
                        me.onRedraw(layer, multi);
                    }
                }
            });

            map.on('mouseup', function(e){
                if(layer.nodedrag){
                    nearLatLng = null;
                    layer.nodedrag = false;
                    map.dragging.enable();
                    i = e.latlng;
                    me.zeroNodes(nodes, onodes);
                    me.dragging = false;
                    me.persistGeoJson(layer);
                }
            });
        },

        zeroNodes: function(nodes, onodes){
            for(var j in nodes){
                nodes[j].original_x = 0;
                nodes[j].original_y = 0;
            }
            for(var o in onodes){
                onodes[o].original_x = 0;
                onodes[o].original_y = 0;
            }
        },

        rotateNode: function(node, centroid, delta){
            var me = this,
                m = node.node,
                map = this._map,
                org = map.latLngToContainerPoint(m.getLatLng()),
                dx = node.original_x ? (node.original_x - centroid.x) : (org.x - centroid.x),
                dy = node.original_y ? (node.original_y - centroid.y) : (org.y - centroid.y),
                angle = Math.atan2(dx, dy);

            angle -= delta;

            if(!m.distance){
                m.distance = centroid.distanceTo(org);
            }

            org.x = centroid.x + m.distance * Math.cos(angle);
            org.y = centroid.y + m.distance * Math.sin(angle);

            if(!node.original_x){
                node.original_x = org.x;
                node.original_y = org.y;
                return;
            }

            var d = map.containerPointToLatLng(org);

            m.setLatLng(d);

            node.lat = d.lat;
            node.lng = d.lng;
        },

        getRotationAngleDelta: function(d, i, centroid, dxi, dyi){
            var map = this._map,
                pos_d = map.latLngToContainerPoint(d),
                pos_i = map.latLngToContainerPoint(i),
                dx = pos_d.x - centroid.x,
                dy = pos_d.y - centroid.y,
                original = Math.atan2(dyi, dxi),
                angle = Math.atan2(dy, dx);

            return original - angle;
        },

        setNodePosition: function(node, pos, d){
            var dx, dy;

            var delta_pos = this._map.latLngToContainerPoint(d),
                node_pos = this._map.latLngToContainerPoint(node);

            dx = pos.x - delta_pos.x;
            dy = pos.y - delta_pos.y;

            if(!node.original_x){
                node.original_x = node_pos.x;
                node.original_y = node_pos.y;
            }

            node_pos.x = node.original_x - dx;
            node_pos.y = node.original_y - dy;

            var new_node = this._map.containerPointToLatLng(node_pos);

            node.lat = new_node.lat;
            node.lng = new_node.lng;

            node.node.setLatLng(new_node);
        },

        reset: function(e){
            if(!this.layer) {
                return;
            }

            this.layer.off('dblclick');

            L.DomEvent.stop(e);

            this.layer.removeLayer(this.poly);

            this.resetRuler(false);
        },

        onRenderNode: function(latLng, options, layer){},

        onDraw: function(e){},

        onRedraw: function(layer, multi, poly){},

        onClick: function(e){},

        onDblClick: function(e){},

        onAdded: function(){},

        onSelect: function(e){},

        enableFeature: function(feature, isType, isFeature){
            if(feature != 'ruler' && feature != 'paint' && feature != 'trash'){
                this.disableFeature('node');
                this.disableFeature('line');
                this.disableFeature('polygon');
                this.disableFeature('drag');
                this.disableFeature('rotate');
                this.disableFeature('nodedrag');
            }

            if(isType){
                this.disableFeature('node');
                this.disableFeature('line');
                this.disableFeature('polygon');
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
            L.DomUtil.removeClass(button, 'sub-icon-active');
            this[feature+'Enable'] = false;
        },

        enableNode: function(){
            this.enableFeature('node', true);
            this.disableFeature('drag');
            this.disableFeature('rotate');
            this.disableFeature('nodedrag');
            this.disableFeature('ruler');
        },

        disableNode: function(){
            this.disableFeature('node');
        },

        enableLine: function(){
            this.enableFeature('line', true);
        },

        disableLine: function(){
            this.disableFeature('line');
        },

        enablePolygon: function(){
            this.enableFeature('polygon', true);
        },

        disablePolygon: function(){
            this.disableFeature('polygon');
        },

        enableDrag: function(){
            this.enableFeature('drag', false, true);
            this.disableFeature('nodedrag');
            this.disableFeature('rotate');
        },

        disableDrag: function(){
            this.disableFeature('drag');
        },

        enableRotate: function(){
            this.enableFeature('rotate', false, true);
            this.disableFeature('nodedrag');
            this.disableFeature('drag');
        },

        disableRotate: function(){
            this.disableFeature('rotate');
        },

        enableNodedrag: function(){
            this.enableFeature('nodedrag', false, true);
            this.disableFeature('rotate');
            this.disableFeature('drag');
        },

        disableNodedrag: function(){
            this.disableFeature('nodedrag');
        },

        enableRuler: function(){
            this.enableFeature('ruler', false, true);
        },

        disableRuler: function(){
            this.disableFeature('ruler');
        },

        enableTrash: function(){
            var me = this;

            this.enableFeature('trash', false, false);

            this.mainLayer.eachLayer(function(layer){
                me.mainLayer.removeLayer(layer);
            });

            this.purgeGeoJsons();

            this._map.fire('shape_changed');

            me.resetRuler();

            setTimeout(function(){
                me.disableFeature('trash');
            }, 100);
        },

        disableTrash: function(){
            this.disableFeature('trash');
        },

        enablePaint: function(){
            this.enableFeature('paint', false, true);

            if(this.paintPane){
                L.DomUtil.removeClass(this.paintPane, 'not-visible');
            } else {
                this.buildPaintPane();
            }
        },

        disablePaint: function(){
            this.disableFeature('paint');
            if(this.paintPane){
                L.DomUtil.addClass(this.paintPane, 'not-visible');
            }
        },

        buildPaintPane: function(){
            var me = this,
                map = this._map.getContainer();

            this.paintPane = L.DomUtil.create('div', 'paint-pane', map);

            var draggable = new L.Draggable(this.paintPane);
            draggable.enable();

            this.buildPaneHeader();

            this.buildPaneSection('color', function(){
                me.paintColor.addEventListener('click', function(e){
                    L.DomEvent.stop(e);

                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        var parent = e.target.nodeName === 'SPAN' ? e.target.parentElement : e.target,
                            color = parent.getAttribute('color'),
                            ul = parent.parentElement,
                            children = ul.childNodes;

                        for(var n in children){
                            if(me.isElement(children[n])){
                                L.DomUtil.removeClass(children[n], 'paint-color-selected');
                            }
                        }

                        L.DomUtil.addClass(parent, 'paint-color-selected');
                        me.options.color = color;
                    }
                });
            });

            this.buildPaneSection('fillColor', function(){
                me.paintFillColor.addEventListener('click', function(e){
                    L.DomEvent.stop(e);

                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        var parent = e.target.nodeName === 'SPAN' ? e.target.parentElement : e.target,
                            color = parent.getAttribute('color'),
                            ul = parent.parentElement,
                            children = ul.childNodes;

                        for(var n in children){
                            if(me.isElement(children[n])){
                                L.DomUtil.removeClass(children[n], 'paint-color-selected');
                            }
                        }

                        L.DomUtil.addClass(parent, 'paint-color-selected');
                        me.options.fillColor = color;
                    }
                });
            });

            this.buildPaneSection('flags', function(){
                me.paintFlags.addEventListener('click', function(e){
                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        if(e.target.nodeName === 'INPUT'){
                            if(e.target.checked){
                                me.options[e.target.getAttribute('flag')] = true;

                            } else {
                                me.options[e.target.getAttribute('flag')] = false;
                            }
                        }
                    }
                });
            });

            this.buildPaneSection('dashArray', function(){
                me.paintDashArray.addEventListener('click', function(e){
                    L.DomEvent.stop(e);

                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        var parent = e.target.parentElement,
                            children = parent.childNodes;

                        for(var n in children){
                            if(me.isElement(children[n]) || children[n].nodeName){
                                L.DomUtil.removeClass(children[n], 'line-selected');
                            }
                        }

                        L.DomUtil.addClass(e.target, 'line-selected');
                        me.options.dashArray = e.target.getAttribute('stroke-dasharray').replace(/,/g, '');
                    }
                });
            });

            this.buildPaneSection('opacity', function(){
                me.paintOpacity.addEventListener('mousedown', function(e){
                    L.DomEvent.stop(e);
                });

                me.paintOpacity.addEventListener('click', function(e){
                    L.DomEvent.stop(e);
                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        if(e.target.nodeName === 'INPUT'){
                            me.options[e.target.getAttribute('flag')] = e.target.value;
                        }
                    }
                });
            });
        },

        buildPaneHeader: function(){
            var me = this;

            var header = [
                '<span>Styling Options</span><i class="close">x</i>'
            ].join('');

            this.paintPaneHeader = L.DomUtil.create('div', 'paint-pane-header', this.paintPane);
            this.paintPaneHeader.innerHTML = header;

            this.paintPaneHeader.addEventListener('click', function(e){
                if(e.target.nodeName === 'I'){
                    me.disablePaint();
                }
            });
        },

        buildPaneSection: function(section, callback){
            var me = this,
                cap = this.capString(section);

            var html = this['build'+cap+'Section']();

            this['paint'+cap] = L.DomUtil.create('div', 'paint-pane-section paint-pane-'+section, this.paintPane);
            this['paint'+cap].innerHTML = html;

            if(callback && typeof callback === 'function'){
                callback();
            }
        },

        buildColorSection: function(){
            var colors = this.options.pallette,
                selected = '',
                content = [];

            for(var c in colors){
                selected = colors[c] === this.options.color ? 'paint-color-selected' : '';
                content.push('<li class="paint-color clickable '+selected+'" color="'+colors[c]+'"><span class="clickable" style="background-color: '+colors[c]+';"></span></li>');
            }

            var html = [
                '<span class="section-header">Stroke</span>',
                '<ul class="section-body paint-color-wrapper">',
                content.join(''),
                '</ul>'
            ].join('');

            return html;
        },

        buildFillColorSection: function(){
            var colors = this.options.pallette,
                selected = '',
                content = [];

            for(var c in colors){
                selected = colors[c] === this.options.fillColor ? 'paint-color-selected' : '';
                content.push('<li class="paint-color clickable '+selected+'" color="'+colors[c]+'"><span class="clickable" style="background-color: '+colors[c]+';"></span></li>');
            }

            var html = [
                '<span class="section-header">Fill Color</span>',
                '<ul class="section-body paint-color-wrapper">',
                content.join(''),
                '</ul>'
            ].join('');

            return html;
        },

        buildFlagsSection: function(){
            var flags = ['stroke', 'fill'],
                selected = '',
                content = [];

            for(var f in flags){
                selected = this.options[flags[f]] ? 'checked' : '';
                content.push('<div><input value="'+flags[f]+'" type="checkbox" '+selected+' class="clickable" flag="'+flags[f]+'"> Draw ' + flags[f] + '</div>');
            }

            var html = [
                '<span class="section-header">Options</span>',
                '<div class="section-body">',
                content.join(''),
                '</div>'
            ].join('');

            return html;
        },

        buildDashArraySection: function(){
            var dashes = this.options.dashArrayOptions,
                selected = '',
                content = [],
                y = 10;

            for(var d in dashes){
                selected = this.options.dashArray === dashes[d] ? 'line-selected' : '';
                content.push('<line class="clickable pain-lines '+selected+'" stroke-dasharray="'+dashes[d]+'" x1="10" y1="'+y+'" x2="160" y2="'+y+'" />');
                y += 20;
            }

            var html = [
                '<span class="section-header">Dash Array</span>',
                '<svg class="section-body" width="200" height="200" viewPort="0 0 200 300" version="1.1" xmlns="http://www.w3.org/2000/svg">',
                content.join(''),
                '</svg>'
            ].join('');

            return html;
        },

        buildOpacitySection: function(){
            var flags = ['opacity', 'fillOpacity', 'weight'],
                selected = '',
                content = [],
                max = 0,
                step = 0,
                caps = '';

            for(var f in flags){
                if(flags[f] === 'weight'){
                    max = 10;
                    step = 1;
                } else {
                    max = 1.0;
                    step = 0.1;
                }
                content.push('<span class="section-header">'+this.capString(flags[f])+'</span>');
                content.push('<div class="section-body">');
                content.push(' <div><input value="'+this.options[flags[f]]+'" type="range" min="0" max="'+max+'" step="'+step+'" class="clickable" flag="'+flags[f]+'"></div>');
                content.push('</div>');
            }

            return content.join('');
        },

        isElement: function(obj) {
            try {
                return obj instanceof HTMLElement;
            }
            catch(e){
                return (typeof obj==="object") &&
                    (obj.nodeType===1) && (typeof obj.style === "object") && (typeof obj.ownerDocument === "object");
            }
        },

        capString: function(str){
            if(str.substring && str.length){
                str = str.substring(0, 1).toUpperCase() + str.substring(1);
            }
            return str;
        }
    });

})();
