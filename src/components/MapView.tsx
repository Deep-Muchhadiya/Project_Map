import { useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  type MapRef
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StyleSpecification } from "maplibre-gl";
import { stateUsers } from "../data/stateUsers";

interface TooltipInfo {
  x: number;
  y: number;
  name: string;
  usersPercentage: number;
}

const MAX_BOUNDS: [[number, number], [number, number]] = [
  [40.0, -10.0], // Southwest (Deep Indian Ocean)
  [125.0, 50.0]  // Northeast (China/Mongolia border)
];

const EMPTY_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#d6d9de"
      }
    }
  ]
} as const;

/* ================= CITY LAYERS ================= */

const cityFillLayer = {
  id: "city-fill",
  type: "fill",
  paint: {
    // LOGIC: IF hover is true -> Blue, ELSE -> Orange
    "fill-color": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      "#f58230", // <--- HOVER COLOR (Blue)
      "#989898"  // <--- DEFAULT COLOR (Orange)
    ],
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      0.4, // High opacity on hover
      0.1  // Low opacity default
    ]
  }
};

const cityBorderLayer = {
  id: "city-border",
  type: "line",
  paint: {
    "line-color": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      "#111827",
      "#282525"
    ],
    "line-width": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      2.5,
      1.5
    ]
  }
};

const stateFillLayer = {
  id: "state-fill",
  type: "fill",
  paint: {
    // LOGIC: IF hover is true -> Blue, ELSE -> Orange
    "fill-color": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      "#f58230", // <--- HOVER COLOR (Blue)
      "#989898"  // <--- DEFAULT COLOR (Orange)
    ],
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      0.4,
      0.1
    ]
  }
};

const stateBorderLayer = {
  id: "state-border",
  type: "line",
  paint: {
    "line-color": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      "#0c101a",
      "#29303d"
    ],
    "line-width": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      2,
      1.2
    ]
  }
};


export default function MapView() {
  const mapRef = useRef<MapRef | null>(null);

  const hoveredStateId = useRef<string | null>(null);
  const hoveredCityId = useRef<string | number | null>(null);

  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);

  const isCityMode = selectedStateName !== null;

  const zoomToState = (feature: any) => {
    const map = mapRef.current;
    if (!map) return;

    const coords =
      feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates.flat()
        : feature.geometry.coordinates.flat(2);

    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ],
      { padding: 80, duration: 2000 }
    );
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Map
        ref={mapRef}
        renderWorldCopies={false}
        maxBounds={MAX_BOUNDS}
        minZoom={3.5}
        // mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        mapStyle={EMPTY_MAP_STYLE}
        onLoad={() =>
          mapRef.current?.fitBounds(MAX_BOUNDS, { padding: 40 })
        }
        interactiveLayerIds={isCityMode ? ["city-fill"] : ["state-fill"]}

        onMouseMove={(e) => {
          const map = mapRef.current;
          const feature = e.features?.[0];
          if (!map || !feature) return;

          /* ===== CITY MODE ===== */
          if (isCityMode && feature.layer.id === "city-fill") {
            const cityId = feature.id;
            if (cityId == null) return;

            if (hoveredCityId.current !== cityId) {
              if (hoveredCityId.current !== null) {
                map.setFeatureState(
                  { source: "india-cities", id: hoveredCityId.current },
                  { hover: false }
                );
              }

              hoveredCityId.current = cityId;
              map.setFeatureState(
                { source: "india-cities", id: cityId },
                { hover: true }
              );
            }

            // --- ADDED: Set Tooltip for City ---
            const cityName = feature.properties?.DISTRICT ?? "Unknown";
            const cityUsers = feature.properties?.USERS ?? 0;

            setTooltip({
              x: e.point.x,
              y: e.point.y,
              name: cityName,
              usersPercentage: cityUsers // Assuming USERS is the number you want
            });
            // -----------------------------------

            return;
          }

          /* ===== STATE MODE ===== */
          if (!isCityMode && feature.layer.id === "state-fill") {
            const stateId = feature.id as string;

            if (hoveredStateId.current !== stateId) {
              if (hoveredStateId.current !== null) {
                map.setFeatureState(
                  { source: "india-states", id: hoveredStateId.current },
                  { hover: false }
                );
              }

              hoveredStateId.current = stateId;
              map.setFeatureState(
                { source: "india-states", id: stateId },
                { hover: true }
              );
            }

            const stateName = feature.properties?.ST_NM ?? "Unknown";
            setTooltip({
              x: e.point.x,
              y: e.point.y,
              name: stateName,
              usersPercentage: stateUsers[stateName] ?? 0
            });
          }
        }}

        onMouseLeave={() => {
          const map = mapRef.current;
          if (!map) return;

          if (hoveredCityId.current !== null) {
            map.setFeatureState(
              { source: "india-cities", id: hoveredCityId.current },
              { hover: false }
            );
            hoveredCityId.current = null;
          }

          if (hoveredStateId.current !== null) {
            map.setFeatureState(
              { source: "india-states", id: hoveredStateId.current },
              { hover: false }
            );
            hoveredStateId.current = null;
          }

          setTooltip(null);
        }}

        onClick={(e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          setSelectedStateName(feature.properties?.ST_NM ?? null);
          setTooltip(null);
          zoomToState(feature);
        }}

        onDblClick={() => {
          setSelectedStateName(null);
          mapRef.current?.fitBounds(MAX_BOUNDS, { padding: 40 });
        }}
      >
        {/* STATES */}
        <Source id="india-states" type="geojson" data="/india-states.geojson" promoteId="ST_NM">
          <Layer {...(stateFillLayer as any)} />
          <Layer {...(stateBorderLayer as any)} />
        </Source>

        {/* CITIES */}
        <Source id="india-cities" type="geojson" data="/india-cities.geojson" promoteId="DISTRICT">
          <Layer
            {...(cityFillLayer as any)}
            filter={["==", ["get", "ST_NM"], selectedStateName ?? ""]}
          />
          <Layer
            {...(cityBorderLayer as any)}
            filter={["==", ["get", "ST_NM"], selectedStateName ?? ""]}
          />
          {/* REMOVED: <Layer {...(cityLabelLayer as any)} ... /> */}
        </Source>
      </Map>

      {/* GLOBAL TOOLTIP (Works for both State and City now) */}
      {/* CHECK: Removed !isCityMode so it shows up for cities too */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: "rgba(27, 29, 32, 0.95)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 700,
            pointerEvents: "none",
            zIndex: 10 // Ensure it sits above the map canvas
          }}
        >
          {tooltip.name}:<b>{tooltip.usersPercentage}</b>
        </div>
      )}
    </div>
  );
}