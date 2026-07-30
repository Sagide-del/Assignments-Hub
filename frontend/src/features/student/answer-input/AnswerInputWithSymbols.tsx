import { useMemo, useRef, useState } from 'react';
import { apiErrorMessage } from '../../../api/axios';
import { resolveUploadUrl, uploadsApi } from '../../../api/uploads.api';
import { formatSmartText } from './smart-text';

const PRIMARY_SYMBOLS = ['√', 'π', '²', '³', '→', '×', '÷', '≤', '≥', '±'];
const MORE_SYMBOLS = [
  '½',
  '⅓',
  '¼',
  '¾',
  '≠',
  '≈',
  '∞',
  '∑',
  'Δ',
  'θ',
  'α',
  'β',
  'γ',
  '°',
  '₁',
  '₂',
  '₃',
  '₄',
  '⇌',
];

type SmartTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  inputMode?: 'text' | 'decimal';
  textareaRef: React.RefObject<HTMLTextAreaElement>;
};

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  inputMode = 'text',
  textareaRef,
}: SmartTextareaProps) {
  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const rawValue = event.target.value;
    const rawCursor = event.target.selectionStart;
    const nextValue = formatSmartText(rawValue);
    const nextCursor = formatSmartText(rawValue.slice(0, rawCursor)).length;
    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      rows={rows}
      inputMode={inputMode}
      autoComplete="off"
      spellCheck
      placeholder={placeholder}
      className="smart-answer-textarea w-full min-w-0 resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base leading-7 text-[#101820] outline-none transition focus:border-[#101820] focus:ring-2 focus:ring-[#B5E61D]/30 sm:rounded-[24px]"
    />
  );
}

type InlineSymbolToolbarProps = {
  onInsert: (symbol: string) => void;
  allowImageUpload?: boolean;
  uploading?: boolean;
  onImageSelected?: (file: File) => void;
};

export function InlineSymbolToolbar({
  onInsert,
  allowImageUpload = false,
  uploading = false,
  onImageSelected,
}: InlineSymbolToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const symbols = expanded ? [...PRIMARY_SYMBOLS, ...MORE_SYMBOLS] : PRIMARY_SYMBOLS;

  return (
    <div className="inline-symbol-toolbar" aria-label="Answer symbols and attachments">
      <div className="inline-symbol-scroll">
        {symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => onInsert(symbol)}
            className="inline-symbol-button"
            aria-label={`Insert ${symbol}`}
          >
            {symbol}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-symbol-more"
          aria-expanded={expanded}
        >
          {expanded ? 'Less' : 'More'}
        </button>
        {allowImageUpload ? (
          <>
            <button
              type="button"
              disabled={uploading}
              onClick={() => imageInputRef.current?.click()}
              className="inline-symbol-upload"
            >
              <CameraIcon />
              {uploading ? 'Uploading' : 'Add graph photo'}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImageSelected?.(file);
                event.target.value = '';
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

type ParsedEssayAnswer = {
  text: string;
  imageUrls: string[];
};

function parseEssayAnswer(value: string): ParsedEssayAnswer {
  if (!/<[a-z][\s\S]*>/i.test(value)) {
    return { text: value, imageUrls: [] };
  }

  const template = document.createElement('template');
  template.innerHTML = value;
  const imageUrls = Array.from(template.content.querySelectorAll<HTMLImageElement>('img[src]'))
    .map((image) => image.getAttribute('src'))
    .filter((source): source is string => Boolean(source));

  template.content.querySelectorAll<HTMLElement>('.ql-formula[data-value]').forEach((formula) => {
    formula.replaceWith(formula.dataset.value ?? '');
  });
  template.content.querySelectorAll('img, figure').forEach((element) => element.remove());
  template.content.querySelectorAll('br').forEach((lineBreak) => lineBreak.replaceWith('\n'));
  template.content.querySelectorAll('p, div, li').forEach((block) => block.append('\n'));

  return {
    text: (template.content.textContent ?? '').replace(/\n{3,}/g, '\n\n').trimEnd(),
    imageUrls,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function serializeEssayAnswer(text: string, imageUrls: string[]) {
  const textHtml = escapeHtml(text).replace(/\n/g, '<br>');
  const imageHtml = imageUrls
    .map(
      (url) =>
        `<figure><img src="${escapeHtml(url)}" alt="Student uploaded graph or working" /></figure>`,
    )
    .join('');
  return `<p>${textHtml || '<br>'}</p>${imageHtml}`;
}

type AnswerInputWithSymbolsProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  inputMode?: 'text' | 'decimal';
  allowImageUpload?: boolean;
};

export function AnswerInputWithSymbols({
  value,
  onChange,
  placeholder,
  rows = 4,
  inputMode = 'text',
  allowImageUpload = false,
}: AnswerInputWithSymbolsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null!);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const parsedAnswer = useMemo(
    () => (allowImageUpload ? parseEssayAnswer(value) : { text: value, imageUrls: [] }),
    [allowImageUpload, value],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function updateText(text: string) {
    onChange(
      allowImageUpload ? serializeEssayAnswer(text, parsedAnswer.imageUrls) : text,
    );
  }

  function insertSymbol(symbol: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? parsedAnswer.text.length;
    const end = textarea?.selectionEnd ?? start;
    const nextText =
      parsedAnswer.text.slice(0, start) + symbol + parsedAnswer.text.slice(end);
    const nextCursor = start + symbol.length;
    updateText(nextText);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function uploadImage(file: File) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('Choose a PNG, JPEG, or WebP image.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadsApi.uploadSingle(file);
      const latestAnswer = parseEssayAnswer(latestValueRef.current);
      onChange(
        serializeEssayAnswer(latestAnswer.text, [...latestAnswer.imageUrls, result.url]),
      );
    } catch (error) {
      setUploadError(apiErrorMessage(error, 'Could not upload this image'));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(imageUrl: string) {
    onChange(
      serializeEssayAnswer(
        parsedAnswer.text,
        parsedAnswer.imageUrls.filter((url) => url !== imageUrl),
      ),
    );
  }

  return (
    <div className="answer-input-with-symbols">
      <SmartTextarea
        value={parsedAnswer.text}
        onChange={updateText}
        placeholder={placeholder}
        rows={rows}
        inputMode={inputMode}
        textareaRef={textareaRef}
      />
      <InlineSymbolToolbar
        onInsert={insertSymbol}
        allowImageUpload={allowImageUpload}
        uploading={uploading}
        onImageSelected={uploadImage}
      />

      {parsedAnswer.imageUrls.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {parsedAnswer.imageUrls.map((imageUrl) => (
            <figure
              key={imageUrl}
              className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3"
            >
              <img
                src={resolveUploadUrl(imageUrl)}
                alt="Uploaded graph or handwritten working"
                className="max-h-64 w-full rounded-xl bg-white object-contain"
              />
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Graph photo attached</span>
                <button
                  type="button"
                  onClick={() => removeImage(imageUrl)}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-red-600"
                >
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {uploadError ? (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
