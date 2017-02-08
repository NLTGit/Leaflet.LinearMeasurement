(function(){

    L.Class.LabelFeature = L.Class.Feature.extend({

        options: {
          name: 'label'
        },

        initialize: function (core, map) {
            L.Class.Feature.prototype.initialize.call(this, core);
            this.enableFeature();
            this.map = map;
        },

        onClick: function(e, isNode){
            if(isNode){
              this.onDblClick(e);
            }
        },

        onDblClick: function(e){
            var layer = this.core.layer,
                label = layer.options.title,
                layerFound = false;

            layer.eachLayer(function(l){
              layerFound = true;
              return;
            });

            if(layerFound){
              this.drawTooltip(e.latlng, layer, label);
            }
        },

        drawTooltip: function(latlng, layer, label){
            layer.options.lastPoint = latlng;

            var color = this.core.options.color;

            layer.eachLayer(function(l){
              if(l.options.color && (l.options.type === 'line' || l.options.type === 'polygon')){
                color = l.options.color;
                return;
              }
            });

            var html = this.getIconHtml(label, color, layer);

            layer.totalIcon = L.divIcon({ className: 'total-popup', html: html });

            layer.total = L.marker(latlng, {
                icon: layer.totalIcon,
                clickable: true,
                total: true,
                type: 'label',
                sid: 'tooltip'
            }).addTo(layer);

            this.drawTooltipHandlers({ latlng : latlng }, layer, label);
        },

        getIconHtml: function(label, color, workspace){
            /* TODO: find a better solution for contrast based on background color */
            var mainLayer = this.core.mainLayer;

            var contrast = color === '#fff' ? 'black' : '#fff';

            var n = 0;

            if(workspace){
              mainLayer.eachLayer(function(workspace){
                workspace.eachLayer(function(layer){
                    if(layer.options.sid === 'tooltip'){
                      n+=15;
                    }
                });
              });
            }

            var html = [
                '<div class="total-popup-content" style="transform-origin: 0% 0%; transform: rotate('+n+'deg); background-color:'+color+'; color: '+contrast+';">',
                '  <input class="tip-input hidden-el" type="text" style="color: '+contrast+'" />',
                '  <div class="tip-layer">'+label+'</div>',
                '  <svg class="close" viewbox="0 0 45 35">',
                '   <path class="close" style="stroke:'+contrast+'" d="M 10,10 L 30,30 M 30,10 L 10,30" />',
                '  </svg>',
                '</div>'
            ].join('');

            return html;
        },

        drawTooltipHandlers: function(e, layer, label){
            var me = this,
                workspace = layer,
                title = label ? label : 'Untitled',
                isRuler = workspace.options.type === 'ruler',
                map = this.core._map;

            var disect = workspace.options.title.split(' ');

            var total = {
              scalar: disect[0],
              unit: disect[1]
            }

            /* Leaflet return distances in meters */
            this.SUB_UNIT_CONV = 1000;

            if(this.options.unitSystem === 'imperial'){
                this.SUB_UNIT_CONV = 5280;
            }

            var data = {
                latlng: e.latlng,
                total: total,
                total_label: workspace.total,
                sub_unit: this.SUB_UNIT_CONV,
                workspace: workspace,
                rulerOn: isRuler
            };

            var isDbl = function(e){
                var now = (new Date()).getTime(),
                    time = now - workspace.tik;

                workspace.tik = now;
                return time < 300;
            };

            var closeme = function(e){
                me.core.selectedLayer = workspace;

                var map = me.map;

                L.DomEvent.stop(e);

                if(isDbl(e)){
                    fireSelected();
                }

                if(e.originalEvent && L.DomUtil.hasClass(e.originalEvent.target, 'close')){
                    map.fire('shape_delete', { id: workspace.options.id });
                }
            };

            var fireSelected = function(e){
                /* We don't want to edit measurement tool labels */

                if(isRuler) {
                    workspace.fireEvent('selected', data);
                    return;
                }

                var map = me.map,
                    target_layer = workspace,
                    label_field = '',
                    parent = workspace.total._icon.children[0],
                    children = parent.children,
                    input;

                var fn1 = function(es){
                    L.DomUtil.addClass(input, 'hidden-el');
                    L.DomUtil.removeClass(label_field, 'hidden-el');

                    workspace.options.title = input.value;

                    me.core.persistGeoJson(workspace);

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
                      w = label_field.offsetWidth;
                      input.style.width = w + 'px';
                    }
                };

                for(var n in children){
                    if(!children[n].nodeName) {
                      break;
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

                var w = label_field.offsetWidth;

                input.style.width = w + 'px';
            };

            workspace.off('click');

            workspace.on('click', closeme);

            workspace.on('selected', this.core.onSelect);

            /* Only fire to auto-focus newly created path */

            if(workspace.is_new){

                this.core.persistGeoJson(workspace);

                fireSelected();
            }
        }


    });

})();
