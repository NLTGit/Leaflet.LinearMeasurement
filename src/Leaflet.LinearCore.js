(function(){

  L.Control.LinearCore = L.Control.extend({

      options: {
          position: 'topleft',
          color: '#4D90FE',
          contrastingColor: '#fff',
          type: 'node' // node, line, polyline, polygon
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

          function contrastingColor(color){
              return (luma(color) >= 165) ? '000' : 'fff';
          }

          function luma(color){
              var rgb = (typeof color === 'string') ? hexToRGBArray(color) : color;
              return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]); // SMPTE C, Rec. 709 weightings
          }

          function hexToRGBArray(color){
              if (color.length === 3)
                  color = color.charAt(0) + color.charAt(0) + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2);
              else if (color.length !== 6)
                  throw('Invalid hex color: ' + color);
              var rgb = [];
              for (var i = 0; i <= 2; i++)
                  rgb[i] = parseInt(color.substr(i * 2, 2), 16);
              return rgb;
          }

          if(this.options.color && this.options.color.indexOf('#') === -1){
              this.options.color = '#' + this.options.color;

          } else if(!this.options.color){
              this.options.color = '#4D90FE';

          }

          var originalColor = this.options.color.replace('#', '');

          this.options.contrastingColor = '#'+contrastingColor(originalColor);

          this.onAdded();

          return container;
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
              cap = features[i].charAt(0).toUpperCase() + features[i].slice(1);
              this[features[i]] = L.DomUtil.create('a', 'icon-'+features[i], container);
              this.toggleFeature(this[features[i]], this['enable'+cap], this['disable'+cap], features[i]);
              this[features[i]].href = '#';
              this[features[i]].title = '';
          }
      },

      initRuler: function(container){
          var map = this._map;

          this.features = this.options.features || ['node', 'line', 'polygon', 'drag', 'rotate', 'nodedrag', 'ruler'];

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

          this.resetRuler();
      },

      initLayer: function(){
          this.layer = L.featureGroup();
          this.layer.addTo(this.mainLayer);
          this.layer.on('selected', this.onSelect);

          this.layer.on('click', this.getMouseClickHandler, this);
          this._map.on('mousemove', this.getMouseMoveHandler, this);
      },

      resetRuler: function(resetLayer){
          var map = this._map;

          if(resetLayer){
              map.off('click', this.clickEventFn, this);
              map.off('mousemove', this.moveEventFn, this);
              map.off('dblclick', this.dblClickEventFn, map);

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

      renderCircle: function(latLng, radius, layer, type, label) {
          var color = this.options.color,
              lineColor = this.options.color;

          type = type || 'circle';

          linesHTML = [];

          var options = {
              color: lineColor,
              fillOpacity: 1,
              opacity: 1,
              fill: true,
              type: type,
              label: label
          };

          this.onRenderNode(latLng, options);

          var circle = L.circleMarker(latLng, options);

          circle.setRadius(3);
          circle.addTo(layer);

          return circle;
      },

      renderPolyline: function(latLngs, dashArray, layer) {
          var poly = L.polyline(latLngs, {
              color: this.options.color,
              weight: 2,
              opacity: 1,
              dashArray: dashArray
          });

          poly.addTo(layer);

          return poly;
      },

      renderMultiPolyline: function(latLngs, dashArray, layer) {
          /* Leaflet version 1+ delegated the concept of multi-poly-line to the polyline */
          var multi;

          if(this.options.type === 'polygon'){
              multi = L.polygon(latLngs, {
                  color: this.options.color,
                  weight: 2,
                  opacity: 1,
                  dashArray: dashArray
              });
          } else {
              if(L.version.startsWith('0')){
                  multi = L.multiPolyline(latLngs, {
                      color: this.options.color,
                      weight: 2,
                      opacity: 1,
                      dashArray: dashArray
                  });
              } else {
                  multi = L.polyline(latLngs, {
                      color: this.options.color,
                      weight: 2,
                      opacity: 1,
                      dashArray: dashArray
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
          var me = this,
              target = e.originalEvent.target;

          L.DomEvent.stop(e);

          if(me.nodedragEnable || me.dragEnable || me.rotateEnable){
              return;
          }

          if(this.pid){

              clearTimeout(this.pid);

              if(this.layer){
                  if(!this.multi){
                      this.multi = me.renderMultiPolyline(me.nodes, '5 5', me.layer, 'dot');
                  }
                  this.renderCircle(e.latlng, 0, this.layer, 'dot', '');
                  this.getMouseDblClickHandler(e);
              }

              this.pid = 0;

          } else {
              this._map.off('mousemove', this.getMouseMoveHandler, this);

              this.pid = setTimeout(function(){
                  me.pid = 0;

                  if(me.hasClass(target, ['leaflet-popup', 'total-popup-content'])){
                      return;
                  }

                  if(!me.layer || me.options.type === 'node'){
                      me.initLayer();
                  }

                  me.doRenderNode(e);

                  me._map.on('mousemove', me.getMouseMoveHandler, me);

              }, 200);
          }
      },

      doRenderNode: function(e, skipNode){
          var latlng = e.latlng,
              me = this;

          if(!me.originalLatLng){
              me.originalLatLng = latlng;
          }

          me.prevLatlng = latlng;

          me.nodes.push(latlng);

          me.onClick(e);

          if(me.poly){
              me.latlngsList.push(me.latlngs);

              if(!me.multi){
                  me.multi = me.renderMultiPolyline(me.nodes, '5 5', me.layer, 'node');
              } else {
                  me.multi.setLatLngs(me.nodes);
              }
          }

          if(!skipNode){
              me.renderCircle(latlng, 0, me.layer, 'node', '');
          }
      },

      getMouseMoveHandler: function(e){
          if(this.prevLatlng && this.options.shape > 1 && !this.nodeEnable){
              this.latlngs = [this.prevLatlng, e.latlng];

              if(!this.poly){
                  this.poly = this.renderPolyline(this.latlngs, '5 5', this.layer);
              } else {
                  this.poly.setLatLngs(this.latlngs);
              }

              this.onDraw(e);
          }
      },

      getMouseDblClickHandler: function(e){
          var me = this;

          if(this.options.shape > 1){
              this.doRenderNode(e, true);
              this.onDblClick(e);
          }

          me.enableShapeDrag(me.layer);
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

      enableShapeDrag: function(layer){
          var me = this,
              map = this._map,
              m = this.multi,
              i = null,
              total = this.total,
              nodes = this.nodes,
              onodes = [];

          onodes = me.fillOnodes(layer);
          me.zeroNodes(nodes, onodes);

          m.on('mousedown', function(e){
              if(!me.dragging && me.dragEnable){
                  me._map.dragging.disable();
                  m.drag = true;
                  me.dragging = true;
                  i = e.latlng;
              }
          });

          map.on('mousemove', function(e){
              if(me.dragging && me.dragEnable && m.drag){
                  d = e.latlng;

                  for(var o in onodes){
                      me.setNodePosition(onodes[o], i, d);
                  }

                  if(total){
                    total.setLatLng(nodes[nodes.length-1]);
                  }

                  m.setLatLngs(nodes);
              }
          });

          map.on('mouseup', function(e){
              if(me.dragging && me.dragEnable && m.drag){
                m.drag = false;
                me._map.dragging.enable();
                me.dragging = false;
                me.zeroNodes(nodes, onodes);
              }
          });

          this.enableShapeNodeDrag(layer);
      },

      enableShapeNodeDrag: function(layer){
          var me = this,
              multi = me.multi,
              map = this._map,
              nodes = this.nodes,
              total = this.total,
              onodes = [];

          layer.eachLayer(function(m){
              var original = m.getLatLng ? m.getLatLng() : null,
                  node, pos_i, dxi, dyi,
                  centroid = null,
                  i = null;

              for(var j in nodes){
                  if(nodes[j].equals(original)){
                      m.i = j;
                      nodes[j].node = m;
                      node = nodes[j];
                      break;
                  }
              }

              onodes = me.fillOnodes(layer);
              me.zeroNodes(nodes, onodes);

              m.on('mousedown', function(e){
                  if(me.rotateEnable || me.nodedragEnable){
                      map.dragging.disable();
                      me.dragging = true;
                      centroid = me._map.latLngToContainerPoint(multi.getCenter());

                      i = e.latlng;

                      pos_i = map.latLngToContainerPoint(i);
                      dxi = pos_i.x - centroid.x;
                      dyi = pos_i.y - centroid.y;

                      m.nodedrag = true;
                  }
              });

              map.on('mousemove', function(e){
                  if(m.nodedrag){
                      var d = e.latlng,
                          delta = 0;

                      if(me.nodedragEnable){
                          /*m.setLatLng(d);
                          nodes[m.i].lat = d.lat;
                          nodes[m.i].lng = d.lng;
                          multi.setLatLngs(nodes);*/

                      } else if(me.rotateEnable){
                          delta = me.getRotationAngleDelta(d, i, centroid, dxi, dyi);

                          for(var o in onodes){
                              me.rotateNode(onodes[o], centroid, delta);
                          }

                          if(total){
                            total.setLatLng(nodes[nodes.length-1]);
                          }

                          multi.setLatLngs(nodes);
                      }
                  }
              });

              map.on('mouseup', function(e){
                  if(m.nodedrag){
                      m.nodedrag = false;
                      map.dragging.enable();
                      i = e.latlng;
                      me.zeroNodes(nodes, onodes);
                      me.dragging = false;
                  }
              });
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

      setNodePosition: function(node, i, d){
          var dx, dy;

          var pos = this._map.latLngToContainerPoint(i),
              delta_pos = this._map.latLngToContainerPoint(d),
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

          i = new_node;
      },

      reset: function(e){
          //this.layer.off('click');
          this.layer.off('dblclick');

          L.DomEvent.stop(e);

          this.layer.removeLayer(this.poly);

          this.resetRuler(false);
      },

      onRenderNode: function(latLng, options){},

      onDraw: function(e){},

      onClick: function(e){},

      onDblClick: function(e){},

      onAdded: function(){},

      onSelect: function(e){},

      enableFeature: function(feature, isType, isFeature){
          if(feature != 'ruler'){
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
      }
  });

})();
