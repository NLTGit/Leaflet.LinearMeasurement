(function(){

    L.Class.Feature = L.Class.extend({

      initialize: function (name, container) {
          var me = this,
              feature = this.options.name,
              inactiveFn = this.disableFeature,
              activeFn = this.enableFeature,
              cap = this.capString(feature);

          this.control = L.DomUtil.create('a', 'icon-'+feature, container);

          this.control.href = '#';

          this.control.title = '';

          L.DomEvent.on(this.control, 'click', function(){
              if(me[feature+'Enable']){
                  inactiveFn.call(me);
              } else {
                  activeFn.call(me);
              }
          });

          console.log(this.options.name, 'initialized');
      },

      destroy: function(){
          L.DomUtil.remove(this.control);

          console.log(this.options.name, 'destroyed');
      },

      options: {
        name: 'node'
      },

      statics: {

      },

      includes: [Utils],

      enableFeature: function(){
        var feature = this.options.name;

        this[feature+'Enable'] = true;
        L.DomUtil.addClass(this.control, 'sub-icon-active');

        console.log(feature, 'enabled');
      },

      disableFeature: function(){
        var feature = this.options.name;

        this[feature+'Enable'] = false;
        L.DomUtil.removeClass(this.control, 'sub-icon-active');

        console.log(this.options.name, 'disabled');
      },

      resetFeature: function(){
        
        console.log(this.options.name, 'reset');
      },

      onClick: function(e){

      },

      onDraw: function(e, multi, layer, poly){

      },

      onRedraw: function(layer, multi, poly){

      },

      onRenderNode: function(latLng, options, layer){

      },

      onSelect: function(e){

      },

    });

})();
