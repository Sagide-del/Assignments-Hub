import { useRef, useState } from "react";
import {
  BookOpen,
  CodeXml,
  Expand,
  FlaskConical,
  LayoutDashboard,
  X,
} from "lucide-react";

const previews = [
  {
    id: "respiratory",
    label: "3D STEM labs",
    Icon: FlaskConical,
    title: "Explore the respiratory system",
    context: "Grade 11 · Biology",
    description:
      "Explore lung anatomy, change breathing settings and record observations in the practical workspace.",
    alt: "Actual Assignment Hub respiratory simulator showing a labelled 3D lung model, anatomy controls, breathing rate and tidal volume settings.",
    source: { width: 1440, height: 1767 },
    crop: { x: 294, y: 290, width: 1104, height: 759 },
  },
  {
    id: "subject-library",
    label: "Assignments",
    Icon: BookOpen,
    title: "Find your subject. Choose a topic.",
    context: "Grade 7 · Subject library",
    description:
      "Browse subjects, explore their topics and open the assignment you want to work on.",
    alt: "Actual Assignment Hub My Assignments screen with subject cards for Agriculture, English, Integrated Science and other Grade 7 subjects.",
    source: { width: 3200, height: 2000 },
    crop: { x: 675, y: 180, width: 2400, height: 1650 },
  },
  {
    id: "skills",
    label: "Learn a Skill",
    Icon: CodeXml,
    title: "Build skills through guided lessons",
    context: "Skills workspace",
    description:
      "Explore lessons and practical projects in areas such as first aid, robotics and coding.",
    alt: "Actual Assignment Hub Learn a Skill screen with First Aid Foundations and Robotics with Sensors and Arduino course cards.",
    source: { width: 3200, height: 2000 },
    crop: { x: 675, y: 300, width: 2400, height: 1650 },
  },
  {
    id: "dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    title: "Your next step, in one place",
    context: "Grade 7 · Student dashboard",
    description:
      "See assignment progress, find your next task and return to your learning tools.",
    alt: "Actual Assignment Hub student dashboard with assignment progress, upcoming work and links to learning tools.",
    source: { width: 3200, height: 2000 },
    crop: { x: 0, y: 0, width: 2909.09, height: 2000 },
  },
];

export function HomeProductPreview() {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = previews[selected];
  const PreviewIcon = preview.Icon;
  const image = (full = false) =>
    full ? (
      <img
        src={`/product-previews/${preview.id}.webp`}
        alt={preview.alt}
        width={preview.source.width}
        height={preview.source.height}
        className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
      />
    ) : (
      <div className="relative aspect-[16/11] overflow-hidden bg-[#f7f9fb]">
        <img
          src={`/product-previews/${preview.id}.webp`}
          alt={preview.alt}
          width={preview.source.width}
          height={preview.source.height}
          fetchPriority={selected === 0 ? "high" : "auto"}
          decoding="async"
          className="absolute h-auto max-w-none"
          style={{
            width: `${(preview.source.width / preview.crop.width) * 100}%`,
            left: `${(-preview.crop.x / preview.crop.width) * 100}%`,
            top: `${(-preview.crop.y / preview.crop.height) * 100}%`,
          }}
        />
      </div>
    );
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span
          className="h-2 w-2 rounded-full bg-[#607d00]"
          aria-hidden="true"
        />
        Inside Assignment Hub · Actual product views
      </div>
      <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,24,32,0.14)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#101820] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <PreviewIcon
              size={16}
              className="shrink-0 text-[#B5E61D]"
              aria-hidden="true"
            />
            <span className="truncate text-xs font-semibold text-white">
              {preview.context}
            </span>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5E61D]"
            aria-label="Enlarge product screenshot"
          >
            <Expand size={14} aria-hidden="true" /> Enlarge
          </button>
        </div>
        <div id="home-product-image">{image()}</div>
        <figcaption
          className="border-t border-slate-100 p-4 sm:p-5"
          aria-live="polite"
        >
          <h2 className="text-base font-bold text-[#101820]">
            {preview.title}
          </h2>
          <p className="mt-1.5 min-h-[3.75rem] text-sm leading-6 text-slate-600">
            {preview.description}
          </p>
        </figcaption>
      </figure>
      <div
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Choose a product preview"
      >
        {previews.map(({ id, label, Icon }, index) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelected(index)}
            aria-pressed={selected === index}
            aria-controls="home-product-image"
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#607d00] ${selected === index ? "border-[#101820] bg-[#101820] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}
          >
            <Icon
              size={15}
              className={
                selected === index ? "shrink-0 text-[#B5E61D]" : "shrink-0"
              }
              aria-hidden="true"
            />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Illustrative workspace records. Available activities depend on grade and
        subject.
      </p>
      <dialog
        ref={dialog}
        aria-label="Product screenshot"
        className="m-auto w-[calc(100%_-_2rem)] max-w-6xl rounded-2xl bg-white p-0 text-[#101820] shadow-2xl backdrop:bg-[#101820]/75"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <p className="text-sm font-bold">{preview.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {preview.context} · Actual product screenshot
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close product screenshot"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-auto p-2 sm:p-4">{image(true)}</div>
      </dialog>
    </div>
  );
}
