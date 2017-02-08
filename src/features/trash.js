(function(){

    L.Class.TrashFeature = L.Class.ControlFeature.extend({

        options: {
          name: 'trash'
        },

        enableFeature: function(){
          L.Class.ControlFeature.prototype.enableFeature.call(this);

          this.onClick();
        },

        onClick: function(e){
            var me = this;

            this.core.mainLayer.eachLayer(function(layer){
                me.core._map.fire('shape_delete', { id: layer.options.id });
            });

            this.core.purgeGeoJsons();

            me.core.resetRuler();

            setTimeout(function(){
                me.disableFeature();
            }, 200);
        }

    });

})();
