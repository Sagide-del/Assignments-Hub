import { useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
// Registers the \ce{...} chemistry-equation macros onto the SAME katex
// module Quill's built-in "formula" format uses (window.katex below) — after
// this import, typing \ce{H2O} or \ce{2Mg + O2 -> 2MgO} inside the formula
// editor renders correctly, no separate "chemistry mode" needed.
import 'katex/contrib/mhchem';
import { uploadsApi } from '../../../api/uploads.api';

// Quill's built-in "formula" toolbar button (the fx icon) looks for a
// global `window.katex` at click time — this is the one place that's set,
// before any <RichTextEditor> can mount.
(window as unknown as { katex: typeof katex }).katex = katex;

// Assignment content images go through the same authenticated /uploads/single
// endpoint every other upload in this app uses (teacher attachments, student
// FILE_UPLOAD answers, school logo) — see uploadsApi.uploadSingle.
async function imageHandler(this: { quill: InstanceType<typeof Quill> }) {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/png,image/jpeg,image/gif,image/webp');
  input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await uploadsApi.uploadSingle(file);
      const range = this.quill.getSelection(true);
      this.quill.insertEmbed(range?.index ?? 0, 'image', result.url, 'user');
      this.quill.setSelection((range?.index ?? 0) + 1, 0);
    } catch {
      window.alert('Image upload failed. Please try again.');
    }
  };
}

const TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['formula', 'image'],
  ['clean'],
];

// Rich text body editor for one question in the teacher Rich Editor (see
// CreateAssignmentRich.tsx). Supports bold/italic/lists/quotes, a "fx"
// button that inserts a KaTeX-rendered math OR chemistry equation (type
// plain LaTeX for math, or \ce{...} for a chemical formula/reaction —
// both render through the same button), and an image button that uploads
// straight to this app's /uploads endpoint and embeds the result.
//
// `value`/`onChange` carry the question's HTML (Quill's rendered
// innerHTML) — this is exactly what gets sent to the backend as
// Question.contentHtml, and what RichContent.tsx sanitizes + renders back
// on the student/marking side.
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR,
        handlers: { image: imageHandler },
      },
    }),
    [],
  );

  // ReactQuill needs a stable `modules` object (recreating it every render
  // reinitializes the toolbar) — useMemo above with an empty dep array
  // covers that; the ref just guards against relying on Quill internals
  // beyond what the wrapper exposes.
  const quillRef = useRef<InstanceType<typeof ReactQuill> | null>(null);

  return (
    <div className="rich-text-editor overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder ?? 'Question text — type your question, insert an equation or image if needed'}
      />
    </div>
  );
}
