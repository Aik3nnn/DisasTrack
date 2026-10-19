import { useEffect, useRef, useState } from "react";
import Icon from "../Icon.jsx";
import { MANUAL_STATUSES, SPECIALTIES } from "./rescueTeamsData.js";

const EMPTY = {
  name: "",
  specialty: SPECIALTIES[0],
  leader: "",
  phone: "",
  members: "", 
  base: "",
  status: "Available",
};

/**
 * Add / edit dialog.
 *   team     = the team being edited, or null to add a new one
 *   existing = all teams (used to block duplicate names)
 *   onSave(values), onClose()
 */
export default function TeamModal({ team, existing, onSave, onClose }) {
  const isEdit = Boolean(team);
  const deployed = team?.status === "Deployed";

  const [form, setForm] = useState(() =>
    team ? { ...EMPTY, ...team, members: String(team.members) } : EMPTY
  );
  const [errors, setErrors] = useState({});
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  function submit(event) {
    event.preventDefault();
    const next = {};
    const name = form.name.trim();

    if (!name) next.name = "Enter a team name.";
    else if (existing.some((t) => t.id !== team?.id && t.name.toLowerCase() === name.toLowerCase()))
      next.name = "A team with this name already exists.";
    if (!form.leader.trim()) next.leader = "Enter the team leader.";
    if (!form.phone.trim()) next.phone = "Enter a contact number.";
    const members = Number(form.members);
    if (!Number.isInteger(members) || members < 1) next.members = "Enter at least 1 member.";

    setErrors(next);
    if (Object.keys(next).length) return;

    onSave({
      ...form,
      name,
      leader: form.leader.trim(),
      phone: form.phone.trim(),
      base: form.base.trim(),
      members,
    });
  }

  return (
    <div className="rt-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="rt-modal" role="dialog" aria-modal="true" aria-labelledby="rt-modal-title" onSubmit={submit} noValidate>
        <div className="rt-modal__head">
          <h2 id="rt-modal-title">{isEdit ? `Edit ${team.name}` : "Add rescue team"}</h2>
          <button type="button" className="admin-iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="rt-modal__body">
          <div className="rt-field rt-field--full">
            <label htmlFor="rt-name">Team name</label>
            <input id="rt-name" ref={firstField} value={form.name} onChange={set("name")} placeholder="e.g. Juliet Rescue" />
            {errors.name && <p className="rt-error">{errors.name}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="rt-specialty">Specialty</label>
            <select id="rt-specialty" value={form.specialty} onChange={set("specialty")}>
              {SPECIALTIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="rt-field">
            <label htmlFor="rt-members">Members</label>
            <input id="rt-members" type="number" min="1" value={form.members} onChange={set("members")} />
            {errors.members && <p className="rt-error">{errors.members}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="rt-leader">Team leader</label>
            <input id="rt-leader" value={form.leader} onChange={set("leader")} />
            {errors.leader && <p className="rt-error">{errors.leader}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="rt-phone">Contact number</label>
            <input id="rt-phone" value={form.phone} onChange={set("phone")} placeholder="09xx xxx xxxx" />
            {errors.phone && <p className="rt-error">{errors.phone}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="rt-base">Base / station</label>
            <input id="rt-base" value={form.base} onChange={set("base")} />
          </div>

          <div className="rt-field">
            <label htmlFor="rt-status">Availability</label>
            {deployed ? (
              <>
                <select id="rt-status" value="Deployed" disabled>
                  <option>Deployed</option>
                </select>
                <p className="rt-hint">Set automatically while the team is on an incident.</p>
              </>
            ) : (
              <select id="rt-status" value={form.status} onChange={set("status")}>
                {MANUAL_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="rt-modal__foot">
          <button type="button" className="admin-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn--primary">
            {isEdit ? "Save changes" : "Add team"}
          </button>
        </div>
      </form>
    </div>
  );
}
