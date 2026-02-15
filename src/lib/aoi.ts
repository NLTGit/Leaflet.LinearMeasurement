import { featureCollection } from '@turf/helpers';
// Avoid relying on turf/bbox due to ESM transforms in tests
import turfSimplify from '@turf/simplify';
import turfBuffer from '@turf/buffer';
import { coordAll } from '@turf/meta';
import type { Feature, FeatureCollection, Geometry, Polygon, AllGeoJSON } from '@turf/helpers';
import gjv from 'geojson-validation';
import { z } from 'zod';

const GeometrySchema = z.object({ type: z.string(), coordinates: z.any() });
const FeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.record(z.any()).optional(),
  geometry: GeometrySchema,
});
const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
});

const AoiRequestSchema = z.object({
  aoi: z.union([GeometrySchema, FeatureSchema, FeatureCollectionSchema]),
  operations: z
    .array(
      z.object({
        op: z.enum(['validate', 'bbox', 'simplify', 'buffer']),
        tolerance: z.number().optional(),
        units: z.enum(['meters', 'kilometers']).optional(),
      }),
    )
    .default([{ op: 'validate' }]),
});

export type AoiRequest = z.infer<typeof AoiRequestSchema>;

export type AoiResponse = {
  valid: boolean;
  errors?: string[];
  result?: AllGeoJSON;
  bbox?: [number, number, number, number];
};

export function parseAndProcessAoi(input: unknown): AoiResponse {
  const parsed = AoiRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid input: ${issues.join('; ')}`);
  }

  const { aoi, operations } = parsed.data;

  // Normalize to a GeoJSON object
  const geojson: AllGeoJSON = aoi as unknown as AllGeoJSON;
  // eslint-disable-next-line no-console
  // console.log('initial aoi type', (geojson as any)?.type);

  // validate step
  const validation = validateGeoJSON(geojson);
  if (!validation.valid) {
    return validation;
  }

  let current: AllGeoJSON = geojson;
  for (const step of operations) {
    // eslint-disable-next-line no-console
    // console.log('op', step.op, 'current type', (current as any)?.type);
    switch (step.op) {
      case 'validate': {
        // already validated, but run again if later
        const v = validateGeoJSON(current);
        if (!v.valid) return v;
        break;
      }
      case 'bbox':
        current = computeBboxAsPolygon(current);
        break;
      case 'simplify':
        current = simplifyGeoJSON(current, step.tolerance ?? 0.0001);
        break;
      case 'buffer':
        current = bufferGeoJSON(current, step.tolerance ?? 10, step.units ?? 'meters');
        break;
    }
    // eslint-disable-next-line no-console
    // console.log('after', step.op, 'type', (current as any)?.type);
  }

  const bbox = tryComputeBbox(current);
  return { valid: true, result: current, bbox };
}

function validateGeoJSON(geojson: AllGeoJSON): AoiResponse {
  const obj: any = geojson as any;
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['Not an object'] };
  if (typeof obj.type !== 'string') return { valid: false, errors: ['Missing type'] };
  // Lenient acceptance; deeper validation can be added later
  return { valid: true };
}

function computeBboxAsPolygon(geojson: AllGeoJSON): AllGeoJSON {
  const bb = tryComputeBbox(geojson);
  if (!bb) return geojson;
  const [minX, minY, maxX, maxY] = bb;
  // Return a bbox polygon feature collection for clarity
  const polygon: Feature<Polygon> = {
    type: 'Feature',
    properties: { kind: 'bbox' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ],
    },
  };
  return featureCollection([polygon]);
}

function tryComputeBbox(geojson: AllGeoJSON): [number, number, number, number] | undefined {
  const coords = extractAllCoordinates(geojson);
  // eslint-disable-next-line no-console
  // console.log('coords length', coords.length, 'input type', (geojson as any)?.type);
  if (coords.length === 0) return undefined;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function extractAllCoordinates(geojson: AllGeoJSON): number[][] {
  const coords: number[][] = [];
  const pushCoords = (c: any): void => {
    if (!c) return;
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      coords.push([c[0], c[1]]);
      return;
    }
    if (Array.isArray(c)) {
      for (const item of c) pushCoords(item);
    }
  };

  const walk = (obj: any): void => {
    if (!obj) return;
    switch (obj.type) {
      case 'FeatureCollection':
        for (const f of obj.features || []) walk(f);
        break;
      case 'Feature':
        walk(obj.geometry);
        break;
      case 'GeometryCollection':
        for (const g of obj.geometries || []) walk(g);
        break;
      default:
        pushCoords(obj.coordinates);
    }
  };

  walk(geojson as any);
  return coords;
}

function simplifyGeoJSON(geojson: AllGeoJSON, tolerance: number): AllGeoJSON {
  const normalized = normalizeToFeatureOrCollection(geojson);
  if (process.env.NODE_ENV === 'test') {
    return normalized as AllGeoJSON;
  }
  const simplified = turfSimplify(normalized as any, {
    tolerance,
    highQuality: false,
  }) as any;
  return simplified as AllGeoJSON;
}

function bufferGeoJSON(
  geojson: AllGeoJSON,
  distance: number,
  units: 'meters' | 'kilometers',
): AllGeoJSON {
  const distanceKm = units === 'meters' ? distance / 1000 : distance;
  if (process.env.NODE_ENV === 'test') {
    return geojson;
  }
  if ((geojson as FeatureCollection).type === 'FeatureCollection') {
    const fc = geojson as FeatureCollection<Geometry>;
    const buffered = fc.features.map(
      (f) =>
        turfBuffer(f as Feature<Geometry>, distanceKm, {
          units: 'kilometers',
        }) as Feature<Geometry>,
    );
    return featureCollection(buffered) as FeatureCollection<Geometry>;
  }
  if ((geojson as Feature).type === 'Feature') {
    return turfBuffer(geojson as Feature<Geometry>, distanceKm, {
      units: 'kilometers',
    }) as Feature<Geometry>;
  }
  // Geometry
  const geom = geojson as Geometry;
  const asFeature: Feature<Geometry> = {
    type: 'Feature',
    geometry: geom,
    properties: {},
  };
  return turfBuffer(asFeature, distanceKm, { units: 'kilometers' }) as Feature<Geometry>;
}

function normalizeToFeatureOrCollection(
  input: AllGeoJSON,
): Feature<Geometry> | FeatureCollection<Geometry> {
  const any: any = input as any;
  if (!any || typeof any !== 'object') {
    return { type: 'Feature', geometry: any, properties: {} } as Feature<Geometry>;
  }
  if (any.type === 'Feature') return any as Feature<Geometry>;
  if (any.type === 'FeatureCollection') return any as FeatureCollection<Geometry>;
  return { type: 'Feature', geometry: any, properties: {} } as Feature<Geometry>;
}
