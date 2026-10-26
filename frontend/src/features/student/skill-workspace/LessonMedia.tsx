import { useRef, useState } from 'react';
import { Expand, ExternalLink, Image as ImageIcon, RotateCcw, X } from 'lucide-react';
import type { LessonImage } from './content/types';

export function LessonMedia({
  image,
  images = [],
  title,
}: {
  image: LessonImage;
  images?: LessonImage[];
  title: string;
}) {
  const all = [image, ...images];
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const modal = useRef<HTMLDialogElement>(null);
  const current = all[selected];
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
          <ImageIcon className="h-4 w-4 text-[#607D00]" aria-hidden="true" />
          Learn visually
        </p>
        <button
          type="button"
          onClick={() => modal.current?.showModal()}
          disabled={failed}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-[#466000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#607D00] disabled:opacity-40"
        >
          <Expand className="h-3.5 w-3.5" aria-hidden="true" />
          View larger
        </button>
      </div>
      {all.length > 1 ? (
        <div
          role="group"
          aria-label="Choose a lesson illustration"
          className="flex flex-wrap gap-2 px-4 pt-3"
        >
          {all.map((item, index) => (
            <button
              key={item.src}
              type="button"
              aria-pressed={selected === index}
              onClick={() => {
                setSelected(index);
                setFailed(false);
              }}
              className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${selected === index ? 'bg-[#101820] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {item.label ?? `Illustration ${index + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      {failed ? (
        <div role="alert" className="m-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p>The illustration could not be loaded. The lesson instructions are still available below.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
            className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold underline"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry illustration
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => modal.current?.showModal()}
          aria-label={`Enlarge illustration: ${title}`}
          className="block w-full p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#607D00]"
        >
          <img
            key={`${current.src}-${attempt}`}
            src={current.src + (attempt ? `?retry=${attempt}` : '')}
            alt={current.alt}
            width={current.width ?? 800}
            height={current.height ?? 320}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-auto w-full rounded-xl"
          />
        </button>
      )}
      <figcaption className="space-y-2 px-4 pb-4">
        <p className="text-xs leading-6 text-slate-600">{current.caption}</p>
        <p className="text-[11px] leading-5 text-slate-400">
          Illustrated learning scenario. Follow the written guidance; images do not establish a diagnosis or
          replace trained assessment.
        </p>
      </figcaption>
      <dialog
        ref={modal}
        aria-label={`Lesson illustration: ${title}`}
        className="w-[min(1100px,95vw)] max-w-none rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-950/70"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-[#101820]">{title}</h3>
          <button
            type="button"
            autoFocus
            onClick={() => modal.current?.close()}
            aria-label="Close illustration"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4">
          <img
            src={current.src}
            alt={current.alt}
            width={current.width ?? 800}
            height={current.height ?? 320}
            className="max-h-[70vh] w-full object-contain"
          />
          <p className="mt-4 text-sm leading-7 text-slate-600">{current.caption}</p>
          <a
            href={current.src}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#466000]"
          >
            Open original image
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </dialog>
    </figure>
  );
}
