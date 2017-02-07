var Utils = {

    capString: function(str){
        if(str.substring && str.length){
            str = str.substring(0, 1).toUpperCase() + str.substring(1);
        }
        return str;
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

    beginClass: function(target, classes){
        if(target.className && classes && target.className.indexOf &&
          target.className.indexOf(classes) !== -1){
            return true;
        }
    },

    getIconLabelHtml: function(label, color){
        var html = [
          '<span style="color: '+color+';">'+label+'</span>'
        ].join('');

        return html;
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

    /* */

    setUpColor: function(){
        var included = false,
            pallette = this.options.pallette;

        if(pallette && pallette.include){
            included = pallette.includes(this.options.color);

            if(!included){
              if(this.options.color.indexOf('#') === -1){
                  this.options.color = '#' + this.options.color;
              }
            }

            included = pallette.includes(this.options.fillColor);

            if(!included){
              if(this.options.fillColor.indexOf('#') === -1){
                  this.options.fillColor = '#' + this.options.fillColor;
              }
            }
        }

        this.includeColor(this.options.color);
        this.includeColor(this.options.fillColor);
    },

    /* */

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
    }

};
