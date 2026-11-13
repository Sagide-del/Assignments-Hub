import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  BONE_GUIDE,
  type SportsId,
} from "../../../../../backend/src/student/sports/sports-engine";
import MuscleScene from "./MuscleScene";
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
  return props.kind === "muscle" ? (
    <MuscleScene config={props.config} running={props.running} />
  ) : (
    <AtlasScene {...props} />
  );
}
function AtlasScene(props: Props) {
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
    const targets: THREE.Mesh[] = [];
    function material(color: string) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness: 0,
      });
    }
    {
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
    const draw = () => {
      if (disposed) return;
      const p = live.current;
      targets.forEach((m) => {
        if (m.userData.stimulus) return;
        const selected = m.userData.bone === p.selected,
          mat = m.material as THREE.MeshStandardMaterial;
        mat.color.set(selected ? "#9cac77" : "#ded7c5");
        mat.emissive.set(selected ? "#18200c" : "#000000");
      });
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
      renderer.forceContextLoss();
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
