/* ------------------------------------------------------------------
   Shared constants and helpers for the Incident Reports screens.

   Incidents now live in Firebase at  /incidents/{id}  (see incidentService.js).
   Rescue teams come from  /rescueTeams  (useTeams hook), not from this file.

   SEED_INCIDENTS at the bottom is only the sample data that the
   "Load sample incidents" button saves into Firebase (one time).
------------------------------------------------------------------- */

export const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export const INCIDENT_TYPES = [
  "Flood",
  "Fire",
  "Landslide",
  "Earthquake",
  "Medical emergency",
  "Road hazard",
  "Power line",
  "Other",
];

// Tabs above the table. "Closed" groups the two dead-end statuses.
export const TABS = [
  { key: "all", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Verified", label: "Verified" },
  { key: "In Progress", label: "In Progress" },
  { key: "Resolved", label: "Resolved" },
  { key: "closed", label: "Closed", statuses: ["Duplicate", "Rejected"] },
];

/** Minutes since an ISO timestamp (never negative). */
export function minutesSince(iso, now = Date.now()) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 60000)) : 0;
}

/** ISO timestamp -> "4 min ago", "2 hr ago", "Just now" */
export function ago(iso) {
  const minutes = minutesSince(iso);
  if (minutes <= 0) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** 14.65071, 121.10294 -> "14.6507, 121.1029" */
export function formatCoords(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "No GPS";
}

function coordsFor(location) {
  if (location.includes("Marikina")) return "14.6507, 121.1029";
  if (location.includes("Pasig")) return "14.5764, 121.0851";
  if (location.includes("Rizal") || location.includes("Antipolo")) return "14.6037, 121.3084";
  if (location.includes("Quezon City") || location.includes("QC")) return "14.6760, 121.0437";
  return "14.5995, 120.9842";
}

// [id, type, location, reporter, phone, priority, status, minutesAgo,
//  description, photos, team, duplicateOf, match%]
// The sample places above share one point per area, so every report gets a small
// stable offset (about +/- 400 m, worked out from its id). Real reports carry
// their own lat/lng from the phone's GPS (or the pin the resident placed).
function pointFor(id, location) {
  const [baseLat, baseLng] = coordsFor(location).split(",").map(Number);
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return {
    lat: baseLat + ((hash % 100) - 50) / 12500,
    lng: baseLng + ((Math.floor(hash / 100) % 100) - 50) / 12500,
  };
}

// Sample data only. "minutesAgo" is turned into real ISO timestamps (createdAt and
// the activity "at" values) when the list is built, so the saved records match what
// the app writes for real reports. team = a team id from /rescueTeams ("T-01").
const iso = (minutesAgo, now) => new Date(now - minutesAgo * 60000).toISOString();

const mk = (now) => ([
  id, type, location, reporter, phone, priority, status, minutesAgo,
  description, photos = 0, team = null, duplicateOf = null, match = null,
]) => {
  const incident = {
    id, type, location, reporter, phone, priority, status,
    description, photos,
    ...pointFor(id, location), // lat, lng (numbers)
    createdAt: iso(minutesAgo, now),
    activity: [
      { text: `Report submitted by ${reporter}`, at: iso(minutesAgo, now) },
      ...(duplicateOf ? [{ text: `Flagged as possible duplicate of ${duplicateOf}`, at: iso(minutesAgo, now) }] : []),
      ...(status !== "Pending" ? [{ text: `Status set to ${status}`, at: iso(Math.max(minutesAgo - 3, 0), now) }] : []),
    ],
  };
  // Firebase does not keep empty fields, so only add these when they have a value.
  if (team) incident.team = team;
  if (duplicateOf) incident.duplicateOf = duplicateOf;
  if (match) incident.match = match;
  return incident;
};

const ROWS = [
  ["DT-1042", "Flood", "Brgy. San Roque, Marikina", "Juan Santos", "0917 *** 4521", "Critical", "Pending", 4,
    "Water level is rising fast along the main road. About 15 households are already affected, including children and elderly residents who need evacuation.", 3],
  ["DT-1041", "Fire", "Tandang Sora, Quezon City", "Maria Reyes", "0928 *** 1187", "Critical", "In Progress", 11,
    "Fire is spreading from a two-storey house to the neighboring homes. Neighbors are using buckets while waiting for responders.", 2, "T-02"],
  ["DT-1040", "Landslide", "Rodriguez, Rizal", "Carlo Mendoza", "0915 *** 9032", "High", "Verified", 26,
    "Soil and rocks blocked the barangay road after heavy rain. Two houses near the slope are at risk of collapsing.", 4],
  ["DT-1043", "Flood", "Katipunan Ave, QC", "Nina Co", "0917 *** 8830", "Low", "Pending", 31,
    "Another report of the flooded stretch near the Katipunan overpass. Vehicles are slowing down but passing.", 1, null, "DT-1038", 92],
  ["DT-1039", "Road hazard", "Commonwealth Ave, QC", "Ana Cruz", "0919 *** 7714", "Medium", "Resolved", 52,
    "Two fallen trees are blocking the right lane after strong winds.", 2, "T-01"],
  ["DT-1038", "Flood", "Katipunan Ave, QC", "Leo Garcia", "0926 *** 3358", "Low", "Duplicate", 58,
    "Knee-deep floodwater on the service road near the overpass.", 1, null, "DT-1043", 92],
  ["DT-1037", "Medical emergency", "Cainta, Rizal", "Ben Tan", "0905 *** 6620", "Critical", "In Progress", 62,
    "A resident collapsed inside a wet market. Neighbors are doing CPR while waiting for the ambulance.", 0, "T-05"],
  ["DT-1036", "Power line", "Fairview, QC", "Rosa Diaz", "0918 *** 4409", "Medium", "Pending", 95,
    "A live wire is hanging low across the street after strong winds. Residents are keeping children away.", 2],
  ["DT-1035", "Earthquake", "Marikina Heights", "Pia Lim", "0921 *** 5571", "High", "Verified", 70,
    "Cracks appeared on the wall of a three-storey building after the tremor. Occupants moved outside.", 3],
  ["DT-1034", "Fire", "Sta. Lucia, Pasig", "Mark Villanueva", "0933 *** 2210", "High", "Resolved", 190,
    "Small fire in a junk shop, already controlled by neighbors. Requesting inspection for hot spots.", 1, "T-02"],
  ["DT-1033", "Flood", "Provident Village, Marikina", "Joy Bautista", "0927 *** 7788", "Critical", "Resolved", 240,
    "Flooding reached the second floor of several houses. Families were waiting on rooftops.", 4, "T-01"],
  ["DT-1032", "Landslide", "Antipolo City", "Ramon Dizon", "0916 *** 1043", "High", "In Progress", 130,
    "Part of a hillside gave way and covered a footpath. Residents below are asking for assessment.", 2, "T-07"],
  ["DT-1031", "Road hazard", "C5 Libis, QC", "Ella Ramos", "0935 *** 9921", "Medium", "Resolved", 300,
    "Large sinkhole forming on the outer lane near the flyover.", 2],
  ["DT-1030", "Other", "Novaliches, QC", "Tess Cruz", "0912 *** 3307", "Low", "Rejected", 360,
    "Report did not include a valid location or details.", 0],
  ["DT-1029", "Flood", "Nangka, Marikina", "Paolo Reyes", "0917 *** 6015", "High", "Pending", 15,
    "Creek overflowed and water is entering ground-floor homes along the riverbank.", 2],
  ["DT-1028", "Fire", "Commonwealth Ave, QC", "Dina Salvador", "0920 *** 8842", "Medium", "Verified", 45,
    "Smoke coming from a roadside food stall. Gas tank is nearby.", 1],
  ["DT-1027", "Medical emergency", "San Mateo, Rizal", "Carl Uy", "0908 *** 2754", "Medium", "Resolved", 400,
    "Elderly resident with difficulty breathing after smoke exposure.", 0, "T-05"],
  ["DT-1026", "Power line", "Batasan Hills, QC", "Hana Lee", "0929 *** 5532", "Low", "Resolved", 480,
    "Sparking transformer reported by several neighbors, already isolated.", 1],
  ["DT-1025", "Flood", "Concepcion Uno, Marikina", "Ivan Go", "0922 *** 1096", "Critical", "Verified", 20,
    "Water is waist-deep in the barangay hall area, about 40 residents stranded.", 3],
];

/** The sample incidents, with timestamps counted back from "now". */
export const seedIncidents = (now = Date.now()) => ROWS.map(mk(now));
