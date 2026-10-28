import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Folder,
  HardDrive,
  LayoutGrid,
  Mail,
  Maximize2,
  Minus,
  Monitor,
  Network,
  Power,
  ShieldCheck,
  Terminal,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { Lab } from "../../../../types";
import {
  replayCyber,
  cyberReady,
  type CyberScenario,
} from "../../../../../../backend/src/labs/studio-engine";
import { StudioReport, StudioBrief, useStudio } from "./useStudio";
const Scene = lazy(() => import("./StudioScene"));
const apps = [
  { id: "network", name: "Network", Icon: Network, colour: "bg-sky-600" },
  {
    id: "security",
    name: "Security centre",
    Icon: ShieldCheck,
    colour: "bg-emerald-600",
  },
  {
    id: "scenarios",
    name: "Lab challenges",
    Icon: Activity,
    colour: "bg-violet-600",
  },
  { id: "inbox", name: "Mail", Icon: Mail, colour: "bg-amber-600" },
  {
    id: "events",
    name: "Event viewer",
    Icon: FileText,
    colour: "bg-slate-600",
  },
  { id: "files", name: "Files", Icon: Folder, colour: "bg-blue-600" },
  { id: "terminal", name: "Terminal", Icon: Terminal, colour: "bg-slate-800" },
] as const;
type AppId = (typeof apps)[number]["id"];
const scenarios: {
  id: CyberScenario;
  title: string;
  description: string;
  defence: string;
}[] = [
  {
    id: "service",
    title: "Unexpected remote access",
    description:
      "Five simulated connection attempts target the workstation’s remote service on TCP port 3389.",
    defence:
      "Block the remote service in Security centre, then repeat the test.",
  },
  {
    id: "signin",
    title: "Repeated sign-in attempts",
    description:
      "A practice account receives five repeated sign-in attempts. Observe what happens with and without a limit.",
    defence: "Set the sign-in limit to three attempts and repeat the test.",
  },
  {
    id: "attachment",
    title: "Suspicious attachment",
    description:
      "A suspicious message arrives in the practice inbox. Inspect the sender and decide how to handle it.",
    defence:
      "Report the suspicious message or enable attachment quarantine, then repeat delivery.",
  },
];
export default function CyberStudio({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const studio = useStudio({
      lab,
      userId,
      version: "cyber-studio-v1",
      replay: replayCyber,
    }),
    { state, draft, dispatch } = studio;
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const timer = setInterval(
      () =>
        setClock(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        ),
      30000,
    );
    return () => clearInterval(timer);
  }, []);
  const [view, setView] = useState<"desk" | "desktop" | "notebook">(
      state.ready ? "desktop" : "desk",
    ),
    [app, setApp] = useState<AppId | null>(null),
    [menu, setMenu] = useState(false),
    [focus, setFocus] = useState(false),
    [boot, setBoot] = useState(0),
    [scenario, setScenario] = useState<CyberScenario>("service"),
    [policy, setPolicy] = useState(state.policy),
    [command, setCommand] = useState(""),
    [terminal, setTerminal] = useState<string[]>([
      "Assignment OS · local practice terminal",
      "Type help to see available commands.",
    ]),
    [file, setFile] = useState("Welcome.txt");
  useEffect(() => {
    setPolicy(state.policy);
  }, [JSON.stringify(state.policy)]);
  useEffect(() => {
    if (!state.on || state.ready) return;
    setBoot(0);
    const start = performance.now();
    const timer = setInterval(
        () => setBoot(Math.min(98, (performance.now() - start) / 25)),
        100,
      ),
      done = setTimeout(() => {
        if (dispatch({ type: "boot" })) {
          setView("desktop");
          setApp(null);
        }
      }, 2500);
    return () => {
      clearInterval(timer);
      clearTimeout(done);
    };
  }, [state.on, state.ready]);
  useEffect(() => {
    if (!focus) return;
    const exit = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(false);
    };
    document.addEventListener("keydown", exit);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", exit);
      document.body.style.overflow = previous;
    };
  }, [focus]);
  function power() {
    dispatch({ type: "power", on: !state.on });
    setView("desk");
    setApp(null);
    setMenu(false);
    setFocus(false);
  }
  function open(id: AppId) {
    if (!state.ready) return;
    setView("desktop");
    setApp(id);
    setMenu(false);
  }
  function run() {
    dispatch({ type: "run", scenario });
  }
  function enterCommand() {
    const c = command.trim().toLowerCase();
    let output =
      "Unknown command. Type help. This terminal does not execute system commands.";
    if (c === "help")
      output = "Commands: help · ipconfig · ping gateway · status · clear";
    if (c === "clear") {
      setTerminal([]);
      setCommand("");
      return;
    }
    if (c === "ipconfig")
      output = state.connected
        ? "Practice adapter: 192.0.2.10/24 · gateway 192.0.2.1 · local simulation"
        : "Practice adapter disconnected.";
    if (c === "ping gateway")
      output = state.connected
        ? "Reply from practice gateway: bytes=32 time=2 ms TTL=64 (simulated)"
        : "Destination unavailable: connect the practice network.";
    if (c === "status")
      output = `Workstation online · network ${state.connected ? "connected" : "disconnected"} · ${state.runs.length} scenario runs`;
    setTerminal((t) => [
      ...t.slice(-36),
      `student@workstation:~$ ${command}`,
      output,
    ]);
    setCommand("");
  }
  const last = state.runs.at(-1),
    active = apps.find((a) => a.id === app),
    compare = state.runs.some(
      (r, i) =>
        r.passed &&
        state.runs
          .slice(0, i)
          .some((b) => b.scenario === r.scenario && b.blocked === 0),
    );
  const launch = (id: AppId) => {
    open(id);
  };
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-6 text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/student/stem-labs"
            className="inline-flex items-center gap-2 text-xs text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            STEM Labs
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Cybersecurity lab
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {lab.grade} · {lab.subject} · Workstation 01
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${state.on ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {state.on
              ? state.ready
                ? "Computer on"
                : "Starting…"
              : "Computer off"}
          </span>
          <button
            onClick={power}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-medium"
          >
            <Power className="h-4 w-4" />
            {state.on ? "Power off system unit" : "Power on system unit"}
          </button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Computer lab views"
          className="flex rounded-lg bg-slate-100 p-1"
        >
          {(["desk", "desktop", "notebook"] as const).map((id) => (
            <button
              onClick={() => setView(id)}
              aria-pressed={view === id}
              key={id}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold ${view === id ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {id === "desk"
                ? "Workstation"
                : id === "desktop"
                  ? "Computer screen"
                  : `Notebook (${state.runs.length})`}
            </button>
          ))}
        </nav>
        <span
          className={`text-[11px] ${studio.storageError ? "text-red-700" : "text-slate-500"}`}
        >
          {studio.storageError
            ? "Export your notebook — browser storage unavailable"
            : "Draft saved in this browser"}
        </span>
      </div>
      {studio.message && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {studio.message}
        </p>
      )}
      {view === "desk" && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-medium">
                <HardDrive className="h-4 w-4" />
                Your workstation
              </span>
              <span className="text-[11px] text-slate-500">
                Drag to look around · scroll to zoom
              </span>
            </div>
            <div className="h-[460px] sm:h-[560px]">
              <Suspense
                fallback={<p className="p-6 text-sm">Preparing workstation…</p>}
              >
                <Scene
                  kind="computer"
                  on={state.on}
                  ready={state.ready}
                  connected={state.connected}
                  onPower={power}
                  onMonitor={() => setView("desktop")}
                />
              </Suspense>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <p className="max-w-lg text-xs leading-6 text-slate-500">
                Press the system unit’s illuminated power button, then click the
                monitor to use the computer.
              </p>
              <button
                onClick={() => setView("desktop")}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white"
              >
                Use computer
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </section>
          <aside className="space-y-4 rounded-xl border bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
              Start here
            </p>
            <h2 className="text-base font-semibold">
              Your first investigation
            </h2>
            <ol className="space-y-4 text-xs leading-6 text-slate-600">
              {[
                "Power on the system unit and wait for the desktop.",
                "Open Network and connect the practice adapter.",
                "Open Lab challenges. Run a baseline test before enabling a defence.",
                "Use Security centre or Mail to protect the workstation. Repeat the test and compare the logs.",
              ].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="border-t pt-4 text-[11px] leading-6 text-slate-500">
              A simulated desktop and contained network. Activities do not
              contact external computers or run real malware.
            </p>
          </aside>
        </div>
      )}
      {view === "desktop" && (
        <div
          className={
            focus
              ? "fixed inset-0 z-[80] flex flex-col bg-slate-950 p-2 sm:p-5"
              : "space-y-3"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className={`flex items-center gap-2 text-xs ${focus ? "text-slate-200" : "text-slate-500"}`}
            >
              <Monitor className="h-4 w-4" />
              Assignment OS · practice workstation
            </p>
            <button
              onClick={() => setFocus((v) => !v)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs ${focus ? "border-slate-700 text-white" : "bg-white"}`}
            >
              {focus ? (
                <X className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              {focus ? "Exit focus" : "Focus screen"}
            </button>
          </div>
          <section
            aria-label="Virtual computer desktop"
            className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl border-[8px] border-[#19232f] bg-[#102640] shadow-xl ${focus ? "mt-3 min-h-0 flex-1" : "min-h-[620px] sm:min-h-[680px]"}`}
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 75% 10%,rgba(50,133,174,.48),transparent 50%),radial-gradient(ellipse at 10% 80%,rgba(26,103,99,.32),transparent 55%)",
            }}
          >
            {!state.on ? (
              <div className="flex min-h-[590px] flex-1 flex-col items-center justify-center gap-5 bg-[#080d14] text-center text-slate-400">
                <Power className="h-12 w-12 opacity-30" />
                <p className="text-sm">The computer is off.</p>
                <button
                  onClick={power}
                  className="min-h-11 rounded-lg border border-slate-600 px-5 text-sm text-white"
                >
                  Power on system unit
                </button>
              </div>
            ) : !state.ready ? (
              <div className="flex min-h-[590px] flex-1 flex-col items-center justify-center gap-6 text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
                  <LayoutGrid className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-medium tracking-tight">
                  Assignment OS
                </h2>
                <p role="status" className="text-xs text-slate-300">
                  Starting your practice workstation…
                </p>
                <div className="h-1 w-48 overflow-hidden rounded bg-white/10">
                  <div
                    style={{ width: `${boot}%` }}
                    className="h-full bg-sky-400 transition-all"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="relative min-h-[540px] flex-1 p-3 sm:p-5">
                  <div className="absolute right-5 top-5 text-right text-white/50">
                    <p className="text-[10px] font-medium uppercase tracking-[.2em]">
                      Assignment OS
                    </p>
                    <p className="mt-1 text-xs">Learning workstation</p>
                  </div>
                  <div className="grid w-fit grid-cols-2 gap-2 sm:grid-cols-1">
                    {apps.slice(0, 5).map(({ id, name, Icon, colour }) => (
                      <button
                        key={id}
                        onClick={() => launch(id)}
                        className="flex w-24 flex-col items-center gap-2 rounded-lg px-2 py-3 text-center text-[11px] text-white hover:bg-white/10 focus:bg-white/10"
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md ${colour}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        {name}
                      </button>
                    ))}
                  </div>
                  {!app && (
                    <div className="absolute bottom-8 left-5 right-5 max-w-sm rounded-xl border border-white/15 bg-slate-950/30 p-4 text-slate-200 backdrop-blur-sm sm:left-36">
                      <p className="text-sm font-medium">
                        Welcome to your workstation
                      </p>
                      <p className="mt-2 text-xs leading-6 text-slate-300">
                        Start with Network. Then open Lab challenges to
                        investigate a threat and test a defence.
                      </p>
                      <button
                        onClick={() => launch("network")}
                        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md bg-white/10 px-3 text-xs"
                      >
                        Open Network
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {app && active && (
                    <article
                      aria-label={`${active.name} window`}
                      className="absolute inset-2 flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-[#f6f8fb] shadow-2xl sm:bottom-5 sm:left-32 sm:right-5 sm:top-5"
                    >
                      <header className="flex h-11 shrink-0 items-center justify-between border-b bg-white px-3">
                        <span className="flex items-center gap-2 text-xs font-semibold">
                          <active.Icon className="h-4 w-4 text-slate-500" />
                          {active.name}
                        </span>
                        <span className="flex gap-1">
                          <button
                            aria-label="Minimize app"
                            onClick={() => setApp(null)}
                            className="rounded p-2 hover:bg-slate-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            aria-label="Close app"
                            onClick={() => setApp(null)}
                            className="rounded p-2 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      </header>
                      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                        {app === "network" && (
                          <div className="mx-auto max-w-xl space-y-5">
                            <AppHeading
                              title="Practice network"
                              description="Connect the workstation to the school’s isolated training network."
                            />
                            <div className="flex items-center gap-4 rounded-xl border bg-white p-4">
                              <span
                                className={`rounded-xl p-3 ${state.connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                              >
                                {state.connected ? <Wifi /> : <WifiOff />}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-semibold">
                                  School practice adapter
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {state.connected
                                    ? "Connected · local simulation"
                                    : "Disconnected"}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  dispatch({
                                    type: "network",
                                    connected: !state.connected,
                                  })
                                }
                                className="min-h-10 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white"
                              >
                                {state.connected ? "Disconnect" : "Connect"}
                              </button>
                            </div>
                            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl border bg-white p-5 text-xs">
                              <dt className="text-slate-500">
                                Workstation address
                              </dt>
                              <dd>
                                {state.connected
                                  ? "192.0.2.10"
                                  : "Not assigned"}
                              </dd>
                              <dt className="text-slate-500">Gateway</dt>
                              <dd>{state.connected ? "192.0.2.1" : "—"}</dd>
                              <dt className="text-slate-500">
                                External internet
                              </dt>
                              <dd>Not used in this lab</dd>
                              <dt className="text-slate-500">Adapter</dt>
                              <dd>Virtual Ethernet</dd>
                            </dl>
                            <button
                              onClick={() => launch("scenarios")}
                              className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-blue-700"
                            >
                              Continue to Lab challenges
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {app === "security" && (
                          <div className="mx-auto max-w-xl space-y-5">
                            <AppHeading
                              title="Security policies"
                              description="Choose a defence for the threat you observed. Apply your settings, then retest."
                            />
                            <div className="space-y-5 rounded-xl border bg-white p-5">
                              <label className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-blue-700"
                                  checked={policy.denyRemoteService}
                                  onChange={(e) =>
                                    setPolicy((p) => ({
                                      ...p,
                                      denyRemoteService: e.target.checked,
                                    }))
                                  }
                                />
                                <span>
                                  <span className="block text-sm font-medium">
                                    Block remote service · TCP 3389
                                  </span>
                                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                                    Reject inbound connections to the practice
                                    workstation’s remote service.
                                  </span>
                                </span>
                              </label>
                              <label className="block">
                                <span className="text-sm font-medium">
                                  Repeated sign-in limit
                                </span>
                                <select
                                  aria-label="Sign-in attempt limit"
                                  value={policy.loginLimit}
                                  onChange={(e) =>
                                    setPolicy((p) => ({
                                      ...p,
                                      loginLimit: Number(e.target.value),
                                    }))
                                  }
                                  className="mt-2 min-h-10 w-full rounded-lg border bg-white px-3 text-xs"
                                >
                                  <option value={0}>No limit</option>
                                  <option value={3}>Limit to 3 attempts</option>
                                  <option value={5}>Limit to 5 attempts</option>
                                </select>
                                <span className="mt-1 block text-xs leading-6 text-slate-500">
                                  Attempts after this threshold are blocked in
                                  the practice scenario.
                                </span>
                              </label>
                              <label className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-blue-700"
                                  checked={policy.quarantine}
                                  onChange={(e) =>
                                    setPolicy((p) => ({
                                      ...p,
                                      quarantine: e.target.checked,
                                    }))
                                  }
                                />
                                <span>
                                  <span className="block text-sm font-medium">
                                    Quarantine suspicious attachments
                                  </span>
                                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                                    Keep flagged attachments out of the model
                                    inbox.
                                  </span>
                                </span>
                              </label>
                              <button
                                onClick={() =>
                                  dispatch({ type: "policy", policy })
                                }
                                className="min-h-10 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white"
                              >
                                Apply security policies
                              </button>
                              <p className="text-[11px] text-slate-500">
                                Applied: remote service{" "}
                                {state.policy.denyRemoteService
                                  ? "blocked"
                                  : "allowed"}{" "}
                                · sign-in limit{" "}
                                {state.policy.loginLimit || "off"} · quarantine{" "}
                                {state.policy.quarantine ? "on" : "off"}
                              </p>
                            </div>
                          </div>
                        )}
                        {app === "scenarios" && (
                          <div className="mx-auto max-w-xl space-y-4">
                            <AppHeading
                              title="Investigate a threat"
                              description="First observe an unprotected result. Then configure a matching defence and run the same scenario again."
                            />
                            <label className="block text-xs font-medium">
                              Scenario
                              <select
                                aria-label="Cybersecurity scenario"
                                value={scenario}
                                onChange={(e) =>
                                  setScenario(e.target.value as CyberScenario)
                                }
                                className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3 text-sm"
                              >
                                {scenarios.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="text-xs leading-6 text-slate-600">
                              {
                                scenarios.find((s) => s.id === scenario)
                                  ?.description
                              }
                            </p>
                            <button
                              disabled={!state.connected}
                              onClick={run}
                              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white disabled:opacity-40"
                            >
                              <Activity className="h-4 w-4" />
                              Run contained scenario
                            </button>
                            {!state.connected && (
                              <p className="text-xs text-amber-800">
                                Connect the practice network first.
                              </p>
                            )}
                            {last && (
                              <div
                                role="status"
                                className={`rounded-xl border p-4 ${last.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
                              >
                                <p className="text-sm font-semibold">
                                  {last.blocked}/{last.attempted} events blocked
                                </p>
                                <p className="mt-2 text-xs leading-6">
                                  {
                                    scenarios.find(
                                      (s) => s.id === last.scenario,
                                    )?.title
                                  }{" "}
                                  ·{" "}
                                  {last.passed
                                    ? "The matching defence passed this test."
                                    : "The scenario exposed a protection gap."}
                                </p>
                                <p className="mt-2 text-xs leading-6">
                                  {
                                    scenarios.find(
                                      (s) => s.id === last.scenario,
                                    )?.defence
                                  }
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => launch("security")}
                                className="min-h-9 rounded-lg border bg-white px-3 text-xs"
                              >
                                Open Security centre
                              </button>
                              <button
                                onClick={() => launch("inbox")}
                                className="min-h-9 rounded-lg border bg-white px-3 text-xs"
                              >
                                Inspect practice mail
                              </button>
                              <button
                                onClick={() => launch("events")}
                                className="min-h-9 rounded-lg border bg-white px-3 text-xs"
                              >
                                View event log
                              </button>
                            </div>
                          </div>
                        )}
                        {app === "inbox" && (
                          <div className="mx-auto max-w-xl space-y-4">
                            <AppHeading
                              title="Practice inbox"
                              description="Inspect the sender, request and attachment before deciding what to do."
                            />
                            {!state.connected ? (
                              <p className="rounded-lg border bg-white p-4 text-sm">
                                Connect the practice network to receive the
                                sample message.
                              </p>
                            ) : (
                              <article className="rounded-xl border bg-white p-5">
                                <p className="text-sm font-semibold">
                                  Urgent: verify your learner account
                                </p>
                                <dl className="mt-4 space-y-2 text-xs">
                                  <div className="flex gap-2">
                                    <dt className="text-slate-500">From:</dt>
                                    <dd className="break-all">
                                      accounts@school-support.example
                                    </dd>
                                  </div>
                                  <div className="flex gap-2">
                                    <dt className="text-slate-500">To:</dt>
                                    <dd>student@school.example</dd>
                                  </div>
                                </dl>
                                <p className="mt-5 text-xs leading-7 text-slate-600">
                                  Your account will be suspended today. Open the
                                  attached verification form and enter your
                                  password immediately. Do not contact your
                                  teacher.
                                </p>
                                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs">
                                  <FileText className="h-4 w-4" />
                                  verification-form.html · practice sample
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    onClick={() =>
                                      dispatch({
                                        type: "email",
                                        decision: "report",
                                      })
                                    }
                                    className="min-h-10 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white"
                                  >
                                    Report as phishing
                                  </button>
                                  <button
                                    onClick={() => {
                                      dispatch({
                                        type: "email",
                                        decision: "open",
                                      });
                                      dispatch({
                                        type: "run",
                                        scenario: "attachment",
                                      });
                                    }}
                                    className="min-h-10 rounded-lg border px-3 text-xs"
                                  >
                                    Open in practice sandbox
                                  </button>
                                </div>
                                {state.emailReported && (
                                  <p
                                    role="status"
                                    className="mt-4 flex items-center gap-2 text-xs text-emerald-700"
                                  >
                                    <Check className="h-4 w-4" />
                                    Reported. Future model delivery of this
                                    message is blocked.
                                  </p>
                                )}
                              </article>
                            )}
                          </div>
                        )}
                        {app === "events" && (
                          <div className="space-y-4">
                            <AppHeading
                              title="Security event viewer"
                              description="Compare events admitted before a defence with the results after applying it."
                            />
                            <RunTable runs={state.runs} />
                          </div>
                        )}
                        {app === "files" && (
                          <div className="space-y-4">
                            <AppHeading
                              title="Workstation files"
                              description="Read the practice brief and inspect your applied configuration."
                            />
                            <div className="flex flex-wrap gap-2">
                              {[
                                "Welcome.txt",
                                "Security-policy.json",
                                "Lab-notebook.txt",
                              ].map((name) => (
                                <button
                                  key={name}
                                  onClick={() => setFile(name)}
                                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs ${file === name ? "bg-blue-50 text-blue-800" : "bg-white"}`}
                                >
                                  <FileText className="h-4 w-4" />
                                  {name}
                                </button>
                              ))}
                            </div>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-white p-4 text-xs leading-7">
                              {file === "Welcome.txt"
                                ? "Welcome to the school practice workstation.\n\n1. Connect the practice network.\n2. Observe an unprotected scenario.\n3. Apply a matching defence and retest.\n4. Test another scenario and write your conclusion."
                                : file === "Security-policy.json"
                                  ? JSON.stringify(state.policy, null, 2)
                                  : `${state.runs.length} scenario runs recorded.\nOpen Event viewer or the Notebook tab to review your evidence.`}
                            </pre>
                          </div>
                        )}
                        {app === "terminal" && (
                          <div className="flex min-h-[350px] flex-col rounded-lg bg-[#0d1724] p-4 font-mono text-xs text-slate-200">
                            <div
                              role="log"
                              aria-label="Practice terminal output"
                              className="flex-1 space-y-2 overflow-y-auto whitespace-pre-wrap break-words leading-6"
                            >
                              {terminal.map((line, i) => (
                                <p key={i}>{line}</p>
                              ))}
                            </div>
                            <form
                              className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-3"
                              onSubmit={(e) => {
                                e.preventDefault();
                                enterCommand();
                              }}
                            >
                              <label
                                htmlFor="practice-command"
                                className="text-emerald-300"
                              >
                                $
                              </label>
                              <input
                                id="practice-command"
                                aria-label="Practice terminal command"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                maxLength={120}
                                autoComplete="off"
                                spellCheck={false}
                                className="min-h-10 min-w-0 flex-1 bg-transparent outline-none"
                              />
                              <button className="min-h-9 rounded border border-slate-600 px-3">
                                Run
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </article>
                  )}
                </div>
                {menu && (
                  <div className="absolute bottom-14 left-2 z-20 w-64 rounded-xl border border-slate-300 bg-white p-2 shadow-xl">
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Applications
                    </p>
                    {apps.map(({ id, name, Icon }) => (
                      <button
                        key={id}
                        onClick={() => launch(id)}
                        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs hover:bg-slate-100"
                      >
                        <Icon className="h-4 w-4 text-slate-500" />
                        {name}
                      </button>
                    ))}
                    <button
                      onClick={power}
                      className="mt-2 flex min-h-10 w-full items-center gap-3 border-t px-3 text-left text-xs text-red-700"
                    >
                      <Power className="h-4 w-4" />
                      Shut down
                    </button>
                  </div>
                )}
                <footer className="z-10 flex h-13 shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-[#0b1727]/90 px-3 py-2 text-white backdrop-blur-md">
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      aria-label="Open Start menu"
                      onClick={() => setMenu((v) => !v)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
                    >
                      <LayoutGrid className="h-5 w-5" />
                    </button>
                    {apps.slice(0, 4).map(({ id, name, Icon }) => (
                      <button
                        key={id}
                        title={name}
                        aria-label={`Launch ${name}`}
                        onClick={() => launch(id)}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${app === id ? "bg-white/15" : "hover:bg-white/10"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-2 text-[10px] text-slate-300">
                    {state.connected ? (
                      <Wifi className="h-3.5 w-3.5" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Practice network</span>
                    <span className="border-l border-white/15 pl-2 tabular-nums">
                      {clock}
                    </span>
                  </span>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
      {view === "notebook" && (
        <StudioReport
          restore={studio.restore}
          lab={lab}
          conclusion={draft.conclusion}
          answers={draft.answers}
          onChange={(conclusion) => studio.update({ conclusion })}
          onAnswers={(answers) => studio.update({ answers })}
          ready={cyberReady(state, draft.conclusion)}
          saved={studio.saved}
          pending={studio.save.isPending}
          error={studio.save.error}
          onSave={() => studio.save.mutate()}
          onExport={studio.exportReport}
        >
          <p className="text-xs leading-6 text-slate-500">
            Complete at least three runs across two scenarios. Include an
            unprotected result and its successful protected retest.
          </p>
          <RunTable runs={state.runs} />
          <p
            className={`text-xs ${compare ? "text-emerald-700" : "text-slate-500"}`}
          >
            {compare
              ? "Baseline and protected retest recorded."
              : "A baseline/protected comparison is still needed."}
          </p>
        </StudioReport>
      )}
      <StudioBrief lab={lab} />
    </div>
  );
}
function AppHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
    </div>
  );
}
function RunTable({ runs }: { runs: ReturnType<typeof replayCyber>["runs"] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full min-w-[430px] text-left text-xs">
        <thead className="border-b bg-slate-50 text-slate-500">
          <tr>
            {["Run", "Scenario", "Blocked", "Result"].map((h) => (
              <th key={h} className="p-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="p-3">{i + 1}</td>
              <td className="p-3">
                {scenarios.find((s) => s.id === r.scenario)?.title}
              </td>
              <td className="p-3 tabular-nums">
                {r.blocked}/{r.attempted}
              </td>
              <td
                className={`p-3 ${r.passed ? "text-emerald-700" : "text-amber-800"}`}
              >
                {r.passed ? "Protected" : "Protection gap"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!runs.length && (
        <p className="p-5 text-xs text-slate-500">
          No scenario runs yet. Start in Lab challenges.
        </p>
      )}
    </div>
  );
}
