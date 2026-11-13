import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Focus, Layers, Pause, Play, RotateCcw } from "lucide-react";
import { sportsResult } from "../../../../../backend/src/student/sports/sports-engine";

type Scale = "muscle" | "fibre" | "sarcomere";
const structures = {
  muscle: [
    [
      "biceps",
      "Biceps brachii",
      "The two-headed muscle at the front of the upper arm helps flex the elbow and turn the palm upwards. Explore its fibres next.",
    ],
    [
      "triceps",
      "Triceps brachii",
      "The three heads at the back of the upper arm extend the elbow. Rotate the arm to inspect them.",
    ],
    [
      "brachialis",
      "Brachialis",
      "This elbow flexor lies deep to the biceps. It attaches to the ulna.",
    ],
    [
      "tendon",
      "Tendons",
      "Pale connective tissue transmits muscle force to bone. Tendons do not actively contract.",
    ],
    [
      "bone",
      "Bones & attachments",
      "The scapula, humerus, radius and ulna locate these muscles in the upper limb.",
    ],
  ],
  fibre: [
    [
      "myofibril",
      "Myofibrils",
      "Long contractile threads inside a muscle fibre. Repeating sarcomeres produce the striped appearance.",
    ],
    [
      "mitochondrion",
      "Mitochondria",
      "Support aerobic ATP production. ATP also comes from other energy pathways.",
    ],
    [
      "membrane",
      "Muscle fibre",
      "One elongated muscle cell contains many myofibrils and several nuclei.",
    ],
  ],
  sarcomere: [
    [
      "actin",
      "Actin · thin filament",
      "Anchored at the Z-disc. Actin moves towards the centre during shortening; the filament itself does not shorten.",
    ],
    [
      "myosin",
      "Myosin · thick filament",
      "Myosin heads bind actin and produce a power stroke. ATP binding allows the head to detach.",
    ],
    [
      "zdisc",
      "Z-discs",
      "The boundaries of one sarcomere move closer together during contraction.",
    ],
  ],
} as const;
const phases = [
  [
    "Attach",
    "With calcium exposing binding sites, an energised myosin head binds actin.",
  ],
  [
    "Power stroke",
    "The head pivots, pulling actin towards the centre; ADP and phosphate are released.",
  ],
  ["Detach", "A new ATP molecule binds myosin, allowing it to release actin."],
  ["Reset", "ATP hydrolysis re-energises the head for another cycle."],
];
export default function MuscleScene({
  config,
  running,
}: {
  config: Record<string, number>;
  running: boolean;
}) {
  const [scale, setScale] = useState<Scale>("muscle");
  const [selected, setSelected] = useState("biceps");
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ config, running, playing, selected, phase });
  live.current = { config, running, playing, selected, phase };
  const detail =
    structures[scale].find((x) => x[0] === selected) || structures[scale][0];
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setReady(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setSupported(false);
      return;
    }
    setSupported(true);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setClearColor("#172123");
    renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      `Interactive three-dimensional muscle ${scale} cutaway`,
    );
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    camera.position.set(0.5, 1.1, 6.5);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.minDistance = 3;
    orbit.maxDistance = 10;
    scene.add(new THREE.HemisphereLight("#fff1e5", "#263e44", 2));
    const key = new THREE.DirectionalLight("#fff0db", 3.2);
    key.position.set(-2, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#b3d8dd", 2.2);
    rim.position.set(2, -1, -3);
    scene.add(rim);
    const root = new THREE.Group();
    root.rotation.set(0.12, -0.12, -0.1);
    scene.add(root);
    const clickable: THREE.Mesh[] = [],
      animated: THREE.Group[] = [],
      discs: THREE.Group[] = [],
      heads: THREE.Group[] = [];
    const mat = (color: string, roughness = 0.48) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });
    const crimson = mat("#b85c61"),
      light = mat("#d88683"),
      deep = mat("#7a3544"),
      ivory = mat("#d9c7ac"),
      gold = mat("#d6b275"),
      blue = mat("#789fa7");
    // Original procedural tissue relief; no downloaded image or external asset.
    const textureBytes = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const grain =
          126 +
          38 * Math.sin(x * 0.9 + Math.sin(y * 0.1)) +
          12 * Math.sin(x * 3.7 + y * 2.3);
        const p = (y * 128 + x) * 4;
        textureBytes[p] = textureBytes[p + 1] = textureBytes[p + 2] = grain;
        textureBytes[p + 3] = 255;
      }
    const tissue = new THREE.DataTexture(
      textureBytes,
      128,
      128,
      THREE.RGBAFormat,
    );
    tissue.wrapS = tissue.wrapT = THREE.RepeatWrapping;
    tissue.needsUpdate = true;
    for (const m of [crimson, light, deep]) {
      m.bumpMap = tissue;
      m.bumpScale = 0.018;
      m.side = THREE.DoubleSide;
    }
    function mesh(
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      parent: THREE.Object3D,
      name: string,
      x = 0,
      y = 0,
      z = 0,
    ) {
      const m = new THREE.Mesh(geometry, material.clone());
      m.position.set(x, y, z);
      m.userData.structure = name;
      parent.add(m);
      clickable.push(m);
      return m;
    }
    function tube(
      length: number,
      radius: number,
      material: THREE.Material,
      parent: THREE.Object3D,
      name: string,
      x = 0,
      y = 0,
      z = 0,
    ) {
      const m = mesh(
        new THREE.CylinderGeometry(radius, radius, length, 16),
        material,
        parent,
        name,
        x,
        y,
        z,
      );
      m.rotation.z = Math.PI / 2;
      return m;
    }
    let disposed = false;
    if (scale === "muscle") {
      root.rotation.set(0, -0.15, -0.22);
      new GLTFLoader().load(
        "/stem/anatomy/sports/arm-muscles-atlas-v1.glb",
        (asset) => {
          if (disposed) {
            asset.scene.traverse((o) => {
              if (o instanceof THREE.Mesh) {
                o.geometry.dispose();
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                  (m) => m.dispose(),
                );
              }
            });
            return;
          }
          const bounds = new THREE.Box3().setFromObject(asset.scene);
          const centre = bounds.getCenter(new THREE.Vector3());
          const model = new THREE.Group();
          asset.scene.position.sub(centre);
          model.add(asset.scene);
          model.scale.setScalar(3.6 / bounds.getSize(new THREE.Vector3()).y);
          asset.scene.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            const source = Array.isArray(o.material)
              ? o.material[0]
              : o.material;
            const tendon = /tendon/i.test(source.name);
            const structure = tendon
              ? "tendon"
              : o.userData.structure || o.parent?.userData.structure || "bone";
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => m.dispose(),
            );
            o.material = (
              structure === "bone" || tendon
                ? ivory
                : structure === "triceps"
                  ? deep
                  : crimson
            ).clone();
            o.userData.structure = structure;
            clickable.push(o);
          });
          root.add(model);
          setReady(true);
        },
        undefined,
        () => {
          if (!disposed) setSupported(false);
        },
      );
    } else if (scale === "fibre") {
      tube(3.5, 0.62, deep, root, "membrane", 0, 0, -0.18);
      // Exposed myofibrils sit in front of the fibre envelope.
      for (let i = 0; i < 11; i++) {
        const a = i * 2.39996,
          r = 0.42 * Math.sqrt(i / 11),
          y = Math.cos(a) * r,
          z = 0.36 + Math.sin(a) * r;
        tube(3.6, 0.085, light, root, "myofibril", 0.15, y, z);
        for (let k = -11; k < 12; k++) {
          const band = tube(
            0.035,
            0.087,
            k % 3 === 0 ? ivory : deep,
            root,
            "myofibril",
            k * 0.15 + 0.15,
            y,
            z,
          );
          band.userData.striation = true;
        }
      }
      for (let i = 0; i < 6; i++) {
        const m = mesh(
          new THREE.SphereGeometry(0.1, 14, 10),
          gold,
          root,
          "mitochondrion",
          -1.3 + i * 0.5,
          i % 2 ? 0.52 : -0.52,
          0.25,
        );
        m.scale.set(1.8, 0.65, 0.8);
        const nucleus = mesh(
          new THREE.SphereGeometry(0.1, 12, 8),
          blue,
          root,
          "membrane",
          -1.2 + i * 0.48,
          0.5,
          -0.15,
        );
        nucleus.scale.x = 1.5;
      }
    } else {
      root.rotation.set(0.08, -0.08, 0);
      for (const sign of [-1, 1]) {
        const g = new THREE.Group();
        root.add(g);
        animated.push(g);
        const disc = new THREE.Group();
        root.add(disc);
        discs.push(disc);
        for (let k = -4; k <= 4; k++) {
          const line = tube(1.25, 0.009, ivory, disc, "zdisc", 0, k * 0.14, 0);
          line.rotation.set(Math.PI / 2, 0, 0);
          const cross = tube(1.25, 0.009, ivory, disc, "zdisc", 0, 0, k * 0.14);
          cross.rotation.set(0, 0, 0);
        }
        // Double-helical actin chains; each thin filament keeps a fixed length.
        for (const y of [-0.48, 0, 0.48])
          for (let strand = 0; strand < 2; strand++) {
            for (let i = 0; i <= 27; i++) {
              const t = i / 27,
                twist = t * Math.PI * 7 + strand * Math.PI;
              mesh(
                new THREE.SphereGeometry(0.032, 10, 8),
                strand ? crimson : light,
                g,
                "actin",
                sign * (1.65 - t * 1.28),
                y + Math.sin(twist) * 0.028,
                0.2 + Math.cos(twist) * 0.028,
              );
            }
          }
      }
      for (const y of [-0.24, 0.24]) {
        tube(1.8, 0.065, blue, root, "myosin", 0, y, 0.1);
        for (const sign of [-1, 1])
          for (let i = 0; i < 7; i++) {
            const h = new THREE.Group();
            h.position.set(sign * (0.17 + i * 0.1), y, 0.13);
            h.userData.sign = Math.sign(y);
            root.add(h);
            heads.push(h);
            const neck = tube(
              0.15,
              0.012,
              gold,
              h,
              "myosin",
              0,
              Math.sign(y) * 0.06,
              0,
            );
            neck.rotation.z = (-Math.sign(y) * Math.PI) / 3;
            const head = mesh(
              new THREE.SphereGeometry(0.033, 12, 8),
              gold,
              h,
              "myosin",
              0.04,
              Math.sign(y) * 0.13,
              0,
            );
            head.scale.set(0.8, 1.5, 0.9);
          }
      }
      // M-line marks the centre; a fine filament lattice conveys depth.
      const centre = tube(1.05, 0.008, ivory, root, "myosin");
      centre.rotation.set(0, 0, 0);
    }
    const ray = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const start = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const pick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(clickable)[0];
      if (hit) setSelected(hit.object.userData.structure);
    };
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    let frame = 0,
      previous = 0,
      time = 0,
      lastPhase = -1;
    const draw = (now: number) => {
      const p = live.current,
        dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      if (
        p.playing &&
        p.running &&
        (scale !== "sarcomere" || (p.config.atp >= 3 && p.config.calcium > 0))
      )
        time += dt;
      const current = p.playing ? Math.floor(time / 1.4) % 4 : p.phase;
      if (current !== lastPhase) {
        setPhase(current);
        lastPhase = current;
      }
      if (scale === "sarcomere") {
        const amount = sportsResult("muscle", p.config)[1].value / 100;
        const slide = amount * 0.42 * (0.5 + 0.5 * Math.sin(time * 0.65));
        animated.forEach((g, i) => (g.position.x = (i === 0 ? 1 : -1) * slide));
        discs.forEach(
          (g, i) => (g.position.x = (i === 0 ? -1 : 1) * (1.65 - slide)),
        );
        heads.forEach((h, i) => {
          h.rotation.z =
            p.config.atp < 3
              ? 0
              : p.playing
                ? Math.sin(time * 2.2 + i * 0.25) * 0.25
                : [-0.25, 0.25, 0.08, -0.1][p.phase];
        });
      }
      clickable.forEach((m) => {
        const material = m.material as THREE.MeshStandardMaterial;
        material.emissive.set(
          m.userData.structure === p.selected ? "#291b12" : "#000000",
        );
      });
      orbit.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    if (scale !== "muscle") setReady(true);
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      orbit.dispose();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      tissue.dispose();
      [crimson, light, deep, ivory, gold, blue].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [scale, reset]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div
          className="flex gap-1 rounded-lg bg-slate-100 p-1"
          aria-label="Muscle magnification"
        >
          {(
            [
              ["muscle", "Arm anatomy"],
              ["fibre", "Fibre"],
              ["sarcomere", "Sarcomere"],
            ] as const
          ).map(([key, label], i) => (
            <button
              key={key}
              onClick={() => {
                setScale(key);
                setSelected(structures[key][0][0]);
              }}
              aria-pressed={scale === key}
              className={`rounded-md px-3 py-2 text-xs font-medium ${scale === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              <span className="mr-1.5 opacity-50">0{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Layers size={13} />
          Explore across scales
        </span>
      </div>
      <div className="relative bg-[#172123]">
        <div ref={host} className="h-[350px] sm:h-[480px]" />
        {!supported && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-sm text-white">
            3D is unavailable on this device. Use the structure guide below.
          </div>
        )}
        {supported && !ready && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center text-sm text-white"
          >
            Preparing muscle cutaway…
          </div>
        )}
        <div className="pointer-events-none absolute left-4 top-4">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
            Anatomy explorer
          </span>
          <p className="mt-1 text-sm font-medium text-stone-100">
            {scale === "muscle"
              ? "Upper arm · anatomical atlas"
              : scale === "fibre"
                ? "Inside a muscle fibre"
                : "Sliding-filament mechanism"}
          </p>
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            aria-label={
              playing ? "Pause muscle animation" : "Play muscle animation"
            }
            onClick={() => setPlaying((v) => !v)}
            className="rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            aria-label="Reset muscle camera"
            onClick={() => setReset((v) => v + 1)}
            className="rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <span className="pointer-events-none absolute bottom-4 left-4 text-[10px] text-stone-400">
          Drag to rotate · select a structure · scroll to zoom
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
        <div
          className="flex flex-wrap gap-1 sm:flex-col"
          aria-label="Inspect muscle structures"
        >
          {structures[scale].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              aria-pressed={selected === id}
              className={`rounded-lg px-3 py-2 text-left text-xs ${selected === id ? "bg-[#edf2e4] font-semibold text-[#526b10]" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Focus size={14} />
            {detail[1]}
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-slate-600">
            {detail[2]}
          </p>
          <p className="mt-3 text-[10px] text-slate-400">
            {scale === "muscle" ? (
              <>
                Z-Anatomy / BodyParts3D ·{" "}
                <a
                  className="underline"
                  href="/stem/anatomy/sports/ATTRIBUTION.txt"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY-SA 4.0 attribution
                </a>
                . Resting anatomy; elbow movement is not simulated.
              </>
            ) : (
              "Magnified educational reconstruction · scales and colours are illustrative."
            )}
          </p>
        </div>
      </div>
      {scale === "sarcomere" && (
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex gap-1">
            {phases.map(([name], i) => (
              <button
                key={name}
                onClick={() => {
                  setPlaying(false);
                  setPhase(i);
                }}
                aria-pressed={phase === i}
                className={`flex-1 rounded-lg px-1 py-2 text-[10px] sm:text-xs ${phase === i ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"}`}
              >
                {i + 1} · {name}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            {phases[phase][1]}
          </p>
          <p className="mt-2 text-[10px] text-slate-400">
            Cycle shown slowly for learning. Filament lengths remain constant.
          </p>
        </div>
      )}
    </div>
  );
}
