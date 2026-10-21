import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidents } from "../IncidentReports/IncidentsContext.jsx";
import { ago, statusLabel } from "../IncidentReports/incidentsData.js";
import { useTeams } from "../js/useTeams.js";
import { clearTeamLocations, setTeamLocations } from "../js/teamService.js";
import {
  L,
  OPEN_STATUSES,
  PRIORITY_COLOR,
  PRIORITY_RANK,
  TEAM_COLOR,
  createMap,
  drawDispatchLines,
  hasPoint,
  incidentMarker,
  syncMarkers,
  teamMarker,
} from "./mapShared.js";

/* ------------------------------------------------------------------
   Live Map  (OpenStreetMap tiles + Leaflet)

   - Incidents come from Firebase (/incidents) through the shared incident list
     (same data as Incident Reports, Dashboard and Reports & Stats), each one has
     numbers  lat  and  lng.
   - Rescue teams come from Firebase (/rescueTeams). A team shows on the map when it has
     location = { lat, lng, updatedAt }. Firebase pushes every change, so markers move
     by themselves (no refresh).
   - Leaflet is used directly (not react-leaflet): the map is created once, and the markers
     are updated in place when the data changes.
   - Colors, pins and popups are shared with the Dashboard map (see mapShared.js).
------------------------------------------------------------------- */

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

// Demo only: a stable starting point for a team (around Malolos, Guiguinto and Plaridel, Bulacan).
function demoStart(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { lat: 14.82 + (hash % 100) / 1000, lng: 120.8 + (Math.floor(hash / 100) % 100) / 900 };
}

