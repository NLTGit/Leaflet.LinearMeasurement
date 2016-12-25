(function(){

    L.Class.StyleFeature = L.Class.ControlFeature.extend({

        options: {
          name: 'paint',
          pallette: ['#FF0080', '#4D90FE', 'red', 'blue', 'green', 'orange', 'black'],
          dashArrayOptions: ['5, 5', '5, 10', '10, 5', '5, 1', '1, 5', '0.9', '15, 10, 5', '15, 10, 5, 10', '15, 10, 5, 10, 15', '5, 5, 1, 5']
        },

        onClick: function(e){

        },

        enableFeature: function(){
          L.Class.ControlFeature.prototype.enableFeature.call(this);
          this.buildPaintPane();
        },

        disableFeature: function(){
          L.Class.ControlFeature.prototype.disableFeature.call(this);
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
            if(this.paintPane){
                L.DomUtil.addClass(this.paintPane, 'hidden-el');
            }
        },

        onPaintChange: function(option){
          this.affectSelectedLayer(option);
        },

        affectSelectedLayer: function(option){
          var me = this,
              options = { };

          options[option] = me.core.options[option];

          if(this.core.selectedLayer){

            this.core.selectedLayer.eachLayer(function(layer){
                if(layer.setStyle){
                    layer.setStyle(options);

                } else {
                    var cicon = layer.options.icon,
                        color = options[option],
                        label = '';

                    if(layer.options.total && option === 'color'){
                        label = me.core.selectedLayer.title;

                        var html = me.getIconHtml(label, color);
                        L.setOptions(cicon, { html: html });
                        layer.setIcon(cicon);

                    } else if(layer.options.type === 'fixed' && option === 'color') {
                        label = layer.options.label;

                        var html = me.getIconLabelHtml(label, color);
                        L.setOptions(cicon, { html: html });
                        layer.setIcon(cicon);
                    }
                }
            });

            this.core.persistGeoJson(this.core.selectedLayer, this.core.selectedLayer.options.simple);
          }
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
                    L.DomEvent.stop(e);
                    me.slidemove = true;
                });

                me.paintOpacity.addEventListener('mousemove', function(e){
                    L.DomEvent.stop(e);
                    if(me.slidemove){
                      me.moveSlider(e);
                    }
                });

                me.paintOpacity.addEventListener('mouseup', function(e){
                    me.slidemove = false;
                    L.DomEvent.stop(e);
                    me.moveSlider(e);
                });

                me.paintOpacity.addEventListener('click', function(e){
                    L.DomEvent.stop(e);
                    me.moveSlider(e);
                });
            });
        },

        moveSlider: function(e){
            var me = this;
            if(L.DomUtil.hasClass(e.target, 'clickable')){
                if(e.target.nodeName === 'INPUT'){
                    var v = (e.offsetX / e.target.clientWidth);
                    if(e.target.getAttribute('step') == '1'){
                      v *= 10;
                    }
                    e.target.value = v;
                    me.core.options[e.target.getAttribute('flag')] = e.target.value;
                    me.onPaintChange(e.target.getAttribute('flag'));
                }
            }
        },

        buildPaneHeader: function(){
            var me = this;

            var header = [
                '<span>Styling Options</span><i class="close">x</i>'
            ].join('');

            this.paintPaneHeader = L.DomUtil.create('div', 'paint-pane-header', this.paintPane);
            this.paintPaneHeader.innerHTML = header;

            this.paintPaneHeader.addEventListener('click', function(e){
                L.DomEvent.stop(e);
                if(e.target.nodeName === 'I'){
                    me.disableFeature();
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
            var dashes = this.core.options.dashArrayOptions,
                selected = '',
                content = [],
                y = 10;

            for(var d in dashes){
                selected = this.core.options.dashArray === dashes[d] ? 'line-selected' : '';
                content.push('<line class="clickable pain-lines '+selected+'" stroke-dasharray="'+dashes[d]+'" x1="10" y1="'+y+'" x2="160" y2="'+y+'" />');
                y += 20;
            }

            var html = [
                '<span class="section-header">Dash Array</span>',
                '<svg class="section-body clickable" width="170" height="200" viewPort="0 0 200 160" version="1.1" xmlns="http://www.w3.org/2000/svg">',
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
                content.push(' <div><input value="'+this.core.options[flags[f]]+'" type="range" min="0" max="'+max+'" step="'+step+'" class="clickable" flag="'+flags[f]+'"></div>');
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
