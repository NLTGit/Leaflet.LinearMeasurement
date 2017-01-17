(function(){

    L.Class.StyleFeature = L.Class.ControlFeature.extend({

        options: {
          name: 'style',
          pallette: ['#FF0080', '#4D90FE', 'red', 'blue', 'green', 'orange', 'black'],
          dashArrayOptions: ['5, 5', '5, 10', '10, 5', '5, 1', '1, 5', '0.9', '15, 10, 5', '15, 10, 5, 10', '15, 10, 5, 10, 15', '5, 5, 1, 5']
        },

        enableFeature: function(){
          L.Class.ControlFeature.prototype.enableFeature.call(this);
          this.core._map.dragging.disable();
          this.buildPaintPane();
        },

        disableFeature: function(){
          L.Class.ControlFeature.prototype.disableFeature.call(this);
          this.core._map.dragging.enable();
          this.disablePaint();
        },

        enablePaint: function(){
            if(this.paintPane){
                L.DomUtil.removeClass(this.paintPane, 'hidden-el');
            } else {
                this.buildPaintPane();
            }
        },

        disablePaint: function(){
            this.dx = 0;

            this.dy = 0;

            this.core._map.off('mousemove', this.headerMouseMove, this);

            this.core._map.off('mouseup', this.headerMouseStop, this);

            this.core._map.off('mouseout', this.headerMouseStop, this);

            if(this.paintPane){
                L.DomUtil.addClass(this.paintPane, 'hidden-el');
            }
        },

        destroy: function(){
            this.disableFeature();
            L.Class.ControlFeature.prototype.destroy.call(this);
        },

        onPaintChange: function(option){
            this.affectSelectedLayer(option);
        },

        affectSelectedLayer: function(option){
            var me = this,
                layer = this.core.selectedLayer,
                options = { };

            if(layer){
                this.core.layer = layer;

                options[option] = me.core.options[option];

                if(layer.setStyle){
                    layer.setStyle(options);
                }

                me.core.repaintGeoJson(layer);
            }
        },

        headerMouseMove: function(e){
            if(this.hdragging){
              this.dx += e.originalEvent.movementX;
              this.dy += e.originalEvent.movementY;
              L.DomUtil.setPosition(this.paintPane, { x: this.dx, y: this.dy });
            }
        },

        headerMouseStop: function(e){
            this.hdragging = false;
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

        idealTextColor: function(bgColor) {
           var nThreshold = 105,
               components = this.getRGBComponents(bgColor),
               bgDelta = (components.R * 0.299) + (components.G * 0.587) + (components.B * 0.114);

           return ((255 - bgDelta) < nThreshold) ? "#000000" : "#ffffff";
        },

        getRGBComponents: function(color) {
            var r = color.substring(1, 3),
                g = color.substring(3, 5),
                b = color.substring(5, 7);

            return {
               R: parseInt(r, 16),
               G: parseInt(g, 16),
               B: parseInt(b, 16)
            };
        },

        buildPaintPane: function(){
            var me = this,
                map = this.core._map.getContainer();

            this.paintPane = L.DomUtil.create('div', 'paint-pane', map);

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
                        me.core.options.color = color;
                        me.onPaintChange('color');
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
                        me.core.options.fillColor = color;
                        me.onPaintChange('fillColor');
                    }
                });
            });

            this.buildPaneSection('flags', function(){
                me.paintFlags.addEventListener('click', function(e){
                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        if(e.target.nodeName === 'INPUT'){
                            if(e.target.checked){
                                me.core.options[e.target.getAttribute('flag')] = true;
                                me.onPaintChange(e.target.getAttribute('flag'));

                            } else {
                                me.core.options[e.target.getAttribute('flag')] = false;
                                me.onPaintChange(e.target.getAttribute('flag'));
                            }
                        }
                    }
                });
            });

            this.buildPaneSection('dashArray', function(){
                me.paintDashArray.addEventListener('click', function(e){
                    L.DomEvent.stop(e);

                    if(L.DomUtil.hasClass(e.target, 'clickable')){
                        var parent = e.target.nodeName === 'svg' ? e.target : e.target.parentElement,
                            children = parent.childNodes;

                        var h = Math.round((e.offsetY-10) / 20);

                        for(var n in children){
                            if(me.isElement(children[n]) || children[n].nodeName){
                                L.DomUtil.removeClass(children[n], 'line-selected');
                            }
                        }

                        var target = children[h];

                        if(target){
                          L.DomUtil.addClass(children[h], 'line-selected');
                          me.core.options.dashArray = children[h].getAttribute('stroke-dasharray').replace(/,/g, '');
                          me.onPaintChange('dashArray');
                        }
                    }
                });
            });

            this.buildPaneSection('opacity', function(){
                me.paintOpacity.addEventListener('mousedown', function(e){
                    me.slidemove = true;
                });

                me.paintOpacity.addEventListener('mousemove', function(e){
                    if(me.slidemove){
                      me.moveSlider(e);
                    }
                });

                me.paintOpacity.addEventListener('mouseup', function(e){
                    me.slidemove = false;
                    me.moveSlider(e);
                });

                me.paintOpacity.addEventListener('click', function(e){
                    me.moveSlider(e);
                });
            });
        },

        moveSlider: function(e){
            var me = this;
            if(L.DomUtil.hasClass(e.target, 'clickable')){
                if(e.target.nodeName === 'INPUT'){
                    var v = e.target.value;
                        flag = e.target.getAttribute('flag');

                    me.core.options[flag] = v;

                    me.onPaintChange(flag);
                }
            }
        },

        buildPaneHeader: function(){
            var me = this;

            var header = [
                '<span>Styling Options</span>',
                '<svg class="close style-close" viewbox="0 0 45 35">',
                ' <path class="close" style="stroke:black" d="M 10,10 L 30,30 M 30,10 L 10,30" />',
                '</svg>'
            ].join('');

            this.paintPaneHeader = L.DomUtil.create('div', 'paint-pane-header', this.paintPane);
            this.paintPaneHeader.innerHTML = header;

            this.paintPaneHeader.addEventListener('click', function(e){
                L.DomEvent.stop(e);
                var tag = e.target.nodeName.toLowerCase();
                if(tag === 'svg' || tag === 'path'){
                    me.disableFeature();
                }
            });

            me.dx = 0;
            me.dy = 0;

            this.paintPaneHeader.addEventListener('mousedown', function(e){
                L.DomEvent.stop(e);
                me.hdragging = true;
            });

            this.core._map.on('mousemove', this.headerMouseMove, this);

            this.core._map.on('mouseup', this.headerMouseStop, this);

            this.core._map.on('mouseout', this.headerMouseStop, this);
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
            var colors = this.core.options.pallette,
                selected = '',
                content = [];

            for(var c in colors){
                selected = colors[c] === this.core.options.color ? 'paint-color-selected' : '';
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
            var colors = this.core.options.pallette,
                selected = '',
                content = [];

            for(var c in colors){
                selected = colors[c] === this.core.options.fillColor ? 'paint-color-selected' : '';
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
                selected = this.core.options[flags[f]] ? 'checked' : '';
                content.push('<div><input value="'+flags[f]+'" type="checkbox" '+selected+' class="clickable" flag="'+flags[f]+'" /> Draw ' + flags[f] + '</div>');
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
            var dashes = this.core.options.dashArrayOptions,
                selected = '',
                content = [],
                y = 0;

            for(var d in dashes){
                selected = this.core.options.dashArray === dashes[d] ? 'line-selected' : '';

                content.push('<option>');
                content.push(' <svg class="section-body clickable" width="100" height="20" viewPort="0 0 20 160" version="1.1" xmlns="http://www.w3.org/2000/svg">');
                content.push('  <line class="clickable pain-lines '+selected+'" stroke-dasharray="'+dashes[d]+'" x1="0" y1="'+y+'" x2="160" y2="'+y+'" />');
                content.push(' </svg>');
                content.push('</option>');
            }

            var html = [
                '<span class="section-header">Dash Array </span>',
                '<select style="width: 120px;">',
                  content.join(''),
                '</select>'
            ].join('');

            return html;
        },

        buildOpacitySection: function(){
            var flags = ['opacity', 'fill Opacity', 'weight'],
                selected = '',
                content = [],
                max = 0,
                step = 0,
                min = 0,
                caps = '',
                fg;

            for(var f in flags){

                if(flags[f] === 'weight'){
                    max = 10;
                    step = 1;
                    min = 1;
                } else {
                    max = 1.0;
                    step = 0.1;
                    min = 0.1;
                }

                content.push('<span class="section-header">'+this.capString(flags[f])+'</span>');

                fg = flags[f].replace(' ', '');

                content.push('<div class="section-body">');
                content.push(' <div><input value="'+this.core.options[fg]+'" type="range" min="0" max="'+max+'" step="'+step+'" class="clickable" flag="'+fg+'" /></div>');
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
        }

    });

})();
