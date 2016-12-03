var Features = {

  options: {
    features: ['node', 'line', 'polygon', 'ruler', 'paint', 'drag', 'rotate', 'nodedrag', 'trash']
  },

  enableNode: function(){
      this.enableFeature('node', true);
      this.disableFeature('drag');
      this.disableFeature('rotate');
      this.disableFeature('nodedrag');
      this.disableFeature('ruler');
  },

  disableNode: function(){
      this.disableFeature('node');
  },

  enableLine: function(){
      this.enableFeature('line', true);
  },

  disableLine: function(){
      this.disableFeature('line');
  },

  enablePolygon: function(){
      this.enableFeature('polygon', true);
  },

  disablePolygon: function(){
      this.disableFeature('polygon');
  },

  enableDrag: function(){
      this.enableFeature('drag', false, true);
      this.disableFeature('nodedrag');
      this.disableFeature('rotate');
  },

  disableDrag: function(){
      this.disableFeature('drag');
  },

  enableRotate: function(){
      this.enableFeature('rotate', false, true);
      this.disableFeature('nodedrag');
      this.disableFeature('drag');
  },

  disableRotate: function(){
      this.disableFeature('rotate');
  },

  enableNodedrag: function(){
      this.enableFeature('nodedrag', false, true);
      this.disableFeature('rotate');
      this.disableFeature('drag');
  },

  disableNodedrag: function(){
      this.disableFeature('nodedrag');
  },

  enableRuler: function(){
      this.enableFeature('ruler', true);
  },

  disableRuler: function(){
      this.disableFeature('ruler');
  },

  enableTrash: function(){
      var me = this;

      this.enableFeature('trash', false, false);

      this.mainLayer.eachLayer(function(layer){
          me.mainLayer.removeLayer(layer);
      });

      this.purgeGeoJsons();

      this._map.fire('shape_changed');

      me.resetRuler();

      setTimeout(function(){
          me.disableFeature('trash');
      }, 100);
  },

  disableTrash: function(){
      this.disableFeature('trash');
  },

  drawTooltip: function(latlng, multi, layer){
      var latLngs = multi ? multi.getLatLngs() : [];
      var sum = 0, prev, o;

      sum = this.getStaticSum(latLngs);

      if(latlng.length){
        latlng = latlng[latlng.length-1];
      }

      /* Distance in miles/meters */
      if(this.prevLatlng){
          this.distance = parseFloat(this.prevLatlng.distanceTo(latlng))/this.UNIT_CONV;
      } else {
          this.distance = 0;
      }

      /* scalar and unit */
      this.measure = this.formatDistance(this.distance + sum, 2);

      if(layer.options.complete){
        this.onDblClick({ latlng: latlng }, layer, true);
      } else {
        /* tooltip with total distance */
        var label = this.measure.scalar + ' ' + this.measure.unit;

        if(!this.rulerEnable || (layer.options.complete && layer.options.simple)){
          label = layer.options.title;
        }

        var color = this.options.color;

        var html = this.getIconHtml(label, color);

        layer.totalIcon = L.divIcon({ className: 'total-popup', html: html });

        layer.total = L.marker(latlng, {
            icon: layer.totalIcon,
            clickable: true,
            total: true,
            type: 'tmp'
        }).addTo(layer);
      }
  }

};
