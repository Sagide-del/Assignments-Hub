import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  breathingSample,
  type RespiratoryConfig,
  type RespiratoryStructure,
} from "../../../../../../backend/src/labs/respiratory-engine";
export type RespiratoryView = "surface" | "airways" | "lobes" | "alveoli";
export interface RespiratoryMotion {
  time: number;
  running: boolean;
}
interface Props {
  config: RespiratoryConfig;
  motion: React.MutableRefObject<RespiratoryMotion>;
  view: RespiratoryView;
  selected: RespiratoryStructure;
  cameraView: "front" | "back" | "side";
  resetKey: number;
  labels: boolean;
  onSelect: (id: RespiratoryStructure) => void;
  onLoaded?: () => void;
}
export default function RespiratoryScene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef(props);
  live.current = props;
  const [status, setStatus] = useState<
      "loading" | "ready" | "error" | "context"
    >("loading"),
    [progress, setProgress] = useState(0),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false,
      lost = false,
      renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setStatus("context");
      return;
    }
    setStatus("loading");
    setProgress(0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.setClearColor(0, 0);
    renderer.domElement.style.cssText =
      "height:100%;width:100%;display:block;touch-action:none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Anatomical atlas model of five lung lobes, trachea, bronchial tree and diaphragm. Drag to rotate; select a structure to inspect it.",
    );
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.03, 40);
    camera.position.set(0, 0.15, 5.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.enablePan = true;
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment(),
      env = pmrem.fromScene(room, 0.08);
    scene.environment = env.texture;
    scene.add(new THREE.HemisphereLight(0xfff5f0, 0x67788b, 1.4));
    const key = new THREE.DirectionalLight(0xffe9de, 2.5);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd8e9ff, 1.5);
    fill.position.set(3, 0.5, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff5e6, 2);
    rim.position.set(1, 3, -3);
    scene.add(rim);
    const anatomy = new THREE.Group(),
      micro = new THREE.Group();
    scene.add(anatomy, micro);
    micro.visible = false;
    const materials: THREE.Material[] = [],
      geometries: THREE.BufferGeometry[] = [],
      loadedMaterials: THREE.Material[] = [],
      textures: THREE.Texture[] = [];
    const records: {
      mesh: THREE.Mesh;
      part: RespiratoryStructure;
      base: THREE.Vector3;
      colour: string;
      name: string;
    }[] = [];
    const markers: {
      button: HTMLButtonElement;
      point: THREE.Vector3;
      part: RespiratoryStructure;
    }[] = [];
    const makeMat = (colour: string) => {
      const m = new THREE.MeshPhysicalMaterial({
        color: colour,
        roughness: 0.58,
        metalness: 0,
        clearcoat: 0.08,
        clearcoatRoughness: 0.65,
        sheen: 0.15,
        sheenColor: new THREE.Color("#f2a6a0"),
        side: THREE.DoubleSide,
      });
      materials.push(m);
      return m;
    };
    const surface = (m: THREE.MeshPhysicalMaterial) => {
      m.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 tissuePosition;",
          )
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\ntissuePosition = position;",
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 tissuePosition;",
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
 float grain=sin(tissuePosition.x*290.0+sin(tissuePosition.z*120.0))*sin(tissuePosition.y*260.0)*0.025;
 float reticulation=pow(abs(sin(tissuePosition.x*63.0+sin(tissuePosition.z*47.0))*sin(tissuePosition.y*59.0+sin(tissuePosition.x*34.0))),14.0);
 diffuseColor.rgb *= 1.0+grain-reticulation*0.14;`,
          );
      };
    };
    const partFor = (name: string): RespiratoryStructure =>
      name.startsWith("right_")
        ? "right-lung"
        : name.startsWith("left_")
          ? "left-lung"
          : name === "diaphragm"
            ? "diaphragm"
            : name === "trachea"
              ? "trachea"
              : "bronchi";
    const palette: Record<string, string> = {
      right_upper: "#bd747c",
      right_middle: "#cc8a85",
      right_lower: "#ad6975",
      left_upper: "#c08089",
      left_lower: "#aa6979",
      diaphragm: "#a15d68",
      trachea: "#e1c5b5",
    };
    const anchors: Partial<Record<RespiratoryStructure, THREE.Vector3>> = {};
    const disposeLoaded = (group: THREE.Object3D) =>
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => {
            for (const value of Object.values(m))
              if (value instanceof THREE.Texture) value.dispose();
            m.dispose();
          });
        }
      });
    new GLTFLoader().load(
      "/stem/anatomy/respiratory-atlas.glb",
      (gltf) => {
        if (disposed || lost) {
          disposeLoaded(gltf.scene);
          return;
        }
        gltf.scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(gltf.scene),
          centre = bounds.getCenter(new THREE.Vector3()),
          scale = 2.7 / bounds.getSize(new THREE.Vector3()).y;
        gltf.scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const raw = o.geometry.clone().applyMatrix4(o.matrixWorld);
          raw.translate(-centre.x, -centre.y, -centre.z);
          raw.scale(scale, scale, scale);
          raw.computeBoundingBox();
          const anchor = raw.boundingBox!.getCenter(new THREE.Vector3());
          raw.translate(-anchor.x, -anchor.y, -anchor.z);
          geometries.push(raw);
          const name = o.name,
            part = partFor(name),
            colour = palette[name] ?? "#d8ad9c",
            mat = makeMat(colour);
          if (part === "right-lung" || part === "left-lung") surface(mat);
          const mesh = new THREE.Mesh(raw, mat);
          mesh.position.copy(anchor);
          mesh.userData.part = part;
          mesh.userData.source = o.userData.source_name ?? name;
          anatomy.add(mesh);
          records.push({ mesh, part, base: anchor.clone(), colour, name });
          if (!anchors[part]) anchors[part] = anchor.clone();
          if (part === "trachea") anchors.trachea = anchor.clone();
        });
        disposeLoaded(gltf.scene);
        const labels: {
          part: RespiratoryStructure;
          name: string;
          point: THREE.Vector3;
        }[] = [
          {
            part: "right-lung",
            name: "Right lung",
            point: new THREE.Vector3(-0.9, 0.0, 0.4),
          },
          {
            part: "left-lung",
            name: "Left lung",
            point: new THREE.Vector3(0.9, 0.0, 0.4),
          },
          {
            part: "trachea",
            name: "Trachea",
            point: anchors.trachea ?? new THREE.Vector3(0, 1, 0.1),
          },
          {
            part: "diaphragm",
            name: "Diaphragm",
            point: anchors.diaphragm ?? new THREE.Vector3(0, -1, 0),
          },
        ];
        for (const l of labels) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = l.name;
          b.className =
            "absolute z-10 rounded-md border border-white/90 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm";
          b.style.pointerEvents = "auto";
          b.setAttribute("aria-label", `Inspect ${l.name}`);
          b.onclick = () => live.current.onSelect(l.part);
          el.appendChild(b);
          markers.push({ button: b, point: l.point, part: l.part });
        }
        setStatus("ready");
        live.current.onLoaded?.();
      },
      (event) => {
        if (!disposed && event.total)
          setProgress(Math.round((event.loaded / event.total) * 100));
      },
      () => {
        if (!disposed) setStatus("error");
      },
    );
    // Enlarged microscopic teaching schematic, explicitly separate from the atlas geometry.
    const sphere = (
      r: number,
      m: THREE.Material,
      pos: THREE.Vector3,
      parent: THREE.Group,
    ) => {
      const geo = new THREE.SphereGeometry(r, 32, 24);
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.copy(pos);
      parent.add(mesh);
      return mesh;
    };
    const pink = makeMat("#d9a1a3");
    pink.transparent = true;
    pink.opacity = 0.66;
    pink.depthWrite = false;
    const blue = makeMat("#537eab"),
      red = makeMat("#c2676e"),
      airway = makeMat("#e1c4ae");
    const centres: THREE.Vector3[] = [];
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996,
        y = ((i % 4) - 0.5) * 0.23 - 0.3,
        r = 0.38 + (i % 3) * 0.08;
      const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      sphere(0.29, pink, p, micro);
      centres.push(p);
      const points: Array<THREE.Vector3> = [];
      for (let j = 0; j <= 32; j++) {
        const t = (j / 32) * Math.PI * 2;
        points.push(
          p
            .clone()
            .add(
              new THREE.Vector3(
                Math.cos(t) * 0.305,
                Math.sin(t) * 0.22,
                Math.sin(t) * 0.11 + 0.15,
              ),
            ),
        );
      }
      const geo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        40,
        0.018,
        8,
        false,
      );
      geometries.push(geo);
      micro.add(new THREE.Mesh(geo, i % 2 ? red : blue));
    }
    const bronchioleGeo = new THREE.CylinderGeometry(0.1, 0.18, 0.9, 32);
    geometries.push(bronchioleGeo);
    const bronchiole = new THREE.Mesh(bronchioleGeo, airway);
    bronchiole.position.y = 0.65;
    micro.add(bronchiole);
    const gasParticles: {
      mesh: THREE.Mesh;
      start: THREE.Vector3;
      end: THREE.Vector3;
    }[] = [];
    for (let i = 0; i < 12; i++) {
      const c = centres[i],
        start = c.clone(),
        end = c.clone().add(new THREE.Vector3(0.2, 0.02, 0.2));
      gasParticles.push({
        mesh: sphere(0.025, i % 2 ? blue : red, c, micro),
        start: i % 2 ? end : start,
        end: i % 2 ? start : end,
      });
    }
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let down = [0, 0];
    const pointerDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pointerUp = (e: PointerEvent) => {
      if (
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 ||
        live.current.view === "alveoli"
      )
        return;
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray
        .intersectObjects(anatomy.children, true)
        .find(
          (h) =>
            h.object.userData.part &&
            (live.current.view !== "airways" ||
              !["right-lung", "left-lung"].includes(h.object.userData.part)),
        );
      if (hit) live.current.onSelect(hit.object.userData.part);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    const contextLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setStatus("context");
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.fov =
        camera.aspect < 0.75
          ? THREE.MathUtils.radToDeg(
              2 *
                Math.atan(
                  (Math.tan(THREE.MathUtils.degToRad(36) / 2) * 0.75) /
                    camera.aspect,
                ),
            )
          : 36;
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    let frame = 0,
      lastCamera = "",
      lastView = "",
      lastReset = -1;
    const target = new THREE.Vector3();
    const loop = (now: number) => {
      if (disposed || lost) return;
      const p = live.current,
        sample = breathingSample(p.motion.current.time, p.config);
      anatomy.visible = p.view !== "alveoli";
      micro.visible = !anatomy.visible;
      if (
        lastCamera !== p.cameraView ||
        lastView !== p.view ||
        lastReset !== p.resetKey
      ) {
        lastReset = p.resetKey;
        lastCamera = p.cameraView;
        lastView = p.view;
        if (p.view === "alveoli") {
          camera.position.set(0, 0.2, 4.3);
          controls.target.set(0, 0, 0);
        } else {
          camera.position.set(
            ...((p.cameraView === "back"
              ? [0, 0.1, -5.5]
              : p.cameraView === "side"
                ? [4.6, 0.3, 3.8]
                : [0, 0.15, 5.5]) as [number, number, number]),
          );
          controls.target.set(0, 0, 0);
        }
      }
      for (const r of records) {
        const m = r.mesh.material as THREE.MeshPhysicalMaterial;
        const lung = r.part === "right-lung" || r.part === "left-lung";
        m.transparent = lung && p.view === "airways";
        m.opacity = m.transparent ? 0.12 : 1;
        m.depthWrite = !m.transparent;
        m.emissive.set(r.part === p.selected ? "#2b0d10" : "#000000");
        m.emissiveIntensity = 0.14;
        const colour =
          p.view === "lobes" && lung
            ? (
                {
                  right_upper: "#b46f8d",
                  right_middle: "#d99c7b",
                  right_lower: "#9b819e",
                  left_upper: "#c18490",
                  left_lower: "#8d8fa9",
                } as Record<string, string>
              )[r.name]
            : r.colour;
        m.color.set(colour ?? r.colour);
        r.mesh.position.copy(r.base);
        if (lung) {
          const amount = (sample.fraction * p.config.tidalVolume) / 0.5;
          r.mesh.scale.set(
            1 + 0.025 * amount,
            1 + 0.035 * amount,
            1 + 0.035 * amount,
          );
          r.mesh.position.y -= 0.025 * amount;
          if (p.view === "lobes") {
            r.mesh.position.x += r.base.x < 0 ? -0.07 : 0.07;
            if (r.name.includes("upper")) r.mesh.position.y += 0.06;
            if (r.name.includes("lower")) r.mesh.position.y -= 0.06;
          }
        } else if (r.part === "diaphragm") {
          r.mesh.scale.y = 1 - 0.1 * sample.fraction;
          r.mesh.position.y -= 0.08 * sample.fraction;
        } else r.mesh.scale.setScalar(1);
      }
      micro.scale.setScalar(1 + 0.025 * sample.fraction);
      gasParticles.forEach((g, i) => {
        g.mesh.position.lerpVectors(g.start, g.end, (now / 2500 + i / 12) % 1);
      });
      const width = el.clientWidth,
        height = el.clientHeight;
      for (const mark of markers) {
        mark.button.hidden = !p.labels || p.view === "alveoli";
        if (mark.button.hidden) continue;
        target.copy(mark.point).project(camera);
        mark.button.style.left = `${((target.x + 1) / 2) * width}px`;
        mark.button.style.top = `${((1 - target.y) / 2) * height}px`;
        mark.button.style.transform = "translate(-50%,-50%)";
        mark.button.style.borderColor =
          mark.part === p.selected ? "#b7848d" : "rgba(255,255,255,.9)";
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      markers.forEach((m) => m.button.remove());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      loadedMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      env.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [attempt]);
  return (
    <div
      className="relative h-full min-h-[440px] overflow-hidden rounded-xl"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%,#f7f4f2 0%,#e7eaf0 72%,#dde3ec 100%)",
      }}
    >
      <div
        ref={host}
        className={`relative h-full min-h-[440px] ${status === "context" || status === "error" ? "hidden" : ""}`}
      />
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#edf0f4]/90">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              Loading anatomical atlas…
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Lung lobes, airways and diaphragm
              {progress ? ` · ${progress}%` : ""}
            </p>
          </div>
        </div>
      )}
      {(status === "error" || status === "context") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p role="alert" className="max-w-sm text-sm leading-7 text-slate-600">
            {status === "error"
              ? "The anatomical model could not be downloaded. Retry when your connection is available."
              : "3D rendering is unavailable on this device. The structure guide and breathing controls remain available."}
          </p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="min-h-11 rounded-lg border bg-white px-4 text-xs font-medium"
          >
            Retry anatomical model
          </button>
        </div>
      )}
    </div>
  );
}
