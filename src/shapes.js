var Shapes = {

  options: {
    color: '#4D90FE',
    fillColor: '#fff',
    fill: true,
    stroke: true,
    dashArray: '5, 5',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
    radius: 3
  },

  shapeInit: function(){
    var me = this,
        map = this._map;

    map.on('shape_toggle', function(data){
        var id = data.id,
            geo = me.getGeoJson(id),
            selected = me.getLayerById(id);

        geo.properties.hidden = data.hidden;
        me.updateGeoJson(geo);

        if(selected && data.hidden){
            me.mainLayer.removeLayer(selected);
        } else if(!data.hidden){
            me.plotGeoJsons(id);
        }
    });

    map.on('shape_delete', function(data){
        var id = data.id,
            selected = me.getLayerById(id);

        if(selected){
            me.mainLayer.removeLayer(selected);
            me.deleteGeoJson(id);
        }
    });

    map.on('shape_focus', function(data){
        var id = data.id,
            selected = me.getLayerById(id);

        if(selected){
            me.selectedLayer = selected;
            map.setView(selected.getBounds().getCenter());
        }
    });

    map.on('shape_update', function(data){
        var id = data.id,
            geo = me.getGeoJson(id),
            selected = me.getLayerById(id);

        me.mainLayer.removeLayer(selected);

        geo.properties.hidden = data.hidden;
        geo.properties.name = data.name;
        geo.properties.description = data.description;

        me.updateGeoJson(geo);

        if(!data.hidden){
            me.plotGeoJsons(id);
        }
    });
  },

  renderCircle: function(latLng, layer, type, label, skipLabel, config) {
      var color = this.options.color,
          r = 3;

      type = type || 'circle';

      if(type != 'node'){
          r = 1;
          color = 'blue';
      }

      var options = config || {
          color: color,
          opacity: this.options.opacity,
          fillOpacity: this.options.fillOpacity,
          weight: this.options.weight,
          fill: this.options.fill,
          fillColor: this.options.fillColor,
          type: type,
          label: label
      };

      if(!skipLabel){
          this.onRenderNode(latLng, options, layer);
      }

      var circle = L.circleMarker(latLng, options);

      circle.setRadius(r);

      if(layer) {
          circle.addTo(layer);
      }

      return circle;
  },

  renderPolyline: function(latLngs, layer) {
      var poly = L.polyline(latLngs, {
          color: this.options.color,
          fill: this.options.fill,
          fillColor: this.options.fillColor,
          stroke: this.options.stroke,
          opacity: this.options.opacity,
          fillOpacity: this.options.fillOpacity,
          weight: this.options.weight,
          dashArray: this.options.dashArray
      });

      poly.addTo(layer);

      return poly;
  },

  renderMultiPolyline: function(latLngs, layer) {
      /* Leaflet version 1+ delegated the concept of multi-poly-line to the polyline */
      var multi;

      if(this.options.type === 'polygon'){
          multi = L.polygon(latLngs, {
              color: this.options.color,
              fill: this.options.fill,
              fillColor: this.options.fillColor,
              stroke: this.options.stroke,
              opacity: this.options.opacity,
              fillOpacity: this.options.fillOpacity,
              weight: this.options.weight,
              dashArray: this.options.dashArray
          });
      } else {
          if(L.version.startsWith('0')){
              multi = L.multiPolyline(latLngs, {
                  color: this.options.color,
                  fill: this.options.fill,
                  fillColor: this.options.fillColor,
                  stroke: this.options.stroke,
                  opacity: this.options.opacity,
                  fillOpacity: this.options.fillOpacity,
                  weight: this.options.weight,
                  dashArray: this.options.dashArray
              });
          } else {
              multi = L.polyline(latLngs, {
                  color: this.options.color,
                  fill: this.options.fill,
                  fillColor: this.options.fillColor,
                  stroke: this.options.stroke,
                  opacity: this.options.opacity,
                  fillOpacity: this.options.fillOpacity,
                  weight: this.options.weight,
                  dashArray: this.options.dashArray
              });
          }
      }

      multi.addTo(layer);

      return multi;
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
