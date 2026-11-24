import { School, Laptop, ShieldCheck } from "lucide-react";
export type LoginType = "student" | "independent" | "staff";
interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}
export function LoginTabs({ loginType, setLoginType }: Props) {
  const options = [
    {
      type: "student" as const,
      title: "School",
      detail: "School learners",
      Icon: School,
    },
    {
      type: "independent" as const,
      title: "Independent",
      detail: "Personal account",
      Icon: Laptop,
    },
    {
      type: "staff" as const,
      title: "Staff",
      detail: "Teachers & admins",
      Icon: ShieldCheck,
    },
  ];
  return (
    <div
      role="tablist"
      aria-label="Account type"
      className="grid grid-cols-3 gap-2"
      onKeyDown={(e) => {
        const current = options.findIndex((o) => o.type === loginType);
        const index =
          e.key === "ArrowRight"
            ? (current + 1) % 3
            : e.key === "ArrowLeft"
              ? (current + 2) % 3
              : e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 2
                  : -1;
        if (index >= 0) {
          e.preventDefault();
          setLoginType(options[index].type);
          (
            e.currentTarget.querySelectorAll("button")[
              index
            ] as HTMLButtonElement
          )?.focus();
        }
      }}
    >
      {options.map(({ type, title, detail, Icon }) => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={loginType === type}
          tabIndex={loginType === type ? 0 : -1}
          onClick={() => setLoginType(type)}
          className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 text-xs font-semibold transition sm:text-sm ${loginType === type ? "border-[#61792d] bg-[#f1f5e9] text-[#344a20] ring-1 ring-[#61792d]/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{title}</span>
          <span
            aria-hidden="true"
            className="hidden text-[10px] font-normal text-slate-500 min-[360px]:block"
          >
            {detail}
          </span>
        </button>
      ))}
    </div>
  );
}
