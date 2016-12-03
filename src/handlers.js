var Handlers = {

  onRenderNode: function(latLng, options, layer){
      var label = options.label,
          type = options.type,
          color = this.options.color,
          p = this._map.latLngToContainerPoint(latLng);

      p_latLng = this._map.containerPointToLatLng(p);

      if(!label && type === 'node'){
          label = this.calculateSum();
      }

      if(label){
          var cicon = L.divIcon({
              className: 'total-popup-label',
              html: this.getIconLabelHtml(label, color)
          });

          var m = L.marker(p_latLng, { icon: cicon, type: type, label: label });

          options.icon = cicon;
          options.marker = m.addTo(layer);
          options.label = label;
      }
  },

  onClick: function(e){
      if(!this.rulerEnable) return;
      this.cleanUpMarkers(true, this.layer);
      this.fixedLast = this.last;
  },

  onDraw: function(e, multi, layer, poly){
      this.clearAll(layer);

      if(this.rulerEnable) {
        this.drawRulerLines(layer, multi, poly);
      }

      this.drawTooltip(e.latlng, multi, layer);
  },

  onRedraw: function(layer, multi, poly){
      this.clearAll(layer);

      if(this.rulerEnable || layer.measure) {
        this.drawRulerLines(layer, multi, poly);
      }

      var latlng,
          latlngs = multi.getLatLngs();

      if(latlngs.length){
          latlng = latlngs[latlngs.length-1];
      }

      this.drawTooltip(latlng, multi, layer);
  },

  onDblClick: function(e, layer, existing){
      var me = this;

      L.DomEvent.stop(e);

      var isRuler = existing ? !layer.options.simple : this.rulerEnable,
          workspace = layer,
          map = this._map,
          label = this.measure.scalar + ' ' + this.measure.unit + ' ',
          total_scalar = this.measure.unit === this.SUB_UNIT ? this.measure.scalar/this.UNIT_CONV : this.measure.scalar,
          color = this.options.color;

      if(!this.rulerEnable || (layer.options.complete && layer.options.simple)){
        label = layer.options.title;
      } else {
        layer.title = label;
      }

      layer.eachLayer(function(l){
        if(l.options.type !== 'fixed'){
          color = l.options.color;
          return;
        }
      });

      var html =  this.getIconHtml(label, color);

      if(this.rulerEnable && !layer.options.simple){
        layer.measure = this.measure;
        layer.separation = this.separation;
      } else {
        layer.options.simple = true;
      }

      workspace.removeLayer(layer.total);

      layer.totalIcon = L.divIcon({ className: 'total-popup', html: html });

      layer.total = L.marker(e.latlng, {
          icon: layer.totalIcon,
          clickable: true,
          total: true,
          type: 'tmp',
      }).addTo(layer);

      layer.options.complete = true;

      var total_label = layer.total,
          title = label === 'Untitled' ? '' : label;

      workspace.total = layer.total;

      var data = {
          latlng: e.latlng,
          total: this.measure,
          total_label: total_label,
          unit: this.UNIT_CONV,
          sub_unit: this.SUB_UNIT_CONV,
          workspace: workspace,
          rulerOn: isRuler
      };

      var fireSelected = function(e){
          if(me.dragging || !layer.total._icon){
            return;
          }

          L.DomEvent.stop(e);
          var map = me._map;

          me.selectedLayer = workspace;

          workspace.fireEvent('selected', data);

          if(e.originalEvent && L.DomUtil.hasClass(e.originalEvent.target, 'close')){
              map.fire('shape_delete', { id: workspace.options.id });
              map.fire('shape_changed');

          } else {
              var target_layer = e.target || layer;

              /* We don't want to edit measurement tool labels */

              if(!target_layer.options.simple || target_layer.measure) {
                return;
              }

              var label_field = '',
                  parent = layer.total._icon.children[0],
                  children = parent.children,
                  input;

              var fn1 = function(es){
                  L.DomUtil.addClass(input, 'hidden-el');
                  L.DomUtil.removeClass(label_field, 'hidden-el');

                  me.persistGeoJson(target_layer, true);

                  input.removeEventListener('blur', fn1);
                  input.removeEventListener('keyup', fn2);
              };

              var fn2 = function(es){
                  var v = input.value;
                  label_field.innerHTML = v || '&nbsp;';
                  target_layer.title = v || '';
                  title = v || '';

                  if(es.key === 'Enter'){
                    fn1();
                  } else {
                    label_field.innerHTML = input.value || '&nbsp;';
                    w = label_field.offsetWidth + 7;
                    input.style.width = w + 'px';
                  }
              };

              for(var n in children){
                  if(!children[n].nodeName) {
                    return;
                  }

                  if(L.DomUtil.hasClass(children[n], 'tip-layer')){
                      label_field = children[n];
                      L.DomUtil.addClass(label_field, 'hidden-el');

                  } else if(L.DomUtil.hasClass(children[n], 'tip-input')){
                      input = children[n];
                      input.value = title;
                      L.DomUtil.removeClass(input, 'hidden-el');
                      input.addEventListener('keyup', fn2);
                      input.addEventListener('blur', fn1);
                      input.focus();
                  }
              }

              var w = label_field.offsetWidth + 7;
              input.style.width = w + 'px';
          }
      };

      workspace.off('click');
      workspace.on('click', fireSelected);
      workspace.on('selected', this.onSelect);

      /* Only fire to auto-focus newly created path */

      if(!existing){
        workspace.fireEvent('click', fireSelected);
      }
  },

  onAdded: function(){},

  onSelect: function(e){},

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

      if(!this.nodeEnable && !this.lineEnable && !this.rulerEnable && !this.polygonEnable){
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

  getMouseMoveHandler: function(e){
      var me = this;

      if(this.prevLatlng && !this.nodeEnable){
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
              this.onDraw(e, this.multi, this.layer, this.poly);
          }

          this.onDraw(e, this.multi, this.layer, this.poly);
      }
  },

  getMouseDblClickHandler: function(e){
      var me = this,
          layer = this.layer,
          multi = this.multi;

      me.doRenderNode(e);

      me.onDblClick(e, layer);

      me.selectedLayer = me.layer;

      me.layer.type = me.options.type;

      me.enableShapeDrag(me.layer);

      me.persistGeoJson(me.layer);

      me.reset(e);
  }

};
