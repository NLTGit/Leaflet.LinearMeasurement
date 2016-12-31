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
            this.core._map.on('mousedown', this.startDragging, this);
            this.core._map.dragging.disable();
        },

        disableFeature: function(){
            L.Class.ControlFeature.prototype.disableFeature.call(this);
            this.core._map.off('mousedown', this.startDragging, this);
            this.core._map.dragging.enable();
        },

        onClick: function(e){
            if(L.DomUtil.hasClass(e.originalEvent.target, 'icon-drag')){
                return false;
            }
        },

        startDragging: function(e){
            this.core._map.dragging.disable();

            var me = this;

            var fn = function(l, e, layer){

                /* Supporting node drag */

                if(l.options.type === 'node'){
                    if(l.getLatLng().equals(e.latlng, 0.003)){
                        me.selectedNode = l;
                        return;
                    }

                /* Everything that is not a node will drag the whole shape */

              } else if(l.getLatLngs){
                    var segments = me.getSegments(l.getLatLngs()),
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

            this.core._map.on('mousemove', this.dragLayer, this);
            this.core._map.on('mouseup', this.stopDragging, this);
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

            console.log(segments);

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
                    if(l.options.type === 'line'){
                        var latlngs = l.getLatLngs(),
                            pos;

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
                var latlngs = [];

                if(l.options.type === 'line'){
                    latlngs = l.getLatLngs();

                    for(var i in latlngs){
                      if(latlngs[i].equals(latlng)){
                        latlngs[i] = newLatLng;
                        l.setLatLngs(latlngs);
                        break;
                      }
                    }

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

                    me.core.labelFeature.drawTooltip(latlngs[latlngs.length - 1], layer, layer.options.title);
                }


            };

            this.checkSorroundings(latlng, fn);
        },

        checkSorroundings: function(e, fn){
            var me = this,
                layer = this.core.mainLayer;

            layer.eachLayer(function(l){
                me.checkLayerGroup(l, e, fn);
            });
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
