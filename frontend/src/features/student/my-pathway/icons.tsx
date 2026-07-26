// Shared icon set for the "My Pathway" tab (Dashboard, Explore, Career
// Journey, Talents & Strengths, Mentorship, Parent Corner). Kept as plain
// inline SVGs matching the style already used across StemLabs.tsx /
// StemLabPlayer.tsx / Dashboard.tsx — no icon library, no emojis.

export function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m14.5 9.5-1.8 4.8-4.8 1.8 1.8-4.8 4.8-1.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function JourneyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 12h5l2-6 4 12 2-6h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TalentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="m12 3 2.4 5.1 5.6.6-4.1 3.9 1.1 5.5L12 15.6l-5 2.5 1.1-5.5-4.1-3.9 5.6-.6L12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MentorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="8.5" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="9" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.5-3 2.5-4.7 5-4.7s4.5 1.7 5 4.7M14.5 14.9c2 .3 3.5 1.9 4 4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ParentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M12 21s-7-4.6-9.5-9C.7 8.3 2.4 5 5.8 5c1.8 0 3.2 1 4.2 2.5C11 6 12.4 5 14.2 5c3.4 0 5.1 3.3 3.3 7-2.5 4.4-9.5 9-9.5 9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M7 8V4h10v4M6 17h12v4H6v-4ZM4 8h16v7H4V8Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-[#101820] text-[#B5E61D]';
    case 'DECLINED':
      return 'bg-red-50 text-red-600 border border-red-200';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-500';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
}

// A simple free-text chip/tag input — type a value, press Enter or tap Add,
// remove any chip with its x. Used by Talents & Strengths and (already
// established elsewhere) matches the toggle-chip visual language used by
// CareerJourneyTab's interest picker.
export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1.5 rounded-full bg-[#101820] px-3 py-1.5 text-xs font-semibold text-[#B5E61D]">
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="text-[#B5E61D]/70 hover:text-[#B5E61D]"
              aria-label={`Remove ${value}`}
            >
              <XIcon />
            </button>
          </span>
        ))}
      </div>
      <TagInputField
        onAdd={(value) => {
          if (!value.trim() || values.includes(value.trim())) return;
          onChange([...values, value.trim()]);
        }}
        placeholder={placeholder}
      />
    </div>
  );
}

function TagInputField({ onAdd, placeholder }: { onAdd: (value: string) => void; placeholder: string }) {
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem('tag') as HTMLInputElement;
        onAdd(input.value);
        input.value = '';
      }}
    >
      <input
        name="tag"
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
      />
      <button type="submit" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#101820] hover:bg-slate-50">
        <PlusIcon />
        Add
      </button>
    </form>
  );
}
