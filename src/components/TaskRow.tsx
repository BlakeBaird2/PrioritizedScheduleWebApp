"use client";

import { Check, CircleAlert, Clock3 } from "lucide-react";
import type { Task } from "@/lib/types";
import { differenceInCalendarDays, format } from "date-fns";
import { clock, dueDate, duration, relativeDue, typeMeta, whenLabel } from "@/lib/ui";
import { courseStyle, useApp } from "./context";
import { TypeChip } from "./TypeChip";

export function DoneToggle({ task, size = "md" }: { task: Task; size?: "sm" | "md" }) {
  const { toggleDone } = useApp();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={task.done}
      aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
      title={task.done ? "Mark as not done" : "Mark as done"}
      className="check"
      style={size === "sm" ? { width: "1.125rem", height: "1.125rem" } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        toggleDone(task);
      }}
    >
      <Check size={size === "sm" ? 11 : 14} strokeWidth={3.5} />
    </button>
  );
}

/** Where the plan put this task, or that it won't fit, in plain words. */
export function PlanNote({ task }: { task: Task }) {
  const { index, now } = useApp();
  if (task.done) return null;
  if (index.atRisk.has(task.id)) {
    return (
      <span className="inline-flex items-center gap-1 text-danger font-medium">
        <CircleAlert size={12} />
        Won&apos;t fit in time
      </span>
    );
  }
  const first = index.blocks.get(task.id)?.[0];
  if (!first) return null;
  const days = differenceInCalendarDays(first.start, now);
  const day = days === 0 ? "today" : days === 1 ? "tomorrow" : format(first.start, "EEE");
  return (
    <span className="inline-flex items-center gap-1 text-accent font-medium">
      <Clock3 size={12} />
      Planned {day} {clock(first.start)}
    </span>
  );
}

/** One piece of work: checkbox, class colour edge, title, type, class, estimate, plan, due. */
export function TaskRow({ task, showDate = false, hideCourse = false }: { task: Task; showDate?: boolean; hideCourse?: boolean }) {
  const { model, select, now } = useApp();
  const course = task.courseId ? model.courseById.get(task.courseId) : undefined;
  const d = dueDate(task);
  const overdue = Boolean(d && d.getTime() < now.getTime() && !task.done);
  const meta = typeMeta(task.type);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => select({ kind: "task", id: task.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select({ kind: "task", id: task.id });
        }
      }}
      style={courseStyle(course?.color ?? "var(--line-strong)")}
      className={`group flex items-center gap-3 rounded-xl border border-line bg-surface pr-3 py-2.5 cursor-pointer hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
        hideCourse ? "pl-3 hover:border-line-strong" : "course-item"
      } ${task.done ? "row-done" : ""}`}
    >
      <DoneToggle task={task} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="row-title font-medium text-[0.9375rem] leading-snug truncate">{task.title}</span>
          {meta.loud ? <TypeChip type={task.type} /> : null}
        </div>
        <div className="mt-0.5 flex items-center gap-x-2 gap-y-0.5 text-xs text-muted min-w-0 flex-wrap">
          {!hideCourse && course ? <span className="course-text font-medium truncate max-w-[9rem]">{course.code}</span> : null}
          {!meta.loud ? (
            <span className="inline-flex items-center gap-1">
              <meta.icon size={12} />
              {meta.label}
            </span>
          ) : null}
          <span className="tabular-nums" title="Time this needs">
            {duration(task.estimate)}
          </span>
          <PlanNote task={task} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-[0.8125rem] font-medium tabular-nums ${overdue ? "text-danger" : ""}`}>
          {d ? (showDate ? whenLabel(d, now, !task.allDay) : task.allDay ? "All day" : clock(d)) : "No date"}
        </div>
        {d ? <div className={`text-[0.6875rem] ${overdue ? "text-danger" : "text-faint"}`}>{relativeDue(d, now)}</div> : null}
      </div>
    </div>
  );
}
