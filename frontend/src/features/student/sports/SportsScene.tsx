import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  BONE_GUIDE,
  sportsResult,
  type SportsId,
} from "../../../../../backend/src/student/sports/sports-engine";
interface Props {
  kind: SportsId;
  config: Record<string, number>;
  selected: string;
  onSelect: (key: string) => void;
  running: boolean;
  stimulus: number;
  onStimulus?: () => void;
}
export default function SportsScene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef(props);
  live.current = props;
  const [status, setStatus] = useState("loading"),
    [attempt, retry] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false,
      frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor("#f3f5f3");
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;touch-action:none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      props.kind === "muscle"
        ? "Interactive three-dimensional sarcomere schematic"
        : "Interactive anatomical atlas skeleton",
    );
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100),
      controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0.2, 7);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 12;
    scene.add(new THREE.HemisphereLight("#ffffff", "#87948b", 2.3));
    const light = new THREE.DirectionalLight("#fff7ed", 3);
    light.position.set(-3, 4, 5);
    scene.add(light);
    const body = new THREE.Group();
    scene.add(body);
    const targets: THREE.Mesh[] = [],
      thin: THREE.Group[] = [],
      plates: THREE.Mesh[] = [],
      heads: THREE.Mesh[] = [];
    function material(color: string) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness: 0,
      });
    }
    function ball(x: number, y: number, z: number, r: number, color: string) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 14, 10),
        material(color),
      );
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    }
    function rod(
      a: THREE.Vector3,
      b: THREE.Vector3,
      r: number,
      color: string,
      parent: THREE.Object3D = scene,
    ) {
      const delta = b.clone().sub(a),
        m = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r, delta.length(), 10),
          material(color),
        );
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.normalize(),
      );
      parent.add(m);
      return m;
    }
    const vec = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
    let path: THREE.CatmullRomCurve3 | undefined,
      impulse: THREE.Mesh | undefined,
      brain: THREE.Mesh | undefined;
    if (props.kind === "muscle") {
      for (const sign of [-1, 1]) {
        const group = new THREE.Group();
        scene.add(group);
        thin.push(group);
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 1.65, 0.65),
          material("#596e65"),
        );
        scene.add(plate);
        plates.push(plate);
        for (const y of [-0.55, 0, 0.55]) {
          rod(
            vec(sign * 1.65, y, 0.1),
            vec(sign * 0.25, y, 0.1),
            0.035,
            "#b8616c",
            group,
          );
          for (let x = 0.35; x < 1.6; x += 0.14) {
            const bead = new THREE.Mesh(
              new THREE.SphereGeometry(0.048, 10, 8),
              material("#c97780"),
            );
            bead.position.set(sign * x, y, 0.1);
            group.add(bead);
          }
        }
      }
      for (const y of [-0.28, 0.28]) {
        rod(vec(-0.85, y, 0), vec(0.85, y, 0), 0.08, "#667ea6");
        for (let x = -0.7; x <= 0.7; x += 0.2) {
          const head = rod(
            vec(x, y, 0),
            vec(x + 0.09, y + Math.sign(y) * 0.18, 0.08),
            0.025,
            "#c0a16c",
          );
          heads.push(head);
        }
      }
      camera.position.set(0, 0.3, 5);
      setStatus("ready");
    } else {
      new GLTFLoader().load(
        "/stem/anatomy/sports/skeleton-atlas-v1.glb",
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
          const bounds = new THREE.Box3().setFromObject(g.scene),
            centre = bounds.getCenter(new THREE.Vector3()),
            scale = 3.6 / bounds.getSize(new THREE.Vector3()).y;
          g.scene.updateMatrixWorld(true);
          g.scene.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
            geometry.translate(-centre.x, -centre.y, -centre.z);
            geometry.scale(scale, scale, scale);
            const m = new THREE.Mesh(geometry, material("#ded7c5"));
            m.userData.bone = o.userData.bone_key;
            body.add(m);
            targets.push(m);
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
      if (props.kind === "reflex") {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.28, 0.08, 32),
          material("#38454b"),
        );
        plate.position.set(1, -0.23, 0.35);
        plate.userData.stimulus = true;
        scene.add(plate);
        targets.push(plate);
        for (const radius of [0.09, 0.15, 0.21]) {
          const heat = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.012, 8, 32),
            new THREE.MeshStandardMaterial({
              color: "#b75b42",
              emissive: "#7b2f1f",
              emissiveIntensity: 0.5,
            }),
          );
          heat.rotation.x = Math.PI / 2;
          heat.position.set(1, -0.18, 0.35);
          scene.add(heat);
        }
        path = new THREE.CatmullRomCurve3([
          vec(1, -0.1, 0.35),
          vec(0.6, 0.3, 0.35),
          vec(0, 0.35, 0.35),
          vec(0.05, 0.5, 0.36),
          vec(0.6, 0.5, 0.36),
          vec(1, 0.1, 0.35),
        ]);
        scene.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(path, 60, 0.018, 8, false),
            material("#bd9756"),
          ),
        );
        impulse = ball(1, -0.1, 0.35, 0.06, "#a45146");
        brain = ball(0, 1.4, 0.3, 0.09, "#6d7d9c");
      }
      if (props.kind === "energy") {
        for (const [i, color] of ["#9b864d", "#ac7372", "#6d8f7a"].entries()) {
          const curve = new THREE.CatmullRomCurve3([
            vec(-1.4, i * 0.5 - 0.4, 0.3),
            vec(-0.7, i * 0.35 - 0.3, 0.5),
            vec(0, 0, 0.4),
          ]);
          scene.add(
            new THREE.Mesh(
              new THREE.TubeGeometry(curve, 30, 0.02, 6, false),
              material(color),
            ),
          );
          const marker = ball(0, 0, 0, 0.07, color);
          marker.userData.curve = curve;
          heads.push(marker);
        }
      }
    }
    let down = { x: 0, y: 0 };
    const start = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY };
      },
      pick = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
        const rect = renderer.domElement.getBoundingClientRect(),
          ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          ),
          camera,
        );
        const mesh = ray.intersectObjects(targets)[0]?.object;
        if (mesh?.userData.stimulus) {
          live.current.onStimulus?.();
          return;
        }
        const key = mesh?.userData.bone;
        if (key && BONE_GUIDE[key]) live.current.onSelect(key);
      };
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    let time = 0,
      last = performance.now(),
      lastStimulus = 0,
      stimulusTime = -10;
    const draw = (now: number) => {
      if (disposed) return;
      const p = live.current;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (p.running) time += dt;
      targets.forEach((m) => {
        if (m.userData.stimulus) return;
        const selected = m.userData.bone === p.selected,
          mat = m.material as THREE.MeshStandardMaterial;
        mat.color.set(selected ? "#9cac77" : "#ded7c5");
        mat.emissive.set(selected ? "#18200c" : "#000000");
      });
      if (p.kind === "muscle") {
        const contraction = sportsResult("muscle", p.config)[1].value / 100,
          slide = contraction * 1.1 * (0.7 + 0.3 * Math.sin(time * 2));
        thin.forEach((g, i) => (g.position.x = (i === 0 ? 1 : -1) * slide));
        plates.forEach(
          (m, i) => (m.position.x = (i === 0 ? -1 : 1) * (1.65 - slide)),
        );
        heads.forEach(
          (m, i) =>
            (m.rotation.z =
              p.config.atp < 3 ? 0 : Math.sin(time * 4 + i) * 0.12),
        );
      }
      if (p.kind === "energy") {
        body.position.y = Math.sin(time * 5) * 0.025;
        heads.forEach((m, i) => {
          const curve = m.userData.curve as THREE.CatmullRomCurve3;
          m.position.copy(
            curve.getPoint(
              (((time * (0.2 + p.config.intensity / 200) + i * 0.3) % 1) + 1) %
                1,
            ),
          );
        });
      }
      if (p.kind === "reflex" && path && impulse) {
        if (p.stimulus !== lastStimulus) {
          lastStimulus = p.stimulus;
          stimulusTime = time;
        }
        const phase = (time - stimulusTime) / 4;
        impulse.visible = lastStimulus > 0 && phase >= 0 && phase <= 1;
        impulse.position.copy(path.getPoint(Math.max(0, Math.min(1, phase))));
        if (brain)
          (brain.material as THREE.MeshStandardMaterial).emissive.set(
            phase > 0.25 && phase < 1 ? "#4b647e" : "#000000",
          );
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.kind, attempt]);
  return (
    <div
      className="relative h-[340px] overflow-hidden rounded-xl sm:h-[470px]"
      ref={host}
    >
      {status !== "ready" && (
        <div
          role="status"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/95 p-6 text-center text-sm text-slate-500"
        >
          {status === "loading"
            ? "Preparing the anatomical workspace…"
            : status === "unsupported"
              ? "3D is unavailable on this device. You can still use the structure guide and complete the investigation."
              : "The anatomical model could not load."}
          {status === "error" && (
            <button
              className="mt-3 underline"
              onClick={() => retry((n) => n + 1)}
            >
              Retry model
            </button>
          )}
        </div>
      )}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[10px] text-slate-500">
        {props.kind === "muscle"
          ? "Enlarged sarcomere schematic · not to scale"
          : "Atlas anatomy · drag to rotate · pinch to zoom"}
      </span>
    </div>
  );
}
