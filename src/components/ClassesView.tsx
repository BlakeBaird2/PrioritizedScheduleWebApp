"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, Pencil, Plus, X } from "lucide-react";
import { COURSE_COLORS } from "@/lib/model";
import type { Course, CourseEdit, Task } from "@/lib/types";
import { duration, relativeDue, typeIconClass, typeMeta, whenLabel } from "@/lib/ui";
import { courseStyle, useApp, wireGray } from "./context";
import { Switch } from "./ScheduleSettings";
import { DoneToggle } from "./TaskRow";
import { ClassTimesSummary, useClassTimes } from "./ClassTimes";

/**
 * Every class side by side, one column each, like the days of the week view:
 * the class at the top, then its work in the order it's due.
 */
export function ClassesView() {
  const { model, update } = useApp();
  const [editing, setEditing] = useState<Course | null>(null);
  const visible = model.visibleCourses;
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
    <div className="space-y-3">
      {visible.length > 0 ? (
        <div className="card overflow-x-auto scrollbar-thin snap-x snap-mandatory">
          <div className="grid divide-x divide-line" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(13.5rem, 1fr))` }}>
            {visible.map((c) => (
              <ClassColumn key={c.id} course={c} onEdit={() => setEditing(c)} />
            ))}
          </div>
        </div>
      ) : null}

      {hidden.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap text-sm text-muted">
          <span>Hidden:</span>
          {hidden.map((c) => (
            <button
              key={c.id}
              type="button"
              className="pill pill-course"
              aria-pressed={true}
              style={courseStyle(c.color)}
              title="Show this class again"
              onClick={() => update((w) => ({ ...w, courseEdits: { ...w.courseEdits, [c.id]: { ...w.courseEdits[c.id], hidden: undefined } } }))}
            >
              <span className="course-dot" />
              <span className="course-text">{c.code}</span>
              <Eye size={12} className="text-faint" />
            </button>
          ))}
        </div>
      ) : null}

      {editing ? <ClassEditDialog course={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

const PAGE = 8;

function ClassColumn({ course, onEdit }: { course: Course; onEdit: () => void }) {
  const { model, now } = useApp();
  const [expanded, setExpanded] = useState(false);
  const feed = model.feedById.get(course.feedId);

  const stats = useMemo(() => {
    const all = model.tasks.filter((t) => t.courseId === course.id);
    const t = now.getTime();
    // Late work from the last month first, then everything still to come.
    const late = all.filter((x) => !x.done && x.dueAt && Date.parse(x.dueAt) < t && Date.parse(x.dueAt) > t - 30 * 86_400_000);
    const ahead = all.filter((x) => !x.done && (!x.dueAt || Date.parse(x.dueAt) >= t));
    const done = all.filter((x) => x.done).length;
    const left = [...late, ...ahead];
    return { left, done, total: all.length, minutes: left.reduce((sum, x) => sum + x.estimate, 0) };
  }, [model.tasks, course.id, now]);

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const shown = expanded ? stats.left : stats.left.slice(0, PAGE);

  return (
    <section className="min-w-0 flex flex-col snap-start" style={courseStyle(course.color)}>
      <header className="px-3 pt-3 pb-2.5 border-b border-line bg-surface-2/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="course-dot" />
          <h2 className="course-text font-semibold text-[0.9375rem] truncate" title={course.title}>
            {course.code}
          </h2>
          <div className="ml-auto flex items-center shrink-0">
            {course.url ? (
              <a href={course.url} target="_blank" rel="noreferrer" className="p-1 text-faint hover:text-fg" title={`Open in ${feed?.name ?? "the class site"}`} aria-label={`Open ${course.code}`}>
                <ExternalLink size={14} />
              </a>
            ) : null}
            <button type="button" className="p-1 text-faint hover:text-fg" onClick={onEdit} title="Rename, recolour or hide" aria-label={`Edit ${course.code}`}>
              <Pencil size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted truncate" title={course.title}>
          {course.title !== course.code ? course.title : `from ${feed?.name ?? "a calendar"}`}
        </p>
        {/* Room for two lines, so every column's work starts at the same height. */}
        <div className="mt-1.5 min-h-[2.125rem]">
          <MeetsLine course={course} />
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full course-bar transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex items-center text-[11px] text-muted tabular-nums">
          <span>
            {stats.left.length} left{stats.minutes ? ` · about ${duration(stats.minutes)}` : ""}
          </span>
          <span className="ml-auto">
            {stats.done}/{stats.total} done
          </span>
        </div>
      </header>

      <ul className="p-2 space-y-1.5 flex-1">
        {shown.map((t) => (
          <ClassItem key={t.id} task={t} />
        ))}
        {stats.left.length === 0 ? <li className="px-1 py-3 text-xs text-muted text-center">All caught up</li> : null}
      </ul>
      {stats.left.length > PAGE ? (
        <button type="button" className="mx-2 mb-2 text-xs text-muted hover:text-fg rounded-lg py-1.5 hover:bg-surface-2 transition" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `${stats.left.length - PAGE} more`}
        </button>
      ) : null}
    </section>
  );
}

function ClassItem({ task }: { task: Task }) {
  const { select, now } = useApp();
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const late = due ? due.getTime() < now.getTime() : false;
  const meta = typeMeta(task.type);
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => select({ kind: "task", id: task.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter") select({ kind: "task", id: task.id });
      }}
      className="task-card flex items-start gap-2 px-2 py-1.5 cursor-pointer"
    >
      <span className="pt-px">
        <DoneToggle task={task} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug line-clamp-2">{task.title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
          {meta.loud ? <meta.icon size={11} className={typeIconClass(task.type)} strokeWidth={2.5} /> : null}
          <span className={late ? "text-danger font-medium" : ""}>{due ? (late ? relativeDue(due, now) : whenLabel(due, now, !task.allDay)) : "No due date"}</span>
        </div>
      </div>
    </li>
  );
}

function MeetsLine({ course }: { course: Course }) {
  const { openClassTimes } = useApp();
  const { any } = useClassTimes(course);
  if (any) {
    return (
      <button type="button" onClick={openClassTimes} className="text-left hover:opacity-80" title="Change class times">
        <ClassTimesSummary course={course} />
      </button>
    );
  }
  return (
    <button type="button" onClick={openClassTimes} className="inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline">
      <Plus size={12} />
      Add class times
    </button>
  );
}

function ClassEditDialog({ course, onClose }: { course: Course; onClose: () => void }) {
  const { snapshot } = useApp();
  const original = snapshot.feeds[course.feedId]?.result?.courses.find((c) => `${course.feedId}:${c.key}` === course.id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 fade-in" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={`Edit ${course.code}`} className="fixed z-50 inset-x-4 top-[12vh] mx-auto max-w-md card p-5 fade-in" style={courseStyle(course.color)}>
        <div className="flex items-center gap-2 mb-4">
          <span className="course-dot" />
          <h2 className="text-base font-semibold flex-1">Edit {course.code}</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <CourseEditor course={course} original={original} onDone={onClose} />
      </div>
    </>
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
    <form onSubmit={save} className="space-y-3">
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
            style={{ background: wireGray(c) }}
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
