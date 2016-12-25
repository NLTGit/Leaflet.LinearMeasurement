(function(){

    L.Class.TrashFeature = L.Class.ControlFeature.extend({

        options: {
          name: 'trash'
        },

        onClick: function(e){
            var me = this;

            this.core.mainLayer.eachLayer(function(layer){
                me.core.mainLayer.removeLayer(layer);
            });

            this.core.purgeGeoJsons();

            this.core._map.fire('shape_changed');

            me.core.resetRuler();

            setTimeout(function(){
                me.disableFeature();
            }, 100);
        }

    });

})();
