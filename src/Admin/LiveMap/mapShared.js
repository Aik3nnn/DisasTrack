/* ------------------------------------------------------------------
   Map pieces shared by the Live Map screen and the small map on the
   Dashboard, so both look and behave the same (same colors, same pins,
   same popups). Uses Leaflet + OpenStreetMap tiles.
------------------------------------------------------------------- */
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const CENTER = [14.88, 120.93]; // middle of Bulacan province
export const DEFAULT_ZOOM = 10; // whole province in view
// Roughly the edges of Bulacan (a little loose). The map cannot be dragged far outside it.
export const BULACAN_BOUNDS = [[14.6, 120.65], [15.35, 121.4]];
export const OPEN_STATUSES = ["Pending", "Verified", "In Progress"];
export const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
export const PRIORITY_COLOR = { Critical: "#8f250c", High: "#c8641d", Medium: "#f2c14e", Low: "#5c6b7a" };
export const TEAM_COLOR = { Available: "#2f6b34", Standby: "#c98f0a", Deployed: "#2a2d34", "Off duty": "#9aa0a8" };
export const STALE_AFTER_MIN = 2; // a team location older than this is shown as "last seen"
export const LIST_PATH = "/admin/incident-reports";

export const hasPoint = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export const incidentIcon = (priority, faded) =>
  L.divIcon({
    className: "lm-icon",
    html: `<span class="lm-dot${faded ? " is-faded" : ""}" style="--c:${PRIORITY_COLOR[priority] || "#5c6b7a"}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

export const teamIcon = (status, stale) =>
  L.divIcon({
    className: "lm-icon",
    html: `<span class="lm-team${stale ? " is-faded" : ""}" style="--c:${TEAM_COLOR[status] || "#5c6b7a"}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

// Creates the OpenStreetMap map inside `element` with the layer groups both screens use.
export function createMap(element, options = {}) {
  const map = L.map(element, {
    center: CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 9,
    maxBounds: BULACAN_BOUNDS,
    maxBoundsViscosity: 0.8,
    ...options,
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  return {
    map,
    lines: L.layerGroup().addTo(map),
    incidents: L.layerGroup().addTo(map),
    teams: L.layerGroup().addTo(map),
    incidentMarkers: new Map(),
    teamMarkers: new Map(),
  };
}

// Popup content is built with textContent (never HTML strings), because names and
// locations typed by residents must not be able to inject markup.
export function popupEl(title, lines, action) {
  const root = document.createElement("div");
  root.className = "lm-popup";
  const heading = document.createElement("strong");
  heading.textContent = title;
  root.append(heading);
  lines.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    root.append(p);
  });
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-btn admin-btn--sm";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    root.append(button);
  }
  return root;
}

// Adds new markers, moves/restyles existing ones, removes the ones that are gone.
export function syncMarkers(group, store, items) {
  const seen = new Set();
  items.forEach(({ key, latlng, icon, popup }) => {
    seen.add(key);
    const marker = store.get(key);
    if (!marker) {
      const created = L.marker(latlng, { icon }).bindPopup(popup);
      store.set(key, created);
      group.addLayer(created);
    } else {
      marker.setLatLng(latlng);
      marker.setIcon(icon);
      marker.setPopupContent(popup);
    }
  });
  store.forEach((marker, key) => {
    if (!seen.has(key)) {
      group.removeLayer(marker);
      store.delete(key);
    }
  });
}

// The popup + icon for one incident (same on both maps).
export function incidentMarker(i, navigate, ago) {
  return {
    key: i.id,
    latlng: [i.lat, i.lng],
    icon: incidentIcon(i.priority, !OPEN_STATUSES.includes(i.status)),
    popup: popupEl(
      `${i.id} · ${i.type}`,
      [`${i.priority} priority · ${i.status}`, i.location, `${i.reporter} · ${ago(i.createdAt)}`],
      { label: "Review report", onClick: () => navigate(`${LIST_PATH}/${i.id}`) }
    ),
  };
}

// The popup + icon for one rescue team (same on both maps).
export function teamMarker(t, now, navigate) {
  const minutes = Math.max(0, Math.round((now - (t.location.updatedAt || 0)) / 60000));
  const stale = minutes >= STALE_AFTER_MIN;
  return {
    key: t.id,
    latlng: [t.location.lat, t.location.lng],
    icon: teamIcon(t.status, stale),
    popup: popupEl(
      t.name,
      [`${t.type} · ${t.status}`, `Leader: ${t.leader || "—"}`, stale ? `Last seen ${minutes} min ago` : "Live"],
      t.assignment ? { label: `Open ${t.assignment}`, onClick: () => navigate(`${LIST_PATH}/${t.assignment}`) } : null
    ),
  };
}

// A dashed line from each team to the incident it is assigned to.
export function drawDispatchLines(group, teams, incidents) {
  group.clearLayers();
  teams.forEach((t) => {
    const target = incidents.find((i) => i.id === t.assignment && hasPoint(i));
    if (target) {
      L.polyline([[t.location.lat, t.location.lng], [target.lat, target.lng]], {
        color: "#2a2d34",
        weight: 2,
        dashArray: "6 6",
      }).addTo(group);
    }
  });
}

export { L };
