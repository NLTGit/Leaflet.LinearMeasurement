(function(){

    L.Class.PolyFeature = L.Class.LineFeature.extend({

        options: {
          name: 'polygon'
        },

        onClick: function(e){
            if(L.DomUtil.hasClass(e.originalEvent.target, 'icon-polygon')){
                return false;
            }

            return L.Class.LineFeature.prototype.onClick.call(this, e);
        },

        onDblClick: function(e){
          
            /* Complete the polygon */

            this.latlngs.push(this.latlngs[0]);

            this.poly.setLatLngs(this.latlngs);

            L.Class.LineFeature.prototype.onDblClick.call(this, e);
        }

    });

})();
