(function(){

    L.Class.NapFeature = L.Class.Feature.extend({

        options: {
          name: 'nap'
        },

        initialize: function (core) {
            L.Class.Feature.prototype.initialize.call(this, core);
            this.enableFeature();

            var me = this;

            setTimeout(function(){
              me.reorderFeatures('nap', core);
            }, 1000);
        },

        onClick: function(e){
            this.checkSorroundings(e);
        },

        onMove: function(e){
            this.checkSorroundings(e);
        },

        checkSorroundings: function(e){
            var me = this,
                layer = this.core.mainLayer;

            layer.eachLayer(function(l){
                if(me.checkLayer(l, e)){
                  return;
                }
            });
        },

        checkLayer: function(layer, e){
            layer.eachLayer(function(l){

                /* Nap only in the proximity of a node */

                if(l.options.type === 'node' && l.getLatLng().equals(e.latlng, 0.003)){
                    e.latlng = l.getLatLng();
                    return true;
                }

            });
        }

    });

})();
