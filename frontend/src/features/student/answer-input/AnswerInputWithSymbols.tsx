import { useMemo, useRef, useState } from 'react';
import { apiErrorMessage } from '../../../api/axios';
import { resolveUploadUrl, uploadsApi } from '../../../api/uploads.api';
import { formatSmartText } from './smart-text';

type InsertToken = {
  name: string;
  label: string;
  value: string;
  cursorBack?: number;
};

type FunctionTab = 'symbols' | 'scientific' | 'statistics' | 'complex' | 'bases' | 'equations';

const PRIMARY_SYMBOLS: InsertToken[] = [
  { name: 'Square root', label: '√', value: '√' },
  { name: 'Pi', label: 'π', value: 'π' },
  { name: 'Square', label: 'x²', value: '²' },
  { name: 'Cube', label: 'x³', value: '³' },
  { name: 'Arrow', label: '→', value: '→' },
  { name: 'Multiply', label: '×', value: '×' },
  { name: 'Divide', label: '÷', value: '÷' },
  { name: 'Less than or equal', label: '≤', value: '≤' },
  { name: 'Greater than or equal', label: '≥', value: '≥' },
  { name: 'Plus or minus', label: '±', value: '±' },
];

const FUNCTION_TABS: { id: FunctionTab; label: string; tokens: InsertToken[] }[] = [
  {
    id: 'symbols',
    label: 'Symbols',
    tokens: [
      { name: 'One half', label: '½', value: '½' },
      { name: 'One third', label: '⅓', value: '⅓' },
      { name: 'One quarter', label: '¼', value: '¼' },
      { name: 'Three quarters', label: '¾', value: '¾' },
      { name: 'Not equal', label: '≠', value: '≠' },
      { name: 'Approximately equal', label: '≈', value: '≈' },
      { name: 'Infinity', label: '∞', value: '∞' },
      { name: 'Summation', label: '∑', value: '∑' },
      { name: 'Delta', label: 'Δ', value: 'Δ' },
      { name: 'Theta', label: 'θ', value: 'θ' },
      { name: 'Alpha', label: 'α', value: 'α' },
      { name: 'Beta', label: 'β', value: 'β' },
      { name: 'Gamma', label: 'γ', value: 'γ' },
      { name: 'Degree', label: '°', value: '°' },
      { name: 'Subscript one', label: '₁', value: '₁' },
      { name: 'Subscript two', label: '₂', value: '₂' },
      { name: 'Subscript three', label: '₃', value: '₃' },
      { name: 'Subscript four', label: '₄', value: '₄' },
      { name: 'Reversible reaction', label: '⇌', value: '⇌' },
    ],
  },
  {
    id: 'scientific',
    label: 'Scientific',
    tokens: [
      { name: 'Square', label: 'x²', value: '²' },
      { name: 'Cube', label: 'x³', value: '³' },
      { name: 'Power', label: 'xⁿ', value: '^' },
      { name: 'Square root', label: '√', value: '√' },
      { name: 'Cube root', label: '³√', value: '³√' },
      { name: 'nth root', label: 'ⁿ√', value: 'ⁿ√' },
      { name: 'Reciprocal', label: '1/x', value: '1/()', cursorBack: 1 },
      { name: 'Factorial', label: 'x!', value: '!' },
      { name: 'Pi', label: 'π', value: 'π' },
      { name: 'Exponent', label: 'EXP', value: '×10^' },
      { name: 'Logarithm', label: 'log', value: 'log()', cursorBack: 1 },
      { name: 'Natural logarithm', label: 'ln', value: 'ln()', cursorBack: 1 },
      { name: 'Sine', label: 'sin', value: 'sin()', cursorBack: 1 },
      { name: 'Cosine', label: 'cos', value: 'cos()', cursorBack: 1 },
      { name: 'Tangent', label: 'tan', value: 'tan()', cursorBack: 1 },
      { name: 'Inverse sine', label: 'sin⁻¹', value: 'sin⁻¹()', cursorBack: 1 },
      { name: 'Inverse cosine', label: 'cos⁻¹', value: 'cos⁻¹()', cursorBack: 1 },
      { name: 'Inverse tangent', label: 'tan⁻¹', value: 'tan⁻¹()', cursorBack: 1 },
      { name: 'Hyperbolic sine', label: 'sinh', value: 'sinh()', cursorBack: 1 },
      { name: 'Hyperbolic cosine', label: 'cosh', value: 'cosh()', cursorBack: 1 },
      { name: 'Hyperbolic tangent', label: 'tanh', value: 'tanh()', cursorBack: 1 },
      { name: 'Degrees', label: '°', value: '°' },
      { name: 'Minutes', label: '′', value: '′' },
      { name: 'Seconds', label: '″', value: '″' },
      { name: 'Polar coordinates', label: 'Pol()', value: 'Pol(,)', cursorBack: 2 },
      { name: 'Rectangular coordinates', label: 'Rec()', value: 'Rec(,)', cursorBack: 2 },
      { name: 'Absolute value', label: '|x|', value: '||', cursorBack: 1 },
      { name: 'Random number', label: 'Ran#', value: 'Ran#' },
      { name: 'Memory add', label: 'M+', value: 'M+' },
      { name: 'Memory subtract', label: 'M−', value: 'M−' },
      { name: 'Memory recall', label: 'MR', value: 'MR' },
      { name: 'Memory clear', label: 'MC', value: 'MC' },
    ],
  },
  {
    id: 'statistics',
    label: 'Statistics',
    tokens: [
      { name: 'Sum', label: 'Σx', value: 'Σx' },
      { name: 'Mean', label: 'x̄', value: 'x̄' },
      { name: 'Population standard deviation', label: 'σn', value: 'σn' },
      { name: 'Sample standard deviation', label: 'σn−1', value: 'σn−1' },
      { name: 'Variance', label: 'σ²', value: 'σ²' },
      { name: 'Minimum', label: 'min', value: 'min()', cursorBack: 1 },
      { name: 'Maximum', label: 'max', value: 'max()', cursorBack: 1 },
      { name: 'Count', label: 'n', value: 'n' },
      { name: 'Regression intercept', label: 'a', value: 'a' },
      { name: 'Regression slope', label: 'b', value: 'b' },
      { name: 'Correlation coefficient', label: 'r', value: 'r' },
    ],
  },
  {
    id: 'complex',
    label: 'Complex',
    tokens: [
      { name: 'Imaginary unit', label: 'i', value: 'i' },
      { name: 'Real part', label: 'Re()', value: 'Re()', cursorBack: 1 },
      { name: 'Imaginary part', label: 'Im()', value: 'Im()', cursorBack: 1 },
      { name: 'Argument', label: 'arg()', value: 'arg()', cursorBack: 1 },
      { name: 'Complex mode', label: 'CMPLX', value: 'CMPLX' },
    ],
  },
  {
    id: 'bases',
    label: 'Bases',
    tokens: [
      { name: 'Binary', label: 'bin', value: 'bin()₂', cursorBack: 2 },
      { name: 'Octal', label: 'oct', value: 'oct()₈', cursorBack: 2 },
      { name: 'Decimal', label: 'dec', value: 'dec()', cursorBack: 1 },
      { name: 'Hexadecimal', label: 'hex', value: 'hex()₁₆', cursorBack: 3 },
    ],
  },
  {
    id: 'equations',
    label: 'Equations',
    tokens: [
      { name: 'Linear equation', label: 'ax+b=c', value: 'ax + b = c' },
      { name: 'Quadratic equation', label: 'ax²+bx+c=0', value: 'ax² + bx + c = 0' },
      {
        name: 'Simultaneous equations',
        label: '2 equations',
        value: 'ax + by = c\ndx + ey = f',
      },
    ],
  },
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
  onInsert: (value: string, cursorBack?: number) => void;
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
  const [activeTab, setActiveTab] = useState<FunctionTab | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const activeFunctions = FUNCTION_TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="inline-symbol-toolbar" aria-label="Answer symbols and attachments">
      <div className="inline-symbol-scroll">
        {PRIMARY_SYMBOLS.map((symbol) => (
          <button
            key={symbol.name}
            type="button"
            onClick={() => onInsert(symbol.value, symbol.cursorBack)}
            className="inline-symbol-button"
            aria-label={`Insert ${symbol.name}`}
          >
            {symbol.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setActiveTab((current) => (current === null ? 'scientific' : null))
          }
          className="inline-symbol-more"
          aria-expanded={activeTab !== null}
        >
          {activeTab === null ? 'Maths functions' : 'Close functions'}
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

      {activeTab !== null ? (
        <div className="inline-function-panel">
          <div className="inline-function-tabs" role="tablist" aria-label="Maths function categories">
            {FUNCTION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-function-tab ${
                  activeTab === tab.id ? 'inline-function-tab--active' : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            className="inline-function-grid"
            role="tabpanel"
            aria-label={`${activeFunctions?.label ?? 'Maths'} functions`}
          >
            {activeFunctions?.tokens.map((token) => (
              <button
                key={`${activeFunctions.id}-${token.name}`}
                type="button"
                onClick={() => onInsert(token.value, token.cursorBack)}
                className="inline-function-button"
                aria-label={`Insert ${token.name}`}
                title={token.name}
              >
                <span className="inline-function-name">{token.name}</span>
                <span className="inline-function-symbol">{token.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
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

  function insertSymbol(symbol: string, cursorBack = 0) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? parsedAnswer.text.length;
    const end = textarea?.selectionEnd ?? start;
    const nextText =
      parsedAnswer.text.slice(0, start) + symbol + parsedAnswer.text.slice(end);
    const nextCursor = start + symbol.length - cursorBack;
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
