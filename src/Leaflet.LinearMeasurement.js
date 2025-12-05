(function () {
  L.Control.LinearMeasurement = L.Control.extend({
    options: {
      position: "topleft",
      unitSystem: "imperial", // imperial | metric
      color: "#4D90FE",
      contrastingColor: "#fff",
      show_last_node: false,
      show_azimut: false,
    },

    clickSpeed: 200,

    onAdd: function (map) {
      var container = L.DomUtil.create("div", "leaflet-control leaflet-bar"),
        link = L.DomUtil.create("a", "icon-ruler", container),
        map_container = map.getContainer(),
        me = this;

      this._toggleLink = link;
      this._mapContainer = map_container;

      link.href = "#";
      link.title = "Toggle measurement tool";

      L.DomEvent.on(link, "click", L.DomEvent.stop).on(
        link,
        "click",
        function () {
          if (L.DomUtil.hasClass(link, "icon-active")) {
            me.resetRuler(!!me.mainLayer);
            me._setToggleState(false);
          } else {
            me.initRuler();
            me._setToggleState(true);
          }
        }
      );

      function contrastingColor(color) {
        return luma(color) >= 165 ? "000" : "fff";
      }

      function luma(color) {
        var rgb = typeof color === "string" ? hexToRGBArray(color) : color;
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; // SMPTE C, Rec. 709 weightings
      }

      function hexToRGBArray(color) {
        if (color.length === 3)
          color =
            color.charAt(0) +
            color.charAt(0) +
            color.charAt(1) +
            color.charAt(1) +
            color.charAt(2) +
            color.charAt(2);
        else if (color.length !== 6) throw "Invalid hex color: " + color;
        var rgb = [];
        for (var i = 0; i <= 2; i++)
          rgb[i] = parseInt(color.substr(i * 2, 2), 16);
        return rgb;
      }

      if (this.options.color && this.options.color.indexOf("#") === -1) {
        this.options.color = "#" + this.options.color;
      } else if (!this.options.color) {
        this.options.color = "#4D90FE";
      }

      var originalColor = this.options.color.replace("#", "");

      this.options.contrastingColor = "#" + contrastingColor(originalColor);

      return container;
    },

    onRemove: function (map) {
      this.resetRuler(!!this.mainLayer);
    },

    _setToggleState: function (active) {
      if (this._toggleLink) {
        if (active) {
          L.DomUtil.addClass(this._toggleLink, "icon-active");
        } else {
          L.DomUtil.removeClass(this._toggleLink, "icon-active");
        }
      }

      if (this._mapContainer) {
        if (active) {
          L.DomUtil.addClass(this._mapContainer, "ruler-map");
        } else {
          L.DomUtil.removeClass(this._mapContainer, "ruler-map");
        }
      }
    },

    initRuler: function () {
      var me = this,
        map = this._map;

      this.mainLayer = L.featureGroup();
      this.mainLayer.addTo(this._map);

      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();

      if (map.tap) {
        map.tap.disable();
      }

      this.dblClickEventFn = function (e) {
        L.DomEvent.stop(e);
      };

      this.keyDownFn = function (e) {
        // ctrl-x cancel measurement
        if (
          (e.originalEvent.ctrlKey || e.originalEvent.metaKey) &&
          e.originalEvent.key.toLowerCase() === "x"
        ) {
          if (this.layer) {
            //console.log('esc pressed!')
            this.layer.off("click");
            this.layer.off("keydown");
            this.mainLayer.removeLayer(this.layer);
            L.DomEvent.stop(e);
            this.resetRuler(false);
          }
        }
      };

      this.clickEventFn = function (e) {
        console.log(e);
        if (me.clickHandle) {
          clearTimeout(me.clickHandle);
          me.clickHandle = 0;

          if (me.options.show_last_node) {
            me.preClick(e);
            me.getMouseClickHandler(e);
          }

          me.getDblClickHandler(e);
        } else {
          me.preClick(e);

          me.clickHandle = setTimeout(function () {
            me.getMouseClickHandler(e);
            me.clickHandle = 0;
          }, me.clickSpeed);
        }
      };

      this.moveEventFn = function (e) {
        if (!me.clickHandle) {
          me.getMouseMoveHandler(e);
        }
      };
      map.on("click", this.clickEventFn, this);
      map.on("mousemove", this.moveEventFn, this);
      map.on("keydown", this.keyDownFn, this);
      this.resetRuler();
    },

    initLayer: function () {
      this.layer = L.featureGroup();
      this.layer.addTo(this.mainLayer);
      this.layer.on("selected", this.layerSelected);
      this.layer.on("click", this.clickEventFn, this);
    },

    resetRuler: function (resetLayer) {
      var map = this._map;

      if (resetLayer) {
        map.off("click", this.clickEventFn, this);
        map.off("mousemove", this.moveEventFn, this);

        if (this.mainLayer) {
          this._map.removeLayer(this.mainLayer);
        }

        this.mainLayer = null;

        this._map.touchZoom.enable();
        this._map.boxZoom.enable();
        this._map.keyboard.enable();

        if (this._map.tap) {
          this._map.tap.enable();
        }
      }

      this.layer = null;
      this.prevLatlng = null;
      this.poly = null;
      this.multi = null;
      this.latlngs = null;
      this.latlngsList = [];
      this.sum = 0;
      this.distance = 0;
      this.separation = 1;
      this.last = 0;
      this.fixedLast = 0;
      this.totalIcon = null;
      this.total = null;
      this.lastCircle = null;

      /* Leaflet return distances in meters */
      this.UNIT_CONV = 1000;
      this.SUB_UNIT_CONV = 1000;
      this.UNIT = "km";
      this.SUB_UNIT = "m";

      if (this.options.unitSystem === "imperial") {
        this.UNIT_CONV = 1609.344;
        this.SUB_UNIT_CONV = 5280;
        this.UNIT = "mi";
        this.SUB_UNIT = "ft";
      }

      this.measure = {
        scalar: 0,
        unit: this.SUB_UNIT,
      };
    },

    cleanUpMarkers: function (fixed) {
      var layer = this.layer;

      if (layer) {
        layer.eachLayer(function (l) {
          if (l.options && l.options.type === "tmp") {
            if (fixed) {
              l.options.type = "fixed";
            } else {
              layer.removeLayer(l);
            }
          }
        });
      }
    },

    cleanUpFixed: function () {
      var layer = this.layer;

      if (layer) {
        layer.eachLayer(function (l) {
          if (l.options && l.options.type === "fixed") {
            layer.removeLayer(l);
          }
        });
      }
    },

    convertDots: function () {
      var me = this,
        layer = this.layer;

      if (layer) {
        layer.eachLayer(function (l) {
          if (l.options && l.options.type === "dot") {
            var m = l.options.marker,
              i = m ? m.options.icon.options : null,
              il = i ? i.html : "";

            if (il && il.indexOf(me.measure.unit) === -1) {
              var str = l.options.label,
                s = str.split(" "),
                e = parseFloat(s[0]),
                u = s[1],
                label = "";

              if (l.options.label.indexOf(me.measure.unit) !== -1) {
                label = l.options.label;
              } else if (u === me.UNIT) {
                label = (e * me.SUB_UNIT_CONV).toFixed(2) + " " + me.SUB_UNIT;
              } else if (u === me.SUB_UNIT) {
                label = (e / me.SUB_UNIT_CONV).toFixed(2) + " " + me.UNIT;
              }

              var cicon = L.divIcon({
                className: "total-popup-label",
                html: label,
              });

              m.setIcon(cicon);
            }
          }
        });
      }
    },

    displayMarkers: function (latlngs, multi, sum) {
      var x,
        y,
        label,
        ratio,
        p,
        latlng = latlngs[latlngs.length - 1],
        prevLatlng = latlngs[0],
        original = prevLatlng.distanceTo(latlng) / this.UNIT_CONV,
        dis = original;

      var p2 = this._map.latLngToContainerPoint(latlng),
        p1 = this._map.latLngToContainerPoint(prevLatlng),
        unit = 1;

      if (this.measure.unit === this.SUB_UNIT) {
        unit = this.SUB_UNIT_CONV;
        dis = dis * unit;
      }

      var t = sum * unit + dis,
        qu = sum * unit;

      for (var q = Math.floor(qu); q < t; q++) {
        ratio = (t - q) / dis;

        if (q % this.separation || q < qu) {
          continue;
        }

        x = p2.x - ratio * (p2.x - p1.x);
        y = p2.y - ratio * (p2.y - p1.y);

        p = L.point(x, y);

        /* render a circle spaced by separation */

        latlng = this._map.containerPointToLatLng(p);

        label = q + " " + this.measure.unit;

        this.renderCircle(
          latlng,
          0,
          this.layer,
          multi ? "fixed" : "tmp",
          label
        );

        this.last = t;
      }

      return original;
    },

    renderCircle: function (latLng, radius, layer, type, label) {
      var color = this.options.color,
        lineColor = this.options.color,
        azimut = "",
        nodeCls = "";

      type = type || "circle";

      var linesHTML = [];

      var options = {
        color: lineColor,
        fillOpacity: 1,
        opacity: 1,
        fill: true,
        type: type,
      };

      var a = this.prevLatlng
          ? this._map.latLngToContainerPoint(this.prevLatlng)
          : null,
        b = this._map.latLngToContainerPoint(latLng);

      if (type === "dot") {
        nodeCls = "node-label";

        if (a && this.options.show_azimut) {
          azimut = ' <span class="azimut"> ' + this.lastAzimut + "&deg;</span>";
        }
      }

      var p_latLng = this._map.containerPointToLatLng(b);

      if (label) {
        var cicon = L.divIcon({
          className: "total-popup-label " + nodeCls,
          html:
            '<span style="color: ' + color + ';">' + label + azimut + "</span>",
        });

        options.icon = cicon;
        options.marker = L.marker(p_latLng, { icon: cicon, type: type }).addTo(
          layer
        );
        options.label = label;
      }

      var circle = L.circleMarker(latLng, options);

      circle.setRadius(3);
      circle.addTo(layer);

      return circle;
    },

    getAzimut: function (a, b) {
      var deg = 0;

      if (a && b) {
        deg = parseInt((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);

        if (deg > 0) {
          deg += 90;
        } else if (deg < 0) {
          deg = Math.abs(deg);
          if (deg <= 90) {
            deg = 90 - deg;
          } else {
            deg = 360 - (deg - 90);
          }
        }
      }

      this.lastAzimut = deg;

      return deg;
    },

    renderPolyline: function (latLngs, dashArray, layer) {
      var poly = L.polyline(latLngs, {
        color: this.options.color,
        weight: 2,
        opacity: 1,
        dashArray: dashArray,
      });

      poly.addTo(layer);

      return poly;
    },

    renderMultiPolyline: function (latLngs, dashArray, layer) {
      /* Leaflet version 1+ delegated the concept of multi-poly-line to the polyline */
      var multi;

      if (L.version.startsWith("0")) {
        multi = L.multiPolyline(latLngs, {
          color: this.options.color,
          weight: 2,
          opacity: 1,
          dashArray: dashArray,
        });
      } else {
        multi = L.polyline(latLngs, {
          color: this.options.color,
          weight: 2,
          opacity: 1,
          dashArray: dashArray,
        });
      }

      multi.addTo(layer);

      return multi;
    },

    formatDistance: function (distance, precision) {
      var s = L.Util.formatNum(
          distance < 1 ? distance * parseFloat(this.SUB_UNIT_CONV) : distance,
          precision
        ),
        u = distance < 1 ? this.SUB_UNIT : this.UNIT;

      return { scalar: s, unit: u };
    },

    hasClass: function (target, classes) {
      var fn = L.DomUtil.hasClass;

      for (var i in classes) {
        if (fn(target, classes[i])) {
          return true;
        }
      }

      return false;
    },

    preClick: function (e) {
      var me = this,
        target = e.originalEvent.target;

      if (this.hasClass(target, ["leaflet-popup", "total-popup-content"])) {
        return;
      }

      if (!me.layer) {
        me.initLayer();
      }

      me.cleanUpMarkers(true);

      me.fixedLast = me.last;
      me.prevLatlng = e.latlng;
      me.sum = 0;
    },

    getMouseClickHandler: function (e) {
      var me = this;
      me.fixedLast = me.last;
      me.sum = 0;

      if (me.poly) {
        me.latlngsList.push(me.latlngs);

        if (!me.multi) {
          me.multi = me.renderMultiPolyline(
            me.latlngsList,
            "5 5",
            me.layer,
            "dot"
          );
        } else {
          me.multi.setLatLngs(me.latlngsList);
        }
      }

      var o, dis;
      for (var l in me.latlngsList) {
        o = me.latlngsList[l];
        me.sum += o[0].distanceTo(o[1]) / me.UNIT_CONV;
      }

      if (me.measure.unit === this.SUB_UNIT) {
        dis = me.sum * me.SUB_UNIT_CONV;
      } else {
        dis = me.sum;
      }

      var s = dis.toFixed(2);

      me.renderCircle(
        e.latlng,
        0,
        me.layer,
        "dot",
        parseInt(s) ? s + " " + me.measure.unit : ""
      );
      me.prevLatlng = e.latlng;
    },

    getMouseMoveHandler: function (e) {
      var azimut = "";

      if (this.prevLatlng) {
        var latLng = e.latlng;

        this.latlngs = [this.prevLatlng, e.latlng];

        if (!this.poly) {
          this.poly = this.renderPolyline(this.latlngs, "5 5", this.layer);
        } else {
          this.poly.setLatLngs(this.latlngs);
        }

        /* Distance in miles/meters */
        this.distance =
          parseFloat(this.prevLatlng.distanceTo(e.latlng)) / this.UNIT_CONV;

        /* scalar and unit */
        this.measure = this.formatDistance(this.distance + this.sum, 2);

        var a = this.prevLatlng
            ? this._map.latLngToContainerPoint(this.prevLatlng)
            : null,
          b = this._map.latLngToContainerPoint(latLng);

        if (a && this.options.show_azimut) {
          var style = "color: " + this.options.contrastingColor + ";";
          azimut =
            ' <span class="azimut azimut-final" style="' +
            style +
            '"> &nbsp; ' +
            this.getAzimut(a, b) +
            "&deg;</span>";
        }

        /* tooltip with total distance */
        var label = this.measure.scalar + " " + this.measure.unit,
          html =
            '<span class="total-popup-content" style="background-color:' +
            this.options.color +
            "; color: " +
            this.options.contrastingColor +
            '">' +
            label +
            azimut +
            "</span>";

        if (!this.total) {
          this.totalIcon = L.divIcon({ className: "total-popup", html: html });

          this.total = L.marker(e.latlng, {
            icon: this.totalIcon,
            clickable: true,
          }).addTo(this.layer);
        } else {
          this.totalIcon = L.divIcon({ className: "total-popup", html: html });
          this.total.setLatLng(e.latlng);
          this.total.setIcon(this.totalIcon);
        }

        /* Rules for separation using only distance criteria */
        var ds = this.measure.scalar,
          old_separation = this.separation,
          digits = parseInt(ds).toString().length,
          num = Math.pow(10, digits),
          real = ds > num / 2 ? num / 10 : num / 20,
          dimension = 0;

        this.separation = real;

        /* If there is a change in the segment length we want to re-space
                 the dots on the multi line */
        if (old_separation !== this.separation && this.fixedLast) {
          this.cleanUpMarkers();
          this.cleanUpFixed();

          var multi_latlngs = this.multi.getLatLngs();

          for (var s in multi_latlngs) {
            dimension += this.displayMarkers.apply(this, [
              multi_latlngs[s],
              true,
              dimension,
            ]);
          }

          this.displayMarkers.apply(this, [
            this.poly.getLatLngs(),
            false,
            this.sum,
          ]);

          /* Review that the dots are in correct units */
          this.convertDots();
        } else {
          this.cleanUpMarkers();
          this.displayMarkers.apply(this, [
            this.poly.getLatLngs(),
            false,
            this.sum,
          ]);
        }
      }
    },

    getDblClickHandler: function (e) {
      var azimut = "",
        me = this;

      if (!this.total) {
        return;
      }

      this.layer.off("click");
      this.layer.off("keydown");
      L.DomEvent.stop(e);

      if (this.options.show_azimut) {
        var style = "color: " + this.options.contrastingColor + ";";
        azimut =
          ' <span class="azimut azimut-final" style="' +
          style +
          '"> &nbsp; ' +
          this.lastAzimut +
          "&deg;</span>";
      }

      var workspace = this.layer,
        label = this.measure.scalar + " " + this.measure.unit + " ",
        total_scalar =
          this.measure.unit === this.SUB_UNIT
            ? this.measure.scalar / this.UNIT_CONV
            : this.measure.scalar,
        total_latlng = this.total.getLatLng(),
        total_label = this.total,
        html = [
          '<div class="total-popup-content" style="background-color:' +
            this.options.color +
            "; color: " +
            this.options.contrastingColor +
            '">' +
            label +
            azimut,
          '  <svg class="close" viewbox="0 0 45 35">',
          '   <path style="stroke: ' +
            this.options.contrastingColor +
            '" class="close" d="M 10,10 L 30,30 M 30,10 L 10,30" />',
          "  </svg>",
          "</div>",
        ].join("");

      this.totalIcon = L.divIcon({ className: "total-popup", html: html });
      this.total.setIcon(this.totalIcon);

      var data = {
        total: this.measure,
        total_label: total_label,
        unit: this.UNIT_CONV,
        sub_unit: this.SUB_UNIT_CONV,
      };

      var fireSelected = function (e) {
        if (L.DomUtil.hasClass(e.originalEvent.target, "close")) {
          me.mainLayer.removeLayer(workspace);
        } else {
          workspace.fireEvent("selected", data);
        }
      };

      workspace.on("click", fireSelected);
      workspace.fireEvent("selected", data);

      this.resetRuler(false);
    },

    start: function () {
      if (this.mainLayer) {
        return;
      }
      this.initRuler();
      this._setToggleState(true);
    },

    stop: function () {
      if (!this.mainLayer) {
        return;
      }
      this.resetRuler(true);
      this._setToggleState(false);
    },

    clear: function () {
      if (this.mainLayer) {
        this._map.removeLayer(this.mainLayer);
      }
      this.resetRuler(true);
      this._setToggleState(false);
    },

    finish: function () {
      if (this.total) {
        this.getDblClickHandler({ originalEvent: { target: {} } });
      } else {
        this.stop();
      }
    },

    purgeLayers: function (layers) {
      for (var i in layers) {
        if (layers[i]) {
          this.layer.removeLayer(layers[i]);
        }
      }
    },

    layerSelected: function (e) {},
  });

  L.Control.AreaMeasurement = L.Control.extend({
    options: {
      position: "topleft",
      color: "#4D90FE",
      fillColor: "#4D90FE",
      fillOpacity: 0.2,
      units: ["m2", "km2", "ha", "ft2", "ac", "mi2"],
      defaultUnit: "m2",
    },

    onAdd: function (map) {
      var container = L.DomUtil.create("div", "leaflet-control leaflet-bar"),
        link = L.DomUtil.create("a", "icon-area", container),
        select = L.DomUtil.create("select", "area-unit-select", container),
        map_container = map.getContainer(),
        me = this;

      this._mapContainer = map_container;
      this._toggleLink = link;
      this.unitSelect = select;
      this._map = map;

      link.href = "#";
      link.title = "Toggle area measurement tool";

      this.options.units.forEach(function (u) {
        var opt = L.DomUtil.create("option", "", select);
        opt.value = u;
        opt.innerHTML = me._getUnitLabel(u);
        if (u === me.options.defaultUnit) {
          opt.selected = true;
        }
      });

      L.DomEvent.disableClickPropagation(select);
      L.DomEvent.on(select, "change", function () {
        if (me.areaSqMeters) {
          me._updateAreaLabel();
        }
      });

      L.DomEvent.on(link, "click", L.DomEvent.stop).on(
        link,
        "click",
        function () {
          if (me.active) {
            me.stop();
          } else {
            me.start();
          }
        }
      );

      return container;
    },

    onRemove: function () {
      this.stop();
    },

    _setToggleState: function (active) {
      if (this._toggleLink) {
        if (active) {
          L.DomUtil.addClass(this._toggleLink, "icon-active");
        } else {
          L.DomUtil.removeClass(this._toggleLink, "icon-active");
        }
      }

      if (this._mapContainer) {
        if (active) {
          L.DomUtil.addClass(this._mapContainer, "ruler-map");
        } else {
          L.DomUtil.removeClass(this._mapContainer, "ruler-map");
        }
      }
    },

    start: function () {
      if (this.active) {
        return;
      }
      this._prepareSession();
      this._bindMapHandlers();
      this._setToggleState(true);
      this.active = true;
    },

    stop: function () {
      this._unbindMapHandlers();
      if (this._finalized) {
        this._setToggleState(false);
        this.active = false;
        return;
      }
      this._resetState(true);
      this._setToggleState(false);
      this.active = false;
    },

    clear: function () {
      if (this.mainLayer) {
        this._map.removeLayer(this.mainLayer);
      }
      this._unbindMapHandlers();
      this._resetState(true);
      this._setToggleState(false);
      this.active = false;
    },

    _prepareSession: function () {
      this.mainLayer = L.featureGroup();
      this.mainLayer.addTo(this._map);

      this.latlngs = [];
      this.polygon = null;
      this.previewLatLng = null;
      this.areaLabel = null;
      this.areaSqMeters = 0;
      this._finalized = false;

      this._map.touchZoom.disable();
      this._map.doubleClickZoom.disable();
      this._map.boxZoom.disable();
      this._map.keyboard.disable();
      if (this._map.tap) {
        this._map.tap.disable();
      }
    },

    _resetState: function (removeLayer) {
      if (removeLayer && this.mainLayer) {
        this._map.removeLayer(this.mainLayer);
        this.mainLayer = null;
      }

      this.latlngs = [];
      this.polygon = null;
      this.previewLatLng = null;
      this.areaLabel = null;
      this.areaSqMeters = 0;
      this._finalized = false;

      this._map.touchZoom.enable();
      this._map.boxZoom.enable();
      this._map.keyboard.enable();
      this._map.doubleClickZoom.enable();
      if (this._map.tap) {
        this._map.tap.enable();
      }
    },

    _bindMapHandlers: function () {
      this._clickHandler = this._onClick.bind(this);
      this._moveHandler = this._onMove.bind(this);
      this._dblHandler = this._onDblClick.bind(this);
      this._keyHandler = this._onKeyDown.bind(this);

      this._map.on("click", this._clickHandler, this);
      this._map.on("mousemove", this._moveHandler, this);
      this._map.on("dblclick", this._dblHandler, this);
      this._map.on("keydown", this._keyHandler, this);
    },

    _unbindMapHandlers: function () {
      this._map.off("click", this._clickHandler, this);
      this._map.off("mousemove", this._moveHandler, this);
      this._map.off("dblclick", this._dblHandler, this);
      this._map.off("keydown", this._keyHandler, this);
    },

    _onKeyDown: function (e) {
      if (
        (e.originalEvent.ctrlKey || e.originalEvent.metaKey) &&
        e.originalEvent.key.toLowerCase() === "x"
      ) {
        this.clear();
        L.DomEvent.stop(e);
      }
    },

    _onClick: function (e) {
      this.latlngs.push(e.latlng);
      this._renderPolygon();
    },

    _onMove: function (e) {
      if (!this.latlngs.length) {
        return;
      }
      this.previewLatLng = e.latlng;
      this._renderPolygon(true);
    },

    _onDblClick: function (e) {
      L.DomEvent.stop(e);
      if (this.latlngs.length < 2) {
        return;
      }
      this.previewLatLng = null;
      this._renderPolygon(false, true);
      this._unbindMapHandlers();
      this._resetInteraction();
    },

    _resetInteraction: function () {
      this._map.touchZoom.enable();
      this._map.boxZoom.enable();
      this._map.keyboard.enable();
      this._map.doubleClickZoom.enable();
      if (this._map.tap) {
        this._map.tap.enable();
      }
      this._setToggleState(false);
      this.active = false;
    },

    _renderPolygon: function (previewOnly, finalized) {
      var points = this.latlngs.slice();

      if (this.previewLatLng && !finalized) {
        points.push(this.previewLatLng);
      }

      if (!this.polygon) {
        this.polygon = L.polygon(points, {
          color: this.options.color,
          weight: 2,
          fillColor: this.options.fillColor || this.options.color,
          fillOpacity: this.options.fillOpacity,
        }).addTo(this.mainLayer);
      } else {
        this.polygon.setLatLngs(points);
      }

      if (finalized) {
        this.areaSqMeters = this._computeGeodesicArea(this.latlngs);
        this._updateAreaLabel();
        this._finalized = true;
      }
    },

    _computeGeodesicArea: function (latlngs) {
      if (!latlngs || latlngs.length < 3) {
        return 0;
      }
      var area = 0,
        len = latlngs.length,
        radius = 6378137;

      for (var i = 0; i < len; i++) {
        var p1 = latlngs[i],
          p2 = latlngs[(i + 1) % len],
          lon1 = (p1.lng * Math.PI) / 180,
          lon2 = (p2.lng * Math.PI) / 180,
          lat1 = (p1.lat * Math.PI) / 180,
          lat2 = (p2.lat * Math.PI) / 180;

        area += (lon2 - lon1) * (Math.sin(lat1) + Math.sin(lat2));
      }

      area = Math.abs((area * radius * radius) / 2.0);
      return area;
    },

    _updateAreaLabel: function () {
      if (!this.polygon || !this.areaSqMeters) {
        return;
      }

      var center = this.polygon.getBounds().getCenter(),
        label = this._formatArea(this.areaSqMeters),
        html =
          '<span class="total-popup-content" style="background-color:' +
          this.options.color +
          '; color: #fff;">' +
          label +
          "</span>",
        icon = L.divIcon({ className: "total-popup", html: html });

      if (!this.areaLabel) {
        this.areaLabel = L.marker(center, {
          icon: icon,
          clickable: false,
        }).addTo(this.mainLayer);
      } else {
        this.areaLabel.setLatLng(center);
        this.areaLabel.setIcon(icon);
      }
    },

    _getUnitLabel: function (unit) {
      switch (unit) {
        case "m2":
          return "m²";
        case "km2":
          return "km²";
        case "ha":
          return "ha";
        case "ft2":
          return "ft²";
        case "ac":
          return "ac";
        case "mi2":
          return "mi²";
        default:
          return unit;
      }
    },

    _formatArea: function (areaSqMeters) {
      var unit = this.unitSelect
          ? this.unitSelect.value
          : this.options.defaultUnit,
        value = areaSqMeters,
        labelUnit = unit;

      switch (unit) {
        case "km2":
          value = areaSqMeters / 1e6;
          break;
        case "ha":
          value = areaSqMeters / 10000;
          break;
        case "ft2":
          value = areaSqMeters * 10.76391041671;
          break;
        case "ac":
          value = areaSqMeters / 4046.8564224;
          break;
        case "mi2":
          value = areaSqMeters / (1609.344 * 1609.344);
          break;
        default:
          labelUnit = "m2";
          value = areaSqMeters;
          break;
      }

      return this._formatNumber(value) + " " + this._getUnitLabel(labelUnit);
    },

    _formatNumber: function (value) {
      if (value >= 1000) {
        return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      return value.toFixed(2);
    },
  });
})();
