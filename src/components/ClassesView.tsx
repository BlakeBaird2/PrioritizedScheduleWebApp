"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, EyeOff, Pencil } from "lucide-react";
import { COURSE_COLORS } from "@/lib/model";
import type { Course, CourseEdit, Task } from "@/lib/types";
import { applyFilters, duration, plural, relativeDue, typeIconClass, typeMeta } from "@/lib/ui";
import { courseStyle, useApp } from "./context";
import { Switch } from "./ScheduleSettings";
import { TaskRow } from "./TaskRow";

export function ClassesView() {
  const { model } = useApp();
  const [showHidden, setShowHidden] = useState(false);
  const hidden = model.courses.filter((c) => c.hidden);

  if (model.courses.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold">No classes yet</p>
        <p className="mt-1 text-sm text-muted">Classes appear on their own once you add a school calendar in Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {model.visibleCourses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
      {hidden.length > 0 ? (
        <section>
          <button type="button" className="btn" onClick={() => setShowHidden((s) => !s)}>
            <EyeOff size={14} />
            {plural(hidden.length, "hidden class", "hidden classes")}
            <ChevronDown size={14} className={showHidden ? "rotate-180 transition" : "transition"} />
          </button>
          {showHidden ? (
            <div className="grid gap-3 md:grid-cols-2 mt-3">
              {hidden.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const PAGE = 5;

function CourseCard({ course }: { course: Course }) {
  const { model, now, filters, snapshot } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const feed = model.feedById.get(course.feedId);

  const stats = useMemo(() => {
    const all = model.tasks.filter((t) => t.courseId === course.id);
    const inView = applyFilters(all, { ...filters, courses: null });
    const overdue: Task[] = [];
    const ahead: Task[] = [];
    for (const t of inView) {
      const due = t.dueAt ? Date.parse(t.dueAt) : null;
      if (due !== null && due < now.getTime() && !t.done) {
        if (due > now.getTime() - 30 * 86_400_000) overdue.push(t);
      } else if (due === null || due >= now.getTime() - 86_400_000) ahead.push(t);
    }
    const done = all.filter((t) => t.done).length;
    const workLeft = [...overdue, ...ahead].filter((t) => !t.done).reduce((s, t) => s + t.estimate, 0);
    const types = new Map<Task["type"], number>();
    for (const t of all) types.set(t.type, (types.get(t.type) ?? 0) + 1);
    return { overdue, ahead, done, total: all.length, workLeft, types: [...types.entries()].sort((a, b) => b[1] - a[1]) };
  }, [model.tasks, course.id, filters, now]);

  const original = snapshot.feeds[course.feedId]?.result?.courses.find((c) => `${course.feedId}:${c.key}` === course.id);
  const next = stats.ahead.find((t) => !t.done && t.dueAt);
  const shown = expanded ? stats.ahead : stats.ahead.slice(0, PAGE);
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <section className={`course-item card p-4 pl-5 flex flex-col ${course.hidden ? "opacity-70" : ""}`} style={courseStyle(course.color)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-[0.95rem] truncate" title={course.title}>
              {course.title}
            </h2>
            {course.code !== course.title ? (
              <span className="course-chip rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide shrink-0">{course.code}</span>
            ) : null}
          </div>
          <p className="text-xs text-muted truncate">from {feed?.name ?? "a calendar"}</p>
        </div>
        {course.url ? (
          <a href={course.url} target="_blank" rel="noreferrer" className="btn btn-icon" title="Open the class site" aria-label={`Open ${course.code}`}>
            <ExternalLink size={14} />
          </a>
        ) : null}
        <button type="button" className="btn btn-icon" onClick={() => setEditing((e) => !e)} aria-label={`Edit ${course.code}`} title="Rename, recolour or hide">
          <Pencil size={14} />
        </button>
      </div>

      {editing ? <CourseEditor course={course} original={original} onDone={() => setEditing(false)} /> : null}

      <div className="mt-3 flex items-baseline gap-2 text-xs flex-wrap">
        {stats.overdue.length > 0 ? <span className="text-danger font-medium">{stats.overdue.length} overdue</span> : null}
        <span className="text-muted">{plural(stats.ahead.filter((t) => !t.done).length, "item")} ahead</span>
        {stats.workLeft > 0 ? <span className="text-muted">· about {duration(stats.workLeft)} of work</span> : null}
        <span className="ml-auto text-faint tabular-nums">
          {stats.done}/{stats.total} done
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full course-bar opacity-80 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      {next?.dueAt ? (
        <div className="mt-3 text-xs text-muted">
          Next up: <span className="text-fg font-medium">{next.title}</span> <span className="text-faint">· {relativeDue(new Date(next.dueAt), now)}</span>
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5">
        {stats.overdue.map((t) => (
          <TaskRow key={t.id} task={t} showDate hideCourse />
        ))}
        {shown.map((t) => (
          <TaskRow key={t.id} task={t} showDate hideCourse />
        ))}
        {stats.ahead.length === 0 && stats.overdue.length === 0 ? <p className="text-sm text-muted py-2">Nothing left in view for this class.</p> : null}
      </div>
      {stats.ahead.length > PAGE ? (
        <button type="button" className="btn mt-2.5 self-start" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `Show ${stats.ahead.length - PAGE} more`}
        </button>
      ) : null}

      {stats.types.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-x-3 gap-y-1">
          {stats.types.map(([t, n]) => {
            const meta = typeMeta(t);
            return (
              <span key={t} className="inline-flex items-center gap-1 text-[11px] text-muted">
                <meta.icon size={11} className={typeIconClass(t)} />
                {n} {n === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()}
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function CourseEditor({ course, original, onDone }: { course: Course; original?: { code: string; title: string }; onDone: () => void }) {
  const { update } = useApp();
  const [code, setCode] = useState(course.code);
  const [title, setTitle] = useState(course.title);
  const [color, setColor] = useState(course.color);
  const [hidden, setHidden] = useState(course.hidden);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const edit: CourseEdit = {};
    if (code.trim() && code.trim() !== original?.code) edit.code = code.trim().slice(0, 24);
    if (title.trim() && title.trim() !== original?.title) edit.title = title.trim().slice(0, 80);
    edit.color = color;
    if (hidden) edit.hidden = true;
    update((w) => ({ ...w, courseEdits: { ...w.courseEdits, [course.id]: edit } }));
    onDone();
  };

  const reset = () => {
    update((w) => {
      const courseEdits = { ...w.courseEdits };
      delete courseEdits[course.id];
      return { ...w, courseEdits };
    });
    onDone();
  };

  return (
    <form onSubmit={save} className="mt-3 rounded-xl border border-line bg-surface-2/50 p-3 space-y-3">
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <label className="text-xs text-muted">
          Short name
          <input className="input input-sm !w-full mt-1" value={code} onChange={(e) => setCode(e.target.value)} maxLength={24} />
        </label>
        <label className="text-xs text-muted">
          Full name
          <input className="input input-sm !w-full mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
        {COURSE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-surface ring-fg/60" : "hover:scale-110"}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <label className="flex items-center gap-2.5 text-sm">
        <Switch checked={hidden} onChange={setHidden} label="Hide this class" />
        Hide this class and leave its work out of the plan
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary !py-1.5">
          Save
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="btn ml-auto" onClick={reset} title="Go back to the name and colour from the calendar">
          Reset
        </button>
      </div>
    </form>
  );
}
