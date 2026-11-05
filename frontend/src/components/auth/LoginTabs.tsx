import { School, Laptop, ShieldCheck } from "lucide-react";
export type LoginType = "student" | "independent" | "staff";
interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}
export function LoginTabs({ loginType, setLoginType }: Props) {
  const options = [
    { type: "student" as const, title: "School", Icon: School },
    { type: "independent" as const, title: "Independent", Icon: Laptop },
    { type: "staff" as const, title: "Staff", Icon: ShieldCheck },
  ];
  return (
    <div
      role="tablist"
      aria-label="Account type"
      className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
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
      {options.map(({ type, title, Icon }) => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={loginType === type}
          tabIndex={loginType === type ? 0 : -1}
          onClick={() => setLoginType(type)}
          className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-semibold transition sm:gap-2 sm:text-sm ${loginType === type ? "bg-[#101820] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{title}</span>
        </button>
      ))}
    </div>
  );
}
