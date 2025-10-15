declare module 'geojson-validation' {
  import type { Feature, FeatureCollection, Geometry } from 'geojson';
  export function valid(obj: unknown): boolean;
  export function isGeometryObject(obj: unknown): obj is Geometry;
  export function isFeature(obj: unknown): obj is Feature;
  export function isFeatureCollection(obj: unknown): obj is FeatureCollection;
}
