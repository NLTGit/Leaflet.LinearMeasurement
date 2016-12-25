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

  getIconLabelHtml: function(label, color){
      var contrast = color === '#fff' ? 'black' : '#fff';

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
  }

};
