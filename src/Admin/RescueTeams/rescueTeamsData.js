/* ------------------------------------------------------------------
   Sample data for the Rescue Teams screen.
   Replace TEAMS with an API call when the backend is ready
   (the field names below are what the screen reads).
------------------------------------------------------------------- */

export const STATUSES = ["Available", "Standby", "Deployed", "Off duty"];

// Statuses an admin can pick by hand. "Deployed" is set by dispatching a team
// from an incident report, so it is not in this list.
export const MANUAL_STATUSES = ["Available", "Standby", "Off duty"];

export const SPECIALTIES = [
  "Search & Rescue",
  "Flood & Water Rescue",
  "Emergency Medical",
  "Fire & Hazmat",
  "K9 & Structural Search",
  "Evacuation & Relief",
];

export const TEAMS = [
  { id: "T-01", name: "Alpha Rescue", specialty: "Search & Rescue", leader: "Capt. R. Villanueva", phone: "0917 555 0101", members: 8, status: "Available", base: "Quezon City Hub", assignment: null },
  { id: "T-02", name: "Bravo Fire Unit", specialty: "Fire & Hazmat", leader: "Lt. D. Navarro", phone: "0917 555 0102", members: 10, status: "Deployed", base: "Tandang Sora Station", assignment: "DT-1041" },
  { id: "T-03", name: "Charlie Medical", specialty: "Emergency Medical", leader: "Dr. A. Bautista", phone: "0917 555 0103", members: 6, status: "Standby", base: "Marikina Health Post", assignment: null },
  { id: "T-04", name: "Delta Water Rescue", specialty: "Flood & Water Rescue", leader: "Capt. M. Dizon", phone: "0917 555 0104", members: 9, status: "Available", base: "Marikina River Base", assignment: null },
  { id: "T-05", name: "Echo Search Team", specialty: "K9 & Structural Search", leader: "Sgt. J. Ramos", phone: "0917 555 0105", members: 7, status: "Deployed", base: "Rodriguez Outpost", assignment: "DT-1040" },
  { id: "T-06", name: "Foxtrot Evacuation", specialty: "Evacuation & Relief", leader: "Lt. C. Mercado", phone: "0917 555 0106", members: 12, status: "Standby", base: "Pasig Relief Center", assignment: null },
  { id: "T-07", name: "Golf Flood Response", specialty: "Flood & Water Rescue", leader: "Capt. P. Aquino", phone: "0917 555 0107", members: 8, status: "Deployed", base: "Brgy. San Roque", assignment: "DT-1042" },
  { id: "T-08", name: "Hotel Medical", specialty: "Emergency Medical", leader: "Dr. L. Castillo", phone: "0917 555 0108", members: 5, status: "Off duty", base: "Antipolo Clinic", assignment: null },
  { id: "T-09", name: "India Rapid Response", specialty: "Search & Rescue", leader: "Sgt. E. Lopez", phone: "0917 555 0109", members: 6, status: "Off duty", base: "Quezon City Hub", assignment: null },
];
