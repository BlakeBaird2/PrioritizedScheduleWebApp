"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { randomId } from "@/lib/workspace";
import { ASSIGNMENT_TYPES, type AssignmentType } from "@/lib/types";
import { duration, typeMeta } from "@/lib/ui";
import { useApp } from "./context";

const ESTIMATES = [15, 30, 45, 60, 90, 120, 180, 240];

/** For work no calendar knows about: a paper, a study session, a form to fill in. */
export function AddTaskDialog({ onClose }: { onClose: () => void }) {
  const { model, ws, update, toast } = useApp();
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState<AssignmentType>("assignment");
  const [date, setDate] = useState(() => format(new Date(Date.now() + 86_400_000), "yyyy-MM-dd"));
  const [time, setTime] = useState("23:59");
  const [estimate, setEstimate] = useState<number | null>(null);
  const minutes = estimate ?? ws.prefs.estimates[type];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = randomId();
    let dueAt: string | null = null;
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = (time || "23:59").split(":").map(Number);
      dueAt = new Date(y, m - 1, d, hh, mm).toISOString();
    }
    update((w) => ({
      ...w,
      manualTasks: [...w.manualTasks, { id, title: title.trim().slice(0, 140), courseId: courseId || null, type, dueAt }],
      estimates: estimate !== null ? { ...w.estimates, [`manual:${id}`]: estimate } : w.estimates,
    }));
    toast("Added to your plan");
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 fade-in" onClick={onClose} aria-hidden />
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        className="fixed z-50 inset-x-4 top-[8vh] mx-auto max-w-md card p-5 fade-in space-y-4 max-h-[84dvh] overflow-y-auto"
      >
        <div className="flex items-center">
          <h2 id="add-title" className="text-base font-semibold flex-1">
            Add a task
          </h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <input className="input" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={140} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Class
            <select className="input mt-1" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">No class</option>
              {model.visibleCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Kind
            <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value as AssignmentType)}>
              {ASSIGNMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeMeta(t).label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Due date
            <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Due time
            <input type="time" className="input mt-1" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
          </label>
        </div>
        <div>
          <div className="text-xs text-muted mb-1.5">Time it needs</div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...ESTIMATES, minutes])]
              .sort((a, b) => a - b)
              .map((m) => (
                <button key={m} type="button" className="pill" aria-pressed={minutes === m} onClick={() => setEstimate(m)}>
                  {duration(m)}
                </button>
              ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!title.trim()}>
            Add task
          </button>
        </div>
      </form>
    </>
  );
}
