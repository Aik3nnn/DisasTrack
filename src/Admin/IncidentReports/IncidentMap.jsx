import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ago } from "./incidentsData.js";
import {
  L,
  createMap,
  drawDispatchLines,
  hasPoint,
  incidentMarker,
  syncMarkers,
  teamMarker,
} from "../LiveMap/mapShared.js";

/* ------------------------------------------------------------------
   Live map for ONE incident (Incident Detail page).
   Same OpenStreetMap / Leaflet map as the Live Map screen:
   - the incident pin
   - the rescue team assigned to it (moves by itself when the team's location
     changes in Firebase) and a dashed line between them
   - the "last seen" check runs again every 30 seconds
------------------------------------------------------------------- */
export default function IncidentMap({ incident, teams }) {
  const navigate = useNavigate();
  const mapEl = useRef(null);
  const layers = useRef(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const located = hasPoint(incident);
  const assigned = useMemo(
    () => teams.filter((t) => t.id === incident.team && hasPoint(t.location)),
    [teams, incident.team]
  );

  // 1. create the map once (cleaned up when leaving the page)
  useEffect(() => {
    if (!mapEl.current) return undefined;
    const created = createMap(mapEl.current, { scrollWheelZoom: false });
    layers.current = created;
    // The card may still be laying out: re-measure so tiles fill the box.
    const fix = setTimeout(() => created.map.invalidateSize(), 150);
    return () => {
      clearTimeout(fix);
      created.map.remove();
      layers.current = null;
    };
  }, []);

  // 2. incident pin + team + line; zoom to fit them
  useEffect(() => {
    const l = layers.current;
    if (!l) return;
    syncMarkers(l.incidents, l.incidentMarkers, located ? [incidentMarker(incident, () => {}, ago)] : []);
    syncMarkers(l.teams, l.teamMarkers, assigned.map((t) => teamMarker(t, now, navigate)));
    drawDispatchLines(l.lines, assigned, located ? [incident] : []);

    const points = [
      ...(located ? [[incident.lat, incident.lng]] : []),
      ...assigned.map((t) => [t.location.lat, t.location.lng]),
    ];
    if (points.length === 1) l.map.setView(points[0], 15);
    else if (points.length > 1) l.map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [incident, located, assigned, now, navigate]);

  return (
    <>
      <div className="ir-map ir-map--live" ref={mapEl} role="region" aria-label={`Live map of ${incident.location}`} />
      {!located && <p className="ir-muted ir-map__none">This report has no GPS point, so it can't be shown on the map.</p>}
    </>
  );
}
