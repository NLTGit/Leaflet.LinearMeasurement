var Rotation = {

    enableShapeDrag: function(layer){
        var me = this,
            map = this._map,
            m,
            i = null,
            total = layer.total,
            type = layer.options.type || 'line',
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

        if(!m){
            type = 'node';
        }

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
                me.persistGeoJson(layer, layer.options.simple);
            }
        }, layer);

        this.enableShapeNodeDrag(layer, m, nodes);
    },

    enableShapeNodeDrag: function(layer, multi, nodes){
        var me = this,
            map = this._map,
            total = layer.total,
            type = layer.options.type || 'line',
            selectedNode = null,
            nearLatLng,
            d, delta,
            nearings = [],
            onodes = [],
            anodes = [],
            pos;

        if(multi){
            multi.nodes = nodes;

        } else {
            type = 'node';
            layer.eachLayer(function(m){
                if(m.options.type === 'node'){
                    selectedNode = { node: m };
                    return;
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
                        selectedNode = me.getSelectedNode(e, onodes);
                    } else {
                        selectedNode = me.getSelectedNode(e, onodes);
                    }
                }

                layer.nodedrag = true;

                anodes = me.fillAllnodes(layer);
                pos = map.latLngToContainerPoint(e.latlng);
            }
        });

        map.on('mousemove', function(e){
            if(layer.nodedrag){
                d = e.latlng;
                delta = 0;

                if(type === 'node'){
                    for(var o in onodes){
                        me.setNodePosition(onodes[o], pos, d);
                    }
                    return;
                }

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

                    for(var oo in onodes){
                        me.rotateNode(onodes[oo], centroid, delta);
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
                me.persistGeoJson(layer, layer.options.simple);
            }
        });
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

    fillAllnodes: function(myLayer){
        var me = this, onodes = [];

        this.mainLayer.eachLayer(function(layer){
            me.searchForAllNodes(layer, myLayer, onodes);
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

    getNearestNode: function(e, onodes){
        for(var o in onodes){
            if(onodes[o].equals(e.latlng, 0.003)){
                return L.latLng(onodes[o]);
            }
        }
        return false;
    },

    getSelectedNode: function(e, onodes){
        for(var o in onodes){
            if(e.latlng.equals(onodes[o], 0.005)){
                return onodes[o];
            }
        }
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
    }

};
