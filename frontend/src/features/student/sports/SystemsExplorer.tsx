import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Focus, RotateCcw, Play, Pause, ArrowRight, Timer } from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { sportsResult } from "../../../../../backend/src/student/sports/sports-engine";

type Kind = "energy" | "reflex" | "respiratory";
type Part = { id: string; name: string; note: string; color: string };
const PARTS: Record<Kind, Part[]> = {
  energy: [
    {
      id: "quadriceps",
      name: "Quadriceps",
      color: "#bc6763",
      note: "The four quadriceps muscles extend the knee. ATP powers their cross-bridge cycles; all three energy systems replenish ATP concurrently.",
    },
    {
      id: "hamstrings",
      name: "Hamstrings",
      color: "#934e60",
      note: "The displayed biceps femoris heads help flex the knee. The long head also extends the hip. Rotate to inspect the posterior thigh.",
    },
    {
      id: "artery",
      name: "Femoral artery",
      color: "#b9504d",
      note: "This arterial supply delivers oxygen and fuel to the limb. Oxygen availability supports aerobic ATP production; arteries do not carry ATP to the muscle.",
    },
    {
      id: "bone",
      name: "Bones & attachments",
      color: "#d9ceb6",
      note: "Pelvis, femur, patella and lower-leg bones locate the working muscles. This resting atlas is not a simulated running gait.",
    },
  ],
  reflex: [
    {
      id: "nerve",
      name: "Median nerve",
      color: "#d6b66c",
      note: "A peripheral nerve contains bundles of sensory and motor axons. Their signals travel in different directions. The atlas shows the nerve bundle, not individual impulses.",
    },
    {
      id: "plexus",
      name: "Brachial plexus",
      color: "#cba265",
      note: "The brachial plexus distributes fibres between cervical spinal nerves and the upper limb. The displayed subset locates part of this network.",
    },
    {
      id: "motor",
      name: "Musculocutaneous nerve",
      color: "#cfa267",
      note: "Carries motor axons to biceps and brachialis. This motor route is distinct from the median sensory nerve shown for hand input.",
    },
    {
      id: "cord",
      name: "Spinal cord",
      color: "#d0c5a9",
      note: "Spinal interneurones relay sensory input to motor neurones during a withdrawal reflex. Ascending information also travels towards the brain.",
    },
    {
      id: "muscle",
      name: "Elbow flexors",
      color: "#b96c68",
      note: "The biceps and brachialis illustrate potential effector muscles. Their motor supply includes the musculocutaneous nerve. The route shown is an illustrative withdrawal pathway, not a complete innervation map.",
    },
    {
      id: "bone",
      name: "Anatomical context",
      color: "#d9ceb6",
      note: "Cervical vertebrae and upper-limb bones locate the neural structures. Use the layer control to expose the nerves.",
    },
  ],
  respiratory: [
    {
      id: "right-atrium",
      name: "Right atrium",
      color: "#6c91aa",
      note: "Receives oxygen-poor blood from the body through the venae cavae. Blood passes through the tricuspid valve to the right ventricle.",
    },
    {
      id: "right-ventricle",
      name: "Right ventricle",
      color: "#597f9b",
      note: "Pumps blood through the pulmonary valve into the pulmonary arteries and towards the lungs.",
    },
    {
      id: "pulmonary-artery",
      name: "Pulmonary arteries",
      color: "#668ba9",
      note: "Carry oxygen-poor blood away from the right ventricle. Artery means away from the heart; it does not always mean oxygen-rich.",
    },
    {
      id: "lungs",
      name: "Lungs",
      color: "#d59790",
      note: "At pulmonary capillaries, oxygen enters the blood and carbon dioxide leaves. Lung surfaces here show anatomical location, not individual alveoli.",
    },
    {
      id: "pulmonary-vein",
      name: "Pulmonary veins",
      color: "#bd6661",
      note: "Return oxygen-rich blood from the lungs to the left atrium. This is the oxygen-rich exception to the usual vein pattern.",
    },
    {
      id: "left-atrium",
      name: "Left atrium",
      color: "#c57871",
      note: "Receives pulmonary venous blood. It passes through the mitral valve into the left ventricle.",
    },
    {
      id: "left-ventricle",
      name: "Left ventricle",
      color: "#af514f",
      note: "Pumps blood through the aortic valve into the systemic circuit. Its muscular wall supports the pressure required for systemic circulation.",
    },
    {
      id: "aorta",
      name: "Aorta",
      color: "#b75d57",
      note: "Distributes oxygen-rich blood to the systemic circulation. Oxygen delivery is cardiac output multiplied by arterial oxygen content.",
    },
    {
      id: "vena-cava",
      name: "Venae cavae",
      color: "#658da5",
      note: "Return oxygen-poor systemic blood to the right atrium. Tissue oxygen uptake depends on cardiac output and the arterial–venous oxygen difference.",
    },
  ],
};
const REFLEX_STEPS = [
  {
    name: "Receptor",
    part: "nerve",
    text: "A skin receptor detects a potentially harmful stimulus and initiates a sensory signal.",
  },
  {
    name: "Sensory input",
    part: "nerve",
    text: "A sensory neurone carries the signal towards the spinal cord. Peripheral nerve bundles can contain both sensory and motor axons.",
  },
  {
    name: "Spinal relay",
    part: "cord",
    text: "Synapses and interneurones within the spinal cord connect sensory input to a motor response.",
  },
  {
    name: "Motor output",
    part: "motor",
    text: "Motor neurones carry commands away from the spinal cord towards the effector muscles.",
  },
  {
    name: "Withdrawal",
    part: "muscle",
    text: "Flexor muscles contract to withdraw the limb. A brainward branch also carries information for awareness; it is not required to initiate this spinal response.",
  },
];
const FLOW = [
  "vena-cava",
  "right-atrium",
  "right-ventricle",
  "pulmonary-artery",
  "lungs",
  "pulmonary-vein",
  "left-atrium",
  "left-ventricle",
  "aorta",
];
const btn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium hover:bg-slate-50";
interface Props {
  kind: Kind;
  config: Record<string, number>;
  running: boolean;
  stimulus: number;
  onConfig: (c: Record<string, number>) => void;
  onStimulus: () => void;
}
export default function SystemsExplorer(p: Props) {
  const [selected, setSelected] = useState(PARTS[p.kind][0].id),
    [isolate, setIsolate] = useState(false),
    [context, setContext] = useState(true),
    [cameraKey, setCameraKey] = useState(0),
    [focus, setFocus] = useState(false),
    [step, setStep] = useState(0),
    [replaying, setReplaying] = useState(false),
    [timeline, setTimeline] = useState(false);
  const latest = useRef(p);
  latest.current = p;
  const parts = PARTS[p.kind],
    detail = parts.find((x) => x.id === selected) || parts[0];
  useEffect(() => {
    if (p.kind === "reflex" && p.stimulus > 0) {
      setStep(0);
      setSelected(REFLEX_STEPS[0].part);
      setReplaying(true);
    }
  }, [p.stimulus, p.kind]);
  useEffect(() => {
    if (!replaying || !p.running) return;
    const id = setInterval(() => setStep((n) => Math.min(4, n + 1)), 1000);
    return () => clearInterval(id);
  }, [replaying, p.running]);
  useEffect(() => {
    if (!replaying) return;
    setSelected(REFLEX_STEPS[step].part);
    if (step >= 4) setReplaying(false);
  }, [step, replaying]);
  useEffect(() => {
    if (!timeline || !p.running) return;
    const id = setInterval(() => {
      const q = latest.current;
      if (q.config.duration >= 180) {
        setTimeline(false);
        return;
      }
      q.onConfig({
        ...q.config,
        duration: Math.min(180, q.config.duration + 5),
      });
    }, 350);
    return () => clearInterval(id);
  }, [timeline, p.running]);
  const results = sportsResult(p.kind, p.config);
  const data =
    p.kind === "energy"
      ? Array.from({ length: 37 }, (_, i) => {
          const r = sportsResult("energy", { ...p.config, duration: i * 5 });
          return {
            time: i * 5,
            phosphagen: r[0].value,
            glycolytic: r[1].value,
            aerobic: r[2].value,
          };
        })
      : [];
  return (
    <div>
      <Anatomy
        kind={p.kind}
        parts={parts}
        selected={selected}
        onSelect={setSelected}
        isolate={isolate}
        context={context}
        cameraKey={cameraKey}
        focus={focus}
        running={p.running}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={context}
              onChange={(e) => setContext(e.target.checked)}
              className="accent-[#667e3c]"
            />
            {p.kind === "respiratory" ? "Lung layer" : "Supporting bones"}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isolate}
              onChange={(e) => setIsolate(e.target.checked)}
              className="accent-[#667e3c]"
            />
            Isolate selected structure
          </label>
        </div>
        <div className="flex gap-2">
          <button
            className={btn}
            onClick={() => {
              setFocus(true);
              setCameraKey((n) => n + 1);
            }}
          >
            <Focus size={13} />
            Focus structure
          </button>
          <button
            aria-label="Reset system camera"
            className={btn}
            onClick={() => {
              setFocus(false);
              setCameraKey((n) => n + 1);
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[155px_1fr]">
        <div
          aria-label="Inspect system structures"
          className="flex max-h-56 flex-wrap gap-1 overflow-y-auto sm:flex-col sm:flex-nowrap"
        >
          {parts.map((part) => (
            <button
              key={part.id}
              aria-pressed={selected === part.id}
              onClick={() => setSelected(part.id)}
              className={`rounded-lg px-2.5 py-2 text-left text-[11px] ${selected === part.id ? "bg-[#edf2e4] font-semibold text-[#526b10]" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {part.name}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          <h3 className="text-sm font-semibold">{detail.name}</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">{detail.note}</p>
          <p className="mt-3 text-[10px] leading-5 text-slate-400">
            Resting anatomy · illustrative colours.{" "}
            <a
              href="/stem/anatomy/sports/ATTRIBUTION.txt"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Z-Anatomy / BodyParts3D · CC BY-SA 4.0
            </a>
          </p>
        </div>
      </div>
      {p.kind === "energy" && (
        <section
          aria-label="Exercise energy investigation"
          className="space-y-4 border-t border-slate-100 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Compare exercise demands</h3>
            <button
              className={btn}
              onClick={() => {
                if (!timeline) p.onConfig({ ...p.config, duration: 0 });
                setTimeline((v) => !v);
              }}
            >
              {timeline ? <Pause size={13} /> : <Play size={13} />}Exercise
              timeline
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Short sprint", intensity: 95, duration: 5 },
              { name: "Repeated effort", intensity: 85, duration: 45 },
              { name: "Sustained effort", intensity: 50, duration: 180 },
            ].map((s) => (
              <button
                key={s.name}
                className={btn}
                onClick={() => {
                  setTimeline(false);
                  p.onConfig({ intensity: s.intensity, duration: s.duration });
                }}
              >
                {s.name}
                <span className="text-slate-400">{s.duration}s</span>
              </button>
            ))}
          </div>
          <div
            role="img"
            aria-label="Overlapping ATP supply over 180 seconds"
            className="h-56 w-full min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ left: -20, right: 12, top: 12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e8edf0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} unit="s" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  formatter={(v: number) => `${v.toFixed(1)} relative %`}
                />
                <Area
                  name="ATP-PC"
                  dataKey="phosphagen"
                  stroke="#a2864d"
                  fill="#a2864d"
                  fillOpacity={0.13}
                  isAnimationActive={false}
                />
                <Area
                  name="Glycolytic"
                  dataKey="glycolytic"
                  stroke="#b36e72"
                  fill="#b36e72"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
                <Area
                  name="Aerobic"
                  dataKey="aerobic"
                  stroke="#628370"
                  fill="#628370"
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
                <ReferenceLine
                  x={p.config.duration}
                  stroke="#101820"
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {results.map((r, i) => (
              <div key={r.label} className="rounded-xl bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500">{r.label}</span>
                <strong
                  className="mt-1 block text-lg"
                  style={{ color: ["#937742", "#aa6468", "#527361"][i] }}
                >
                  {r.value.toFixed(1)}%
                </strong>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-5 text-slate-500">
            All three systems overlap. These normalized teaching estimates do
            not measure ATP stores, calories, lactate or an athlete’s
            performance. Timeline playback is accelerated: 5 simulated seconds
            per step.
          </p>
          <div className="rounded-xl bg-[#f0f4e9] p-3 text-xs leading-6 text-[#465b22]">
            Investigate: keep intensity constant and compare 5 s, 45 s and 180
            s. Which contribution grows, and which remains present?
          </div>
        </section>
      )}
      {p.kind === "reflex" && (
        <section
          className="space-y-4 border-t border-slate-100 p-4"
          aria-label="Withdrawal pathway investigation"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Follow the withdrawal pathway
            </h3>
            <button className={btn} onClick={p.onStimulus}>
              <Play size={13} />
              Apply virtual heat stimulus
            </button>
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {REFLEX_STEPS.map((s, i) => (
              <li key={s.name}>
                <button
                  aria-pressed={step === i}
                  onClick={() => {
                    setReplaying(false);
                    setStep(i);
                    setSelected(s.part);
                  }}
                  className={`h-full w-full rounded-xl p-3 text-left text-[11px] ${step === i ? "bg-[#edf2e4] text-[#526b10]" : "bg-slate-50 text-slate-500"}`}
                >
                  <span className="mb-2 block text-[10px] opacity-60">
                    0{i + 1}
                  </span>
                  {s.name}
                </button>
              </li>
            ))}
          </ol>
          <p aria-live="polite" className="text-xs leading-6 text-slate-600">
            {REFLEX_STEPS[step].text}
          </p>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Calculated pathway time
            </span>
            <p className="mt-1 font-semibold">
              {p.config.path.toFixed(1)} m ÷ {p.config.speed} m/s + 2 ms ={" "}
              <span className="text-[#526b10]">
                {results[0].value.toFixed(1)} ms
              </span>
            </p>
            <p className="mt-2 text-[10px] leading-5 text-slate-500">
              Chosen total sensory + motor distance and a simplified synaptic
              delay. Replay is slowed to five teaching stages. The atlas shows
              anatomical context; it does not simulate individual axons,
              innervation or a moving withdrawal.
            </p>
          </div>
          <ReactionExperiment />
        </section>
      )}
      {p.kind === "respiratory" && (
        <section
          className="space-y-4 border-t border-slate-100 p-4"
          aria-label="Circulation investigation"
        >
          <h3 className="text-sm font-semibold">
            Trace a complete circulation
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {FLOW.map((id, i) => (
              <span key={id} className="contents">
                <button
                  aria-pressed={selected === id}
                  className={`rounded-lg px-2.5 py-2 text-[10px] ${selected === id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}
                  onClick={() => setSelected(id)}
                >
                  {parts.find((x) => x.id === id)?.name}
                </button>
                {i < FLOW.length - 1 && (
                  <ArrowRight size={12} className="shrink-0 text-slate-300" />
                )}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Aorta → body tissues → venae cavae completes the systemic circuit.
            Blue = relatively oxygen-poor; red = relatively oxygen-rich. Neither
            colour is the literal colour of blood.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Rest", heartRate: 75, strokeVolume: 80, extraction: 50 },
              {
                name: "Moderate effort",
                heartRate: 120,
                strokeVolume: 100,
                extraction: 100,
              },
              {
                name: "Hard effort",
                heartRate: 165,
                strokeVolume: 120,
                extraction: 140,
              },
            ].map((s) => (
              <button
                key={s.name}
                className={btn}
                onClick={() =>
                  p.onConfig({
                    heartRate: s.heartRate,
                    strokeVolume: s.strokeVolume,
                    extraction: s.extraction,
                  })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 text-xs leading-6">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Flow from the heart
              </span>
              <p>
                {p.config.heartRate} beats/min × {p.config.strokeVolume} mL/beat
              </p>
              <strong>
                {results[0].value.toFixed(2)} L/min cardiac output
              </strong>
            </div>
            <div className="rounded-xl bg-[#f0f4e9] p-3 text-xs leading-6 text-[#465b22]">
              <span className="text-[10px] uppercase tracking-wider">
                Oxygen taken up by tissue
              </span>
              <p>
                {results[0].value.toFixed(2)} L/min × {p.config.extraction} mL/L
              </p>
              <strong>{results[2].value.toFixed(0)} mL O₂/min</strong>
            </div>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">
            Delivery assumes 200 mL O₂ per litre of arterial blood; uptake uses
            the selected arterial–venous difference. Presets illustrate
            calculations, not prescribed exercise or clinical measurements.
            Valve movement and blood velocity are not simulated.
          </p>
        </section>
      )}
    </div>
  );
}
function ReactionExperiment() {
  const [status, setStatus] = useState<
      "idle" | "waiting" | "ready" | "early" | "done"
    >("idle"),
    [trials, setTrials] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(),
    start = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  function click() {
    if (status === "waiting") {
      clearTimeout(timer.current);
      setStatus("early");
      return;
    }
    if (status === "ready") {
      setTrials((t) => [
        ...t.slice(-4),
        Math.round(performance.now() - start.current),
      ]);
      setStatus("done");
      return;
    }
    setStatus("waiting");
    timer.current = setTimeout(
      () => {
        start.current = performance.now();
        setStatus("ready");
      },
      1200 + Math.random() * 2000,
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Timer size={15} />
        Reaction is not the same as a reflex
      </div>
      <p className="text-xs leading-6 text-slate-500">
        Respond when the cue changes. This measures a voluntary visual response,
        including your device’s delay—not the spinal reflex calculated above.
      </p>
      <button
        className={`min-h-16 w-full rounded-xl px-4 text-sm font-semibold ${status === "ready" ? "bg-[#526b10] text-white" : "bg-slate-100 text-slate-700"}`}
        onClick={click}
      >
        {status === "waiting"
          ? "Wait for the cue…"
          : status === "ready"
            ? "NOW — click or press Space"
            : status === "early"
              ? "Too soon — try again"
              : status === "done"
                ? "Start another trial"
                : "Start reaction trial"}
      </button>
      {trials.length > 0 && (
        <div
          aria-live="polite"
          className="flex flex-wrap gap-3 text-xs text-slate-600"
        >
          <span>Recent trials: {trials.join(" · ")} ms</span>
          <strong>
            Mean:{" "}
            {Math.round(trials.reduce((a, b) => a + b, 0) / trials.length)} ms
          </strong>
        </div>
      )}
    </div>
  );
}
function Anatomy(p: {
  kind: Kind;
  parts: Part[];
  selected: string;
  onSelect: (s: string) => void;
  isolate: boolean;
  context: boolean;
  cameraKey: number;
  focus: boolean;
  running: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef(p);
  live.current = p;
  const [status, setStatus] = useState<
      "loading" | "ready" | "error" | "unsupported"
    >("loading"),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false,
      frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor("#182326");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      `Interactive ${p.kind} anatomical atlas`,
    );
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.05, 40),
      orbit = new OrbitControls(camera, renderer.domElement),
      root = new THREE.Group();
    scene.add(root);
    camera.position.set(0, 0.25, 6.3);
    orbit.enableDamping = true;
    orbit.minDistance = 0.7;
    orbit.maxDistance = 12;
    scene.add(new THREE.HemisphereLight("#fff0e3", "#344650", 2));
    const key = new THREE.DirectionalLight("#fff3e3", 3.1);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#a9c7d8", 2);
    rim.position.set(3, 0, -3);
    scene.add(rim);
    const meshes: THREE.Mesh[] = [],
      bounds = new Map<string, THREE.Box3>();
    new GLTFLoader().load(
      `/stem/anatomy/sports/${p.kind === "respiratory" ? "circulation" : p.kind}-atlas-v1.glb`,
      (g) => {
        if (disposed) {
          g.scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry.dispose();
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m) => m.dispose(),
              );
            }
          });
          return;
        }
        const box = new THREE.Box3().setFromObject(g.scene),
          centre = box.getCenter(new THREE.Vector3()),
          scale = 3.6 / Math.max(0.1, box.getSize(new THREE.Vector3()).y);
        g.scene.updateMatrixWorld(true);
        g.scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const id =
            o.userData.structure || o.parent?.userData.structure || "bone";
          const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
          geo.translate(-centre.x, -centre.y, -centre.z);
          geo.scale(scale, scale, scale);
          const part = p.parts.find((x) => x.id === id);
          const material = new THREE.MeshStandardMaterial({
            color: part?.color || "#d9ceb6",
            roughness: 0.48,
            metalness: 0.02,
            side: THREE.DoubleSide,
          });
          const m = new THREE.Mesh(geo, material);
          m.userData.structure = id;
          root.add(m);
          meshes.push(m);
          const b = new THREE.Box3().setFromObject(m);
          if (bounds.has(id)) bounds.get(id)!.union(b);
          else bounds.set(id, b);
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(
            (mat) => mat.dispose(),
          );
        });
        setStatus("ready");
      },
      undefined,
      () => !disposed && setStatus("error"),
    );
    const ray = new THREE.Raycaster();
    let pointer = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    const pick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(meshes.filter((m) => m.visible))[0]
        ?.object;
      if (hit) live.current.onSelect(hit.userData.structure);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", pick);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    let lastKey = "";
    const draw = () => {
      if (disposed) return;
      const q = live.current;
      const signature = `${q.cameraKey}:${q.focus || q.isolate ? q.selected : "all"}:${q.isolate}:${el.clientWidth}:${el.clientHeight}`;
      if (signature !== lastKey && meshes.length) {
        lastKey = signature;
        const all = new THREE.Box3();
        bounds.forEach((b) => all.union(b));
        const b =
          (q.focus || q.isolate ? bounds.get(q.selected) : undefined) || all;
        const c = b.getCenter(new THREE.Vector3());
        const size = b.getSize(new THREE.Vector3());
        const distance = Math.max(
          1.0,
          (Math.max(size.y, size.x / camera.aspect) /
            (2 * Math.tan((camera.fov * Math.PI) / 360))) *
            1.18 +
            size.z / 2,
        );
        orbit.target.copy(c);
        camera.position.copy(c).add(new THREE.Vector3(0, 0.25, distance));
      }
      for (const m of meshes) {
        const id = m.userData.structure,
          contextual = id === "bone" || id === "lungs",
          selected = id === q.selected,
          mat = m.material as THREE.MeshStandardMaterial;
        m.visible = q.isolate ? selected : !contextual || q.context || selected;
        mat.transparent = contextual && !selected;
        mat.opacity =
          contextual && !selected ? (id === "lungs" ? 0.2 : 0.25) : 1;
        mat.depthWrite = !mat.transparent;
        mat.emissive.set(selected ? "#332019" : "#000000");
        mat.emissiveIntensity = 0.32;
      }
      orbit.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      orbit.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", pick);
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [p.kind, retry]);
  return (
    <div className="relative bg-[#182326]">
      <div ref={host} className="h-[350px] sm:h-[480px]" />
      {status !== "ready" && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#182326] p-6 text-center text-xs text-stone-300"
        >
          {status === "loading"
            ? "Preparing anatomical structures…"
            : status === "unsupported"
              ? "3D is unavailable. You can still use the structure guide and investigations below."
              : "The atlas could not load."}
          {status === "error" && (
            <button
              className="mt-3 underline"
              onClick={() => setRetry((v) => v + 1)}
            >
              Retry anatomy
            </button>
          )}
        </div>
      )}
      <div className="pointer-events-none absolute left-4 top-4">
        <span className="text-[9px] uppercase tracking-[0.18em] text-stone-400">
          Anatomical atlas
        </span>
        <p className="mt-1 text-sm text-stone-100">
          {p.kind === "energy"
            ? "Working muscles of the lower limb"
            : p.kind === "reflex"
              ? "Peripheral nerves & spinal cord"
              : "Heart chambers & pulmonary vessels"}
        </p>
      </div>
      <span className="pointer-events-none absolute bottom-4 left-4 text-[10px] text-stone-400">
        Drag to rotate · select a structure · scroll to zoom
      </span>
    </div>
  );
}
