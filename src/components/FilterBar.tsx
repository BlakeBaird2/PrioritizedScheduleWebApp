"use client";

import { useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ASSIGNMENT_TYPES, type AssignmentType } from "@/lib/types";
import { typeIconClass, typeMeta } from "@/lib/ui";
import { courseStyle, useApp } from "./context";

export function FilterBar() {
  const { model, filters, setFilters, now } = useApp();
  const courses = model.visibleCourses;

  const remaining = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of model.tasks) {
      if (t.done || !t.courseId || !t.dueAt || Date.parse(t.dueAt) < now.getTime()) continue;
      m.set(t.courseId, (m.get(t.courseId) ?? 0) + 1);
    }
    return m;
  }, [model.tasks, now]);

  const presentTypes = useMemo(() => {
    const s = new Set<AssignmentType>(model.tasks.map((t) => t.type));
    return ASSIGNMENT_TYPES.filter((t) => s.has(t));
  }, [model.tasks]);

  const toggleCourse = (id: string) =>
    setFilters((f) => {
      if (f.courses === null) return { ...f, courses: [id] };
      const next = f.courses.includes(id) ? f.courses.filter((x) => x !== id) : [...f.courses, id];
      return { ...f, courses: next.length === 0 || next.length === courses.length ? null : next };
    });

  const toggleType = (t: AssignmentType) =>
    setFilters((f) => {
      if (f.types === null) return { ...f, types: [t] };
      const next = f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t];
      return { ...f, types: next.length === 0 || next.length === presentTypes.length ? null : next };
    });

  if (courses.length === 0 && presentTypes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {courses.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="pill" aria-pressed={filters.courses === null} onClick={() => setFilters((f) => ({ ...f, courses: null }))}>
            All classes
          </button>
          {courses.map((c) => {
            const on = filters.courses === null || filters.courses.includes(c.id);
            const n = remaining.get(c.id) ?? 0;
            return (
              <button key={c.id} type="button" className="pill pill-course" style={courseStyle(c.color)} aria-pressed={on} onClick={() => toggleCourse(c.id)} title={c.title}>
                <span className="course-dot" />
                <span className="course-text">{c.code}</span>
                {n > 0 ? <span className="text-[11px] text-muted tabular-nums">{n}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {presentTypes.length > 1
          ? presentTypes.map((t) => {
              const meta = typeMeta(t);
              const on = filters.types === null || filters.types.includes(t);
              return (
                <button key={t} type="button" className="pill" aria-pressed={on} onClick={() => toggleType(t)}>
                  <meta.icon size={13} strokeWidth={2.25} className={typeIconClass(t)} />
                  {meta.plural}
                </button>
              );
            })
          : null}
        {filters.types !== null ? (
          <button type="button" className="pill" aria-pressed={true} onClick={() => setFilters((f) => ({ ...f, types: null }))}>
            All types
          </button>
        ) : null}
        <button
          type="button"
          className="pill ml-auto"
          aria-pressed={true}
          onClick={() => setFilters((f) => ({ ...f, showCompleted: !f.showCompleted }))}
          title={filters.showCompleted ? "Hide finished work" : "Show finished work"}
        >
          {filters.showCompleted ? <Eye size={13} className="text-ok" /> : <EyeOff size={13} className="text-muted" />}
          {filters.showCompleted ? "Showing done" : "Done hidden"}
        </button>
      </div>
    </div>
  );
}
