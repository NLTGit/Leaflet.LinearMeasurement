var Handlers = {

  onAdded: function(){},

  onSelect: function(e){},

  onDblClick: function(e, layer, existing){
      var me = this,
          feature;

      for(var f in this.featureList){
          feature = this.featureList[f];
          if(feature.isEnabled()){
            feature.onDblClick(e);
          }
      }

      me.reset(e);
  },

  getMouseClickHandler: function(e){
      var isNode = false;

      if(!this.layer){
          this.initLayer();
      }

      L.DomEvent.stop(e);

      if(this.isDblClick()){

          this.onDblClick(e);

      } else {
          var feature;

          for(var f in this.featureList){
              feature = this.featureList[f];
              if(feature.isEnabled()){
                if(feature.options.name === 'node'){
                  isNode = true;
                }
                feature.onClick(e, isNode);
              }
          }
      }

      if(isNode){
        this.reset(e);
      }
  },

  getMouseMoveHandler: function(e){
      var feature;

      for(var f in this.featureList){
          feature = this.featureList[f];
          if(feature.isEnabled()){
            feature.onMove(e, this.layer);
          }
      }

  },

  isDblClick: function(){
      var now = (new Date()).getTime(),
          time = now - this.tik;

      this.tik = now;

      /* Condiering this speed as a double click instead */

      return time < this.options.doubleClickSpeed;
  },

  getMouseDblClickHandler: function(e){

  }

};
