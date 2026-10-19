import { createContext, useContext, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { INCIDENTS } from "./incidentsData.js";

const IncidentsContext = createContext(null);

/**
 * Route wrapper: holds the incident list so the list page and the detail
 * page share the same data. Edits made on the detail page (verify, priority,
 * dispatch...) show up in the list right away.
 *
 * Front-end only for now: changes live in memory and reset on refresh.
 * Swap the useState below for API calls when the backend exists.
 */
export function IncidentsLayout() {
  const [incidents, setIncidents] = useState(INCIDENTS);

  const value = useMemo(
    () => ({
      incidents,
      /** patch = fields to change, log = text for the activity log */
      update(id, patch, log) {
        setIncidents((list) =>
          list.map((item) =>
            item.id !== id
              ? item
              : {
                  ...item,
                  ...patch,
                  activity: log
                    ? [...item.activity, { text: log, minutesAgo: 0 }]
                    : item.activity,
                }
          )
        );
      },
    }),
    [incidents]
  );

  return (
    <IncidentsContext.Provider value={value}>
      <Outlet />
    </IncidentsContext.Provider>
  );
}

export function useIncidents() {
  const ctx = useContext(IncidentsContext);
  if (!ctx) throw new Error("useIncidents must be used inside <IncidentsLayout>");
  return ctx;
}
