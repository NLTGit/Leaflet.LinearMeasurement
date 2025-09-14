import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../../dist/leaflet-linear-measurement.esm.js';

const map = L.map('map').setView([38.9072, -77.0369], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

map.addControl(new L.Control.LinearMeasurement({
  unitSystem: 'imperial',
  color: '#048abf'
}));

