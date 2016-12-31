(function(){

  /*
      The parent class for abstract features (like nap, storage, etc..),
      as well as the control features.
  */

    L.Class.Feature = L.Class.extend({

      statics: {

      },

      includes: [Utils],

      initialize: function (core) {
        this.options.color = core.options.color;
        this.core = core;
        this._map = core._map;
      },

      destroy: function(){

      },

      isEnabled: function(){
        var feature = this.options.name;
        return this[feature+'Enable'];
      },

      enableFeature: function(){
        var feature = this.options.name;

        this[feature+'Enable'] = true;
      },

      disableFeature: function(){
        var feature = this.options.name;

        this[feature+'Enable'] = false;
      },

      resetFeature: function(){
      },

      onClick: function(e){
          /* The layer should exist before trying to render a node in it */

          if(!this.core.layer){
              this.core.initLayer();
          }

      },

      reorderFeatures: function(feature, core){
          /* nap feature ensures it runs the first by placing it at the top of
             the feature chain */

          for(var i in core.featureList){

              if(core.featureList[i].options.name === feature){

                core.featureList.splice(parseInt(i), 1);

                core.featureList.unshift(this);

                break;
              }

          };
      },

      onDblClick: function(e){

      },

      onMove: function(e){

      },

      onDraw: function(e, multi, layer, poly){

      },

      onRedraw: function(layer, multi, poly){

      },

      onRenderNode: function(latLng, options, layer){

      },

      onSelect: function(e){

      }

    });

})();


/*
    This subclass is the parent of feature controls that expose it's activation state
    visually through an button or any other graphical representation
*/

(function(){

    L.Class.ControlFeature = L.Class.Feature.extend({

        options: {
            type: 'control'
        },

        initialize: function (core) {
          L.Class.Feature.prototype.initialize.call(this, core);

          var me = this,
              feature = this.options.name,
              inactiveFn = this.disableFeature,
              activeFn = this.enableFeature,
              cap = this.capString(feature);

          this.control = L.DomUtil.create('a', 'icon-'+feature, core.container);

          this.control.href = '#';

          this.control.title = '';

          this._map = core._map;

          L.DomEvent.on(this.control, 'click', function(){
              if(me[feature+'Enable']){
                  inactiveFn.call(me);
              } else {
                  activeFn.call(me);
              }
          });
        },

        destroy: function(){
            L.DomUtil.remove(this.control);
        },

        isEnabled: function(){
          var feature = this.options.name;
          return this[feature+'Enable'];
        },

        resetOtherControlFeatures: function(){
          var list = this.core.featureList;

          for(var l in list){
            if(list[l].options.type === 'control'){
              list[l].disableFeature();
            }
          }
        },

        enableFeature: function(){
          this.resetOtherControlFeatures();
          L.Class.Feature.prototype.enableFeature.call(this);
          L.DomUtil.addClass(this.control, 'sub-icon-active');
        },

        disableFeature: function(){
          L.Class.Feature.prototype.disableFeature.call(this);
          L.DomUtil.removeClass(this.control, 'sub-icon-active');
        },

        onClick: function(e){
            this.core.layer.options.type = this.options.name;
            this.core.layer.options.title = 'Untitled';
            this.core.layer.options.description = '...';

            this.core.selectedLayer = this.core.layer;

            L.Class.Feature.prototype.onClick.call(this, e);

            var me = this,
                target = e.originalEvent.target;

            var node = e.originalEvent.target;

            if(this.beginClass(node, ['icon-'])){
                return false;
            } else if(this.hasClass(node, ['close'])){
                return false;
            } else if(this.hasClass(node, ['tip-layer'])){
                return false;
            } else if(this.hasClass(node, ['tip-input'])){
                return false;
            } else if(this.hasClass(target, ['leaflet-popup', 'total-popup-content'])){
                return false;
            }

            return true;
        }

    });

})();
