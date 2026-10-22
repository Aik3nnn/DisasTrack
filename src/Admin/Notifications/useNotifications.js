import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIncidents } from "../IncidentReports/IncidentsContext.jsx";
import { useAccounts } from "../js/useAccounts.js";
import { useTeams } from "../js/useTeams.js";
import {
  KIND_LINK,
  MAX_NOTIFICATIONS,
  buildNotifications,
  saveLastRead,
  toMs,
  watchLastRead,
} from "./notificationService.js";

// Text of the pop-up when several things of one kind arrive at once (for example the sample data).
const BATCH_TITLE = {
  incident: (n) => `${n} new incident reports`,
  user: (n) => `${n} new users created`,
  team: (n) => `${n} new rescue teams created`,
};

/**
 * Live notifications for the signed-in admin. Must be used inside <IncidentsLayout>.
 *
 *   const { items, unread, isUnread, markAllRead, toasts, dismissToast } = useNotifications(uid);
 *
 *   items    = the latest notifications (newest first)
 *   unread   = how many of them this admin has not read yet
 *   toasts   = small pop-ups for things that arrive while the page is open
 */
export function useNotifications(uid) {
  const { incidents, loading: incidentsLoading } = useIncidents();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { teams, loading: teamsLoading } = useTeams();

  const [lastRead, setLastRead] = useState(null); // ms, null until loaded
  const [liveIds, setLiveIds] = useState(() => new Set()); // arrived while this page was open
  const [toasts, setToasts] = useState([]);
  const seen = useRef(null); // ids already known; null until the first full load

  useEffect(() => {
    if (!uid) return undefined;
    return watchLastRead(uid, setLastRead);
  }, [uid]);

  const all = useMemo(() => buildNotifications({ incidents, accounts, teams }), [incidents, accounts, teams]);
  const items = useMemo(() => all.slice(0, MAX_NOTIFICATIONS), [all]);
  const loaded = !incidentsLoading && !accountsLoading && !teamsLoading;

  // Spot what is new since the last update and pop a toast for it.
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(all.map((n) => n.id));
    if (seen.current === null) {
      seen.current = ids; // first load: everything here is "already there", no pop-ups
      return;
    }
    const fresh = all.filter((n) => !seen.current.has(n.id));
    seen.current = ids;
    if (fresh.length === 0) return;

    setLiveIds((prev) => new Set([...prev, ...fresh.map((n) => n.id)]));

    const groups = {};
    fresh.forEach((n) => (groups[n.kind] = [...(groups[n.kind] || []), n]));
    const popups = Object.entries(groups).map(([kind, list]) =>
      list.length === 1
        ? { ...list[0], key: list[0].id }
        : {
            key: `${kind}:batch:${Date.now()}`,
            kind,
            title: BATCH_TITLE[kind](list.length),
            text: "",
            meta: "",
            to: KIND_LINK[kind],
          }
    );
    setToasts((prev) => [...popups, ...prev].slice(0, 4));
  }, [all, loaded]);

  const isUnread = useCallback(
    (n) => lastRead !== null && (liveIds.has(n.id) || toMs(n.at) > lastRead),
    [lastRead, liveIds]
  );
  const unread = useMemo(() => items.filter(isUnread).length, [items, isUnread]);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastRead(toMs(now));
    setLiveIds(new Set());
    saveLastRead(uid, now);
  }, [uid]);

  const dismissToast = useCallback((key) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  return { items, unread, isUnread, markAllRead, toasts, dismissToast };
}
