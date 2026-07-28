export type LoginType = 'student' | 'independent' | 'staff';

interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}

export function LoginTabs({ loginType, setLoginType }: Props) {
  const options: Array<{
    type: LoginType;
    title: string;
    description: string;
  }> = [
    { type: 'student', title: 'School Student', description: 'School access' },
    { type: 'independent', title: 'Individual', description: 'Personal account' },
    { type: 'staff', title: 'Staff', description: 'Teacher or admin' },
  ];

  return (
    <div
      className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-3"
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
            className={`group relative rounded-2xl border p-3 text-left transition-all duration-200 ${
              selected
                ? 'border-[#101820] bg-[#101820] shadow-[0_12px_28px_rgba(16,24,32,0.18)]'
                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div
              className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
                selected
                  ? 'bg-[#B5E61D] text-[#101820]'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-[#F2F9D8] group-hover:text-[#536D00]'
              }`}
            >
              <RoleIcon type={option.type} />
            </div>
            <span className={`block text-sm font-semibold ${selected ? 'text-white' : 'text-[#101820]'}`}>
              {option.title}
            </span>
            <span className={`mt-0.5 block text-[11px] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
              {option.description}
            </span>
            {selected ? (
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#B5E61D]" aria-hidden="true" />
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