export default function LiveMap() {
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  const { teams } = useTeams();

  const [priority, setPriority] = useState("all");
  const [scope, setScope] = useState("open"); // "open" | "all"
  const [showTeams, setShowTeams] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [note, setNote] = useState("");
  const [now, setNow] = useState(Date.now());

  const mapEl = useRef(null);
  const layers = useRef(null);
  const fitted = useRef(false);

  // Re-check "live / last seen" once a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // ---------- incidents to show ----------
  const shown = useMemo(
    () =>
      incidents
        .filter(
          (i) =>
            hasPoint(i) &&
            (scope === "all" || OPEN_STATUSES.includes(i.status)) &&
            (priority === "all" || i.priority === priority)
        )
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || String(b.createdAt).localeCompare(String(a.createdAt))),
    [incidents, scope, priority]
  );
  const teamsOnMap = useMemo(() => teams.filter((t) => hasPoint(t.location)), [teams]);

  // ---------- 1. create the map once ----------
  useEffect(() => {
    const created = createMap(mapEl.current);
    const { map } = created;
    layers.current = created;
    fitted.current = false;

    return () => {
      map.remove();
      layers.current = null;
    };
  }, []);

  // ---------- 2. incident markers ----------
  useEffect(() => {
    const l = layers.current;
    if (!l) return;
    syncMarkers(
      l.incidents,
      l.incidentMarkers,
      shown.map((i) => incidentMarker(i, navigate, ago))
    );

    // Zoom to the incidents the first time some are shown.
    if (!fitted.current && shown.length > 0) {
      l.map.fitBounds(L.latLngBounds(shown.map((i) => [i.lat, i.lng])), { padding: [40, 40], maxZoom: 14 });
      fitted.current = true;
    }
  }, [shown, navigate]);

  // ---------- 3. team markers + dispatch lines ----------
  useEffect(() => {
    const l = layers.current;
    if (!l) return;
    const visibleTeams = showTeams ? teamsOnMap : [];

    syncMarkers(
      l.teams,
      l.teamMarkers,
      visibleTeams.map((t) => teamMarker(t, now, navigate))
    );

    drawDispatchLines(l.lines, visibleTeams, incidents);
  }, [teamsOnMap, showTeams, incidents, now, navigate]);

  // ---------- demo: pretend the rescue team phones are sending locations ----------
  const latest = useRef({ teams, incidents });
  latest.current = { teams, incidents };
  const positions = useRef({});

  useEffect(() => {
    if (!simulating) return undefined;
    const tick = () => {
      const next = {};
      latest.current.teams.forEach((t) => {
        const current = positions.current[t.id] || (hasPoint(t.location) ? t.location : demoStart(t.id));
        let { lat, lng } = current;
        const target = latest.current.incidents.find((i) => i.id === t.assignment && hasPoint(i));
        if (target) {
          // heading to its incident: close 20% of the distance each tick
          lat += (target.lat - lat) * 0.2;
          lng += (target.lng - lng) * 0.2;
        } else {
          // otherwise drift a little
          lat += (Math.random() - 0.5) * 0.003;
          lng += (Math.random() - 0.5) * 0.003;
        }
        positions.current[t.id] = { lat, lng };
        next[t.id] = { lat, lng };
      });
      if (Object.keys(next).length) {
        setTeamLocations(next).catch((err) => {
          setNote(err.message);
          setSimulating(false);
        });
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [simulating]);

  async function clearLocations() {
    setSimulating(false);
    positions.current = {};
    try {
      await clearTeamLocations(teams);
      setNote("");
    } catch (err) {
      setNote(err.message);
    }
  }

  function focusIncident(i) {
    const l = layers.current;
    if (!l) return;
    l.map.flyTo([i.lat, i.lng], 15, { duration: 0.6 });
    l.incidentMarkers.get(i.id)?.openPopup();
  }

  return (
    <div className="lm-page">
      {/* filters */}
      <div className="rt-toolbar">
        <div className="admin-chips" role="group" aria-label="Filter by priority">
          {["all", ...PRIORITIES].map((p) => (
            <button
              key={p}
              type="button"
              className={`admin-chip ${priority === p ? "is-active" : ""}`}
              aria-pressed={priority === p}
              onClick={() => setPriority(p)}
            >
              {p === "all" ? "All priorities" : p}
            </button>
          ))}
        </div>

        <div className="rt-toolbar__right">
          <select className="admin-chip" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Which incidents">
            <option value="open">Open incidents</option>
            <option value="all">All incidents</option>
          </select>
          <label className="lm-check">
            <input type="checkbox" checked={showTeams} onChange={(e) => setShowTeams(e.target.checked)} />
            Show rescue teams
          </label>
        </div>
      </div>

      <div className="lm-layout">
        <section className="admin-card lm-mapcard" aria-label="Live map">
          <div ref={mapEl} className="lm-map" />
          <ul className="admin-legend lm-legend">
            {PRIORITIES.map((p) => (
              <li key={p}><span className="lm-key lm-key--dot" style={{ "--c": PRIORITY_COLOR[p] }} />{p}</li>
            ))}
            <li><span className="lm-key lm-key--team" style={{ "--c": TEAM_COLOR.Available }} />Rescue team</li>
            <li><span className="lm-key lm-key--line" />Dispatch route</li>
          </ul>
        </section>

        <section className="admin-card lm-side" aria-label="Incidents on the map">
          <div className="admin-card__head">
            <div>
              <h2 className="admin-card__title">On the map</h2>
              <p className="admin-card__sub">
                {shown.length} incident{shown.length === 1 ? "" : "s"} · {teamsOnMap.length} team{teamsOnMap.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <ul className="lm-list">
            {shown.map((i) => (
              <li key={i.id}>
                <button type="button" className="lm-item" onClick={() => focusIncident(i)}>
                  <span className="lm-dot" style={{ "--c": PRIORITY_COLOR[i.priority] }} aria-hidden="true" />
                  <span className="lm-item__text">
                    <span className="lm-item__title">{i.type} · {i.location}</span>
                    <span className="lm-item__meta">{i.id} · {statusLabel(i.status)} · {ago(i.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="admin-card__sub">No incidents match these filters.</li>}
          </ul>

          <div className="lm-demo">
            <p className="admin-card__sub">
              Rescue teams appear when their phones send a location. Until the rescue team app does that, you can
              simulate it.
            </p>
            <div className="lm-demo__buttons">
              <button type="button" className="admin-btn admin-btn--sm" onClick={() => setSimulating((v) => !v)}>
                {simulating ? "Stop simulation" : "Simulate team movement"}
              </button>
              <button type="button" className="admin-btn admin-btn--sm" onClick={clearLocations}>
                Clear team locations
              </button>
            </div>
            {note && <p className="rt-error">{note}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
