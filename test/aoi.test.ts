import { parseAndProcessAoi } from '../src/lib/aoi';

const simplePolygon = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-100, 40],
        [-99, 40],
        [-99, 41],
        [-100, 41],
        [-100, 40],
      ],
    ],
  },
};

test('validates and returns bbox', () => {
  const res = parseAndProcessAoi({
    aoi: simplePolygon,
    operations: [{ op: 'validate' }, { op: 'bbox' }],
  });
  expect(res.valid).toBe(true);
  expect(res.result).toBeTruthy();
  // bbox operation returns a bbox polygon FeatureCollection
  const type = (res.result as any).type;
  expect(type === 'FeatureCollection' || type === 'Feature').toBeTruthy();
});

test('simplify and buffer pipeline', () => {
  const res = parseAndProcessAoi({
    aoi: simplePolygon,
    operations: [
      { op: 'validate' },
      { op: 'simplify', tolerance: 0.001 },
      { op: 'buffer', tolerance: 500, units: 'meters' },
    ],
  });
  expect(res.valid).toBe(true);
  expect(res.result).toBeTruthy();
});
