import { useEffect, useId, useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/contrib/mhchem';
import { uploadsApi } from '../../api/uploads.api';

(window as unknown as { katex: typeof katex }).katex = katex;

type ToolbarContext = { quill: InstanceType<typeof Quill> };

function insertFormula(quill: InstanceType<typeof Quill>, expression: string) {
  const range = quill.getSelection(true);
  const index = range?.index ?? quill.getLength();
  quill.insertEmbed(index, 'formula', expression, 'user');
  quill.insertText(index + 1, ' ', 'user');
  quill.setSelection(index + 2, 0);
}

function mathHandler(this: ToolbarContext) {
  const expression = window.prompt('Enter a math expression (for example: x^2 + y^2)');
  if (expression?.trim()) insertFormula(this.quill, expression.trim());
}

function chemistryHandler(this: ToolbarContext) {
  const equation = window.prompt('Enter a chemical formula or equation (for example: 2H2 + O2 -> 2H2O)');
  if (!equation?.trim()) return;
  const value = equation.trim();
  insertFormula(this.quill, value.startsWith('\\ce{') ? value : `\\ce{${value}}`);
}

async function imageHandler(this: ToolbarContext) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/gif,image/webp';
  input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await uploadsApi.uploadSingle(file);
      const range = this.quill.getSelection(true);
      const index = range?.index ?? this.quill.getLength();
      this.quill.insertEmbed(index, 'image', result.url, 'user');
      this.quill.setSelection(index + 1, 0);
    } catch {
      window.alert('Image upload failed. Please try again.');
    }
  };
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const toolbarId = `rich-toolbar-${useId().replace(/:/g, '')}`;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<InstanceType<typeof ReactQuill> | null>(null);
  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          formula: mathHandler,
          chemistry: chemistryHandler,
          image: imageHandler,
        },
      },
    }),
    [toolbarId],
  );

  useEffect(() => {
    const toolbar = editorRef.current?.querySelector('.ql-toolbar');
    toolbar?.querySelector('.ql-formula')?.setAttribute('aria-label', 'Insert math equation');
    toolbar?.querySelector('.ql-chemistry')?.setAttribute('aria-label', 'Insert chemical equation');
    toolbar?.querySelector('.ql-image')?.setAttribute('aria-label', 'Upload graph or image');
  }, []);

  return (
    <div ref={editorRef} className="rich-text-editor overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div id={toolbarId}>
        <span className="ql-formats">
          <button type="button" className="ql-bold" />
          <button type="button" className="ql-italic" />
          <button type="button" className="ql-underline" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-list" value="ordered" />
          <button type="button" className="ql-list" value="bullet" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-formula" title="Math equation" />
          <button type="button" className="ql-chemistry rich-toolbar-text-button" title="Chemical equation">Chem</button>
          <button type="button" className="ql-image" title="Upload graph or image" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-clean" />
        </span>
      </div>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder ?? 'Write your response'}
      />
    </div>
  );
}
