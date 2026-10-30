import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { subjectAppearance } from "./subject-appearance";
import "./dashboard.css";

export function DashboardSubjects({
  subjects,
}: {
  subjects: { name: string; key: string }[];
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft < 2,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [subjects]);
  function scroll(direction: number) {
    const element = rail.current;
    if (element)
      element.scrollBy({
        left: direction * element.clientWidth * 0.8,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <section
      aria-label="Your subject shortcuts"
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-100/60 sm:p-5"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
          <LayoutGrid size={19} aria-hidden="true" />
          Jump into a subject
        </h2>
        <Link
          to="/student/my-assignments"
          className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          Browse all <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      <div
        ref={rail}
        id="dashboard-subjects"
        className="dashboard-subjects flex snap-x snap-proximity gap-3 overflow-x-auto pb-3 pt-1"
      >
        {subjects.map(({ name, key: groupKey }) => {
          const { Icon, tone, key } = subjectAppearance(name);
          return (
            <Link
              key={groupKey}
              to={`/student/my-assignments?subject=${encodeURIComponent(groupKey)}`}
              className="group flex min-h-32 w-[132px] shrink-0 snap-start flex-col items-center gap-3 rounded-xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/60 px-3 py-4 text-center transition hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:w-[145px]"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}
              >
                <Icon
                  size={25}
                  strokeWidth={1.8}
                  data-subject-icon={key}
                  aria-hidden="true"
                />
              </span>
              <span className="text-xs font-semibold leading-5 text-slate-800 [overflow-wrap:anywhere]">
                {name}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          aria-label="Scroll subjects left"
          aria-controls="dashboard-subjects"
          disabled={edges.start}
          onClick={() => scroll(-1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 disabled:opacity-25"
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <span className="text-[10px] text-slate-400">
          {subjects.length} subjects · swipe or use the arrows
        </span>
        <button
          type="button"
          aria-label="Scroll subjects right"
          aria-controls="dashboard-subjects"
          disabled={edges.end}
          onClick={() => scroll(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 disabled:opacity-25"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
