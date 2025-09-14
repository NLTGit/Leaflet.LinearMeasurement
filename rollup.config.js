import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  // UMD build (Leaflet 1.x global L)
  {
    input: 'src/Leaflet.LinearMeasurement.js',
    output: {
      file: 'dist/leaflet-linear-measurement.umd.js',
      format: 'umd',
      name: 'LeafletLinearMeasurement',
      globals: { leaflet: 'L' }
    },
    external: ['leaflet'],
    plugins: [resolve(), commonjs()]
  },
  // ESM passthrough (for Leaflet 2.x import usage)
  {
    input: 'src/esm.js',
    output: {
      file: 'dist/leaflet-linear-measurement.esm.js',
      format: 'esm'
    },
    external: ['leaflet'],
    plugins: [resolve(), commonjs()]
  }
];

