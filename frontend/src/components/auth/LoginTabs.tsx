export type LoginType = 'student' | 'independent' | 'staff';

interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}

export function LoginTabs({ loginType, setLoginType }: Props) {
  const options: Array<{
    type: LoginType;
    title: string;
  }> = [
    { type: 'student', title: 'School student' },
    { type: 'independent', title: 'Individual' },
    { type: 'staff', title: 'Staff' },
  ];

  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5"
      role="tablist"
      aria-label="Account type"
    >
      {options.map((option) => {
        const selected = loginType === option.type;
        return (
          <button
            key={option.type}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setLoginType(option.type)}
            className={`group relative flex min-h-[72px] min-w-0 flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B5E61D]/30 sm:px-3 ${
              selected
                ? 'bg-[#101820] shadow-[0_8px_20px_rgba(16,24,32,0.14)]'
                : 'bg-transparent hover:bg-white'
            }`}
          >
            <div
              className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                selected
                  ? 'bg-[#B5E61D] text-[#101820]'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-[#F2F9D8] group-hover:text-[#536D00]'
              }`}
            >
              <RoleIcon type={option.type} />
            </div>
            <span className={`block max-w-full truncate text-[11px] font-semibold sm:text-xs ${selected ? 'text-white' : 'text-[#101820]'}`}>
              {option.title}
            </span>
            {selected ? (
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#B5E61D]" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function RoleIcon({ type }: { type: LoginType }) {
  if (type === 'staff') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20v-2.2A3.8 3.8 0 0 1 7.8 14h8.4a3.8 3.8 0 0 1 3.8 3.8V20" strokeLinecap="round" />
        <circle cx="12" cy="7.5" r="3.5" />
        <path d="M17.5 4.5h3v3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'independent') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" strokeLinejoin="round" />
        <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19M9 7h6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 10 9-6 9 6-9 6-9-6Z" strokeLinejoin="round" />
      <path d="M7 13.3V18c2.8 2 7.2 2 10 0v-4.7M21 10v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
