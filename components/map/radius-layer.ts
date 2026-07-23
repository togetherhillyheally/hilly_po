/**
 * 도착 반경 원 레이어 — CheckpointMap/StampMap 공용.
 * geojson source 를 만들고 fill + line 레이어로 반경 원을 그린다.
 */
import type mapboxgl from "mapbox-gl"
import type { FeatureCollection } from "geojson"
import { makeCircleRing } from "@/lib/geo"

export type RadiusCircle = {
  id: string
  lng: number
  lat: number
  radiusM: number
}

const SOURCE_ID = "radius-circles"
const FILL_COLOR = "#38bdf8"

export function syncRadiusCircles(
  map: mapboxgl.Map,
  circles: RadiusCircle[],
): void {
  const data: FeatureCollection = {
    type: "FeatureCollection",
    features: circles.map((c) => ({
      type: "Feature",
      properties: { id: c.id },
      geometry: {
        type: "Polygon",
        coordinates: [makeCircleRing(c.lng, c.lat, c.radiusM)],
      },
    })),
  }

  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
  if (source) {
    source.setData(data)
    return
  }

  map.addSource(SOURCE_ID, { type: "geojson", data })
  map.addLayer({
    id: `${SOURCE_ID}-fill`,
    type: "fill",
    source: SOURCE_ID,
    paint: { "fill-color": FILL_COLOR, "fill-opacity": 0.14 },
  })
  map.addLayer({
    id: `${SOURCE_ID}-line`,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": FILL_COLOR,
      "line-width": 1.5,
      "line-opacity": 0.7,
      "line-dasharray": [2, 2],
    },
  })
}
