(function(){

    L.Class.DragFeature = L.Class.ControlFeature.extend({

        options: {
          name: 'drag'
        },

        dx: 0,

        dy: 0,

        initialize: function (core) {
            L.Class.ControlFeature.prototype.initialize.call(this, core);

            var me = this;

            setTimeout(function(){
                me.reorderFeatures('drag', core);
            }, 1000);
        },

        enableFeature: function(){
            L.Class.ControlFeature.prototype.enableFeature.call(this);
            this.core._map.dragging.disable();

            if(this.core.napFeature){
              this.core.napFeature.disableFeature();
            }
            
            this.initialPreparation();
        },

        disableFeature: function(){
            L.Class.ControlFeature.prototype.disableFeature.call(this);
            this.core._map.dragging.enable();

            if(this.core.napFeature){
              this.core.napFeature.enableFeature();
            }

            this.cleanup();
        },

        onClick: function(e){
            if(L.DomUtil.hasClass(e.originalEvent.target, 'icon-drag')){
                return false;
            }
        },

        initialPreparation: function(){
            var me = this,
                map = this.core._map;

            /* Dragging shape when fill line is present in polygon */

            var fn = function(l, e, layer){
                var fn1 = function(e){
                  me.selectedLayer = layer;
                };

                if(l.options.type === 'line' || l.options.type === 'polygon'){
                    l.fn = fn1;
                    l.on('mousedown', fn1, me);
                }
            };

            this.checkSorroundings({}, fn);


            map.on('mousedown', this.mapStartDrag, this);

            map.on('mousemove', this.mapDrag, this);

            map.on('mouseout', this.mapStopDrag, this);

            map.on('mouseup', this.mapStopDrag, this);
        },

        cleanup: function(){
            var me = this,
                map = this.core._map;

            var fn = function(l, e, layer){
                if(l.options.type === 'line' || l.options.type === 'polygon'){
                    l.off('mousedown', l.fn, me);
                }
            };

            this.checkSorroundings({}, fn);

            map.off('mousedown', this.mapStartDrag, this);

            map.off('mousemove', this.mapDrag, this);

            map.off('mouseout', this.mapDrag, this);

            map.off('mouseup', this.mapDrag, this);
        },

        mapStartDrag: function(e){
            var me = this;

            this.startDragging(e);

            if(!this.selectedLayer && !this.selectedNode && e.originalEvent.target.nodeName !== 'path'){
              me.mapDragging = true;
            }
        },

        mapDrag: function(e){
            var me = this, pos, dragPower = 7, map = me.core._map;

            if(me.mapDragging){
              pos = map.latLngToContainerPoint(map.getCenter());
              pos.x -= e.originalEvent.movementX * dragPower;
              pos.y -= e.originalEvent.movementY * dragPower;
              map.setView(map.containerPointToLatLng(pos));

            } else {
              if(this.selectedLayer || this.selectedNode){
                this.dragLayer(e);
              }
            }
        },

        mapStopDrag: function(e){
            this.stopDragging();
            this.mapDragging = false;
        },

        startDragging: function(e){
            var me = this, latlngs;

            var fn = function(l, e, layer){

                /* Supporting node drag */

                if(l.options.type === 'node'){
                    if(l.getLatLng().equals(e.latlng, 0.003)){
                        me.selectedNode = l;
                        return;
                    }

                /* Dragging near the line */

                } else if(l.getLatLngs){
                    latlngs = l.getLatLngs();

                    if(l.options.type === 'polygon'){
                        latlngs = latlngs[0];
                    }

                    var segments = me.getSegments(latlngs),
                        point, latlng,
                        p = me.core._map.latLngToContainerPoint(e.latlng);

                    for(var s in segments){
                        point = L.LineUtil.closestPointOnSegment(p, segments[s][0], segments[s][1]);
                        latlng = me.core._map.containerPointToLatLng(point);

                        if(latlng.equals(e.latlng, 0.003)){
                            me.selectedLayer = layer;
                            return;
                        }
                    }
                }
            };

            this.checkSorroundings(e, fn);
        },

        getSegments: function(latlngs){
            var segments = [], prev, next;

            for(var l in latlngs){
                next = this.core._map.latLngToContainerPoint(latlngs[l]);

                if(prev){
                  segments.push([prev, next]);
                }

                prev = next;
            }

            return segments;
        },

        stopDragging: function(e){
            var me = this;
            this.selectedNode = null;
            this.selectedLayer = null;
            this.core._map.off('mousemove', this.dragLayer, this);
            this.core._map.off('mouseup', this.stopDragging, this);
        },

        dragLayer: function(e){
            var me = this;

            this.dx = e.originalEvent.movementX;
            this.dy = e.originalEvent.movementY;

            if(this.selectedNode && this.selectedNode.options.type === 'node'){

                var original = this.selectedNode.getLatLng();

                this.selectedNode.setLatLng(e.latlng);

                this.findNodeLines(original, e.latlng);

            } else if(this.selectedLayer){
                var me = this;

                var transformation = new L.Transformation(this.dx, 1, this.dy, 1);

                var layer = this.selectedLayer;

                layer.eachLayer(function(l){
                    if(l.options.type === 'line' || l.options.type === 'polygon'){
                        var latlngs = l.getLatLngs(),
                            pos;

                        if(l.options.type === 'polygon'){
                            latlngs = latlngs[0];
                        }

                        for(var i in latlngs){
                            pos = me.core._map.latLngToContainerPoint(latlngs[i]);
                            pos.x += me.dx;
                            pos.y += me.dy;

                            latlngs[i] = me.core._map.containerPointToLatLng(pos);
                        }

                        l.setLatLngs(latlngs);
                    } else if(l.getLatLng){
                        pos = me.core._map.latLngToContainerPoint(l.getLatLng());
                        pos.x += me.dx;
                        pos.y += me.dy;

                        l.setLatLng(me.core._map.containerPointToLatLng(pos));
                    }
                });
            }
        },

        findNodeLines: function(latlng, newLatLng){
            var me = this;

            var fn = function(l, latlng, layer){
                var latlngs = [], last;

                if(l.options.type === 'line' || l.options.type === 'polygon'){
                    latlngs = l.getLatLngs();

                    if(l.options.type === 'polygon'){
                        latlngs = latlngs[0];
                    }

                    for(var i in latlngs){
                      if(latlngs[i].equals(latlng)){
                          latlngs[i].lat = newLatLng.lat;
                          latlngs[i].lng = newLatLng.lng;
                          break;
                      }
                    }

                    l.setLatLngs(latlngs);

                    if(l.options.stype === 'ruler'){

                        me.core.rulerFeature.layer = layer;
                        me.core.rulerFeature.latlngs = latlngs;
                        me.core.rulerFeature.clearAll(layer);
                        me.core.rulerFeature.drawRulerLines(layer, null);
                        me.core.rulerFeature.layer = null;
                        me.core.rulerFeature.latlngs = null;

                    } else {
                        me.core.lineFeature.clearAll(layer);
                    }

                    last = latlngs[latlngs.length - 1];

                    me.core.labelFeature.drawTooltip(last, layer, layer.options.title);
                }

            };

            this.checkSorroundings(latlng, fn);
        },

        checkSorroundings: function(e, fn){
            var me = this,
                layer = this.core.mainLayer;

            if(layer){
                layer.eachLayer(function(l){
                    me.checkLayerGroup(l, e, fn);
                });
            }
        },

        checkLayerGroup: function(layer, e, fn){
            layer.eachLayer(function(l){
                if(fn){
                  fn(l, e, layer);
                }
            });
        }

    });

})();
