import * as L from 'leaflet';

// Provide global L for the existing plugin code path
if (typeof window !== 'undefined' && !window.L) {
  window.L = L;
}

// Load the plugin which augments L
import './Leaflet.LinearMeasurement.js';

export default L.Control.LinearMeasurement;

