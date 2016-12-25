(function(){

    L.Class.LabelFeature = L.Class.Feature.extend({

        options: {
          name: 'paint'
        },

        initialize: function (core) {
            L.Class.Feature.prototype.initialize.call(this, core);
            this.enableFeature();
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

            var color = this.core.options.color,
                html = this.getIconHtml(label, color);

            layer.totalIcon = L.divIcon({ className: 'total-popup', html: html });

            layer.total = L.marker(latlng, {
                icon: layer.totalIcon,
                clickable: true,
                total: true,
                type: 'label'
            }).addTo(layer);

            this.drawTooltipHandlers({ latlng : latlng }, layer, label);
        },

        getIconHtml: function(label, color){
            /* TODO: find a better solution for contrast based on background color */

            var contrast = color === '#fff' ? 'black' : '#fff';

            var html = [
                '<div class="total-popup-content" style="background-color:'+color+'; color: '+contrast+';">',
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
                title = label ? label : 'Untitled'
                isRuler = label && (label.indexOf(' ft') !== -1 || label.indexOf(' mi') !== -1);

            var data = {
                latlng: e.latlng,
                total: this.measure,
                total_label: layer.total,
                unit: this.UNIT_CONV,
                sub_unit: this.SUB_UNIT_CONV,
                workspace: workspace,
                rulerOn: isRuler
            };

            var fireSelected = function(e){
                L.DomEvent.stop(e);

                var map = me.core._map;

                me.core.selectedLayer = workspace;

                workspace.fireEvent('selected', data);

                if(e.originalEvent && L.DomUtil.hasClass(e.originalEvent.target, 'close')){
                    map.fire('shape_delete', { id: workspace.options.id });
                    map.fire('shape_changed');

                } else {
                    var target_layer = e.target || layer;

                    /* We don't want to edit measurement tool labels */

                    if(isRuler) {
                      return;
                    }

                    var label_field = '',
                        parent = layer.total._icon.children[0],
                        children = parent.children,
                        input;

                    var fn1 = function(es){
                        L.DomUtil.addClass(input, 'hidden-el');
                        L.DomUtil.removeClass(label_field, 'hidden-el');

                        layer.options.title = input.value;

                        me.core.persistGeoJson(layer);

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

            /* TODO: Move this line */

            this.core.persistGeoJson(layer);

            workspace.off('click');
            workspace.on('click', fireSelected);
            workspace.on('selected', this.onSelect);

            /* Only fire to auto-focus newly created path */

            workspace.fireEvent('click', fireSelected);
        }


    });

})();
