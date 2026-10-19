import { useEffect, useRef, useState } from "react";
import Icon from "../Icon.jsx";
import { phoneText } from "../adminHelpers.js";
import { SHIFTS, STATUSES } from "./dispatchersData.js";

const EMPTY = {
  name: "",
  username: "",
  email: "",
  phone: "",
  shift: SHIFTS[0],
  duty: "Off duty",
  password: "",
};

/**
 * Add / edit dialog for a dispatcher account.
 *   dispatcher = the dispatcher being edited, or null to add a new one
 *   existing   = all dispatchers (used to block duplicate usernames and emails)
 */
export default function DispatcherModal({ dispatcher, existing, onSave, onClose }) {
  const isEdit = Boolean(dispatcher);

  const [form, setForm] = useState(dispatcher ? { ...EMPTY, ...dispatcher, phone: phoneText(dispatcher.phone) } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    const next = {};
    const name = form.name.trim();
    const username = form.username.trim();
    const email = form.email.trim();

    const taken = (key, value) =>
      existing.some((d) => d.id !== dispatcher?.id && d[key].toLowerCase() === value.toLowerCase());

    if (!name) next.name = "Enter the full name.";

    if (!username) next.username = "Enter a username.";
    else if (!/^[a-z0-9._-]+$/i.test(username)) next.username = "Use only letters, numbers, dots, dashes or underscores.";
    else if (taken("username", username)) next.username = "This username is already taken.";

    if (!email) next.email = "Enter an email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    else if (taken("email", email)) next.email = "This email is already used.";

    if (!form.phone.trim()) next.phone = "Enter a contact number.";
    if (!isEdit && form.password.length < 8) next.password = "Use at least 8 characters.";

    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await onSave({ ...form, name, username, email, phone: form.phone.trim() });
    } catch (err) {
      setErrors({ form: err.message });
      setSaving(false);
    }
  }

  return (
    <div className="rt-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="rt-modal" role="dialog" aria-modal="true" aria-labelledby="dp-modal-title" onSubmit={submit} noValidate>
        <div className="rt-modal__head">
          <h2 id="dp-modal-title">{isEdit ? `Edit ${dispatcher.name}` : "Add dispatcher"}</h2>
          <button type="button" className="admin-iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="rt-modal__body">
          <div className="rt-field rt-field--full">
            <label htmlFor="dp-name">Full name</label>
            <input id="dp-name" ref={firstField} value={form.name} onChange={set("name")} placeholder="e.g. Rosalinda Aquino" />
            {errors.name && <p className="rt-error">{errors.name}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="dp-username">Username</label>
            <input id="dp-username" value={form.username} onChange={set("username")} />
            {errors.username && <p className="rt-error">{errors.username}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="dp-phone">Contact number</label>
            <input id="dp-phone" value={form.phone} onChange={set("phone")} placeholder="09xx xxx xxxx" />
            {errors.phone && <p className="rt-error">{errors.phone}</p>}
          </div>

          <div className="rt-field rt-field--full">
            <label htmlFor="dp-email">Email</label>
            <input id="dp-email" type="email" value={form.email} onChange={set("email")} />
            {errors.email && <p className="rt-error">{errors.email}</p>}
          </div>

          <div className="rt-field">
            <label htmlFor="dp-shift">Shift</label>
            <select id="dp-shift" value={form.shift} onChange={set("shift")}>
              {SHIFTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="rt-field">
            <label htmlFor="dp-status">Duty status</label>
            <select id="dp-status" value={form.duty} onChange={set("duty")}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {!isEdit && (
            <div className="rt-field rt-field--full">
              <label htmlFor="dp-password">Temporary password</label>
              <input id="dp-password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
              {errors.password ? (
                <p className="rt-error">{errors.password}</p>
              ) : (
                <p className="rt-hint">The dispatcher should change this after the first sign-in.</p>
              )}
            </div>
          )}
        </div>

        {errors.form && <p className="rt-error" style={{ padding: "0 22px" }}>{errors.form}</p>}

        <div className="rt-modal__foot">
          <button type="button" className="admin-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add dispatcher"}
          </button>
        </div>
      </form>
    </div>
  );
}
