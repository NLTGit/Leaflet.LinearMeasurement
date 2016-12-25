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
              me.reorderFeatures(core);
            }, 1000);
        },

        reorderFeatures: function(core){
            /* nap feature ensures it runs the first by placing it at the top of
               the feature chain */

            for(var i in core.featureList){

                if(core.featureList[i].options.name === 'nap'){

                  core.featureList.splice(parseInt(i), 1);

                  core.featureList.unshift(this);

                  break;
                }

            };
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
