import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export interface StudioMotion {
  theta: number;
  time: number;
  running: boolean;
}
export default function StudioScene({
  kind,
  on = false,
  ready = false,
  connected = false,
  length = 1,
  mass = 100,
  motion,
  onPower,
  onMonitor,
  onAngle,
}: {
  kind: "computer" | "pendulum";
  on?: boolean;
  ready?: boolean;
  connected?: boolean;
  length?: number;
  mass?: number;
  motion?: React.MutableRefObject<StudioMotion>;
  onPower?: () => void;
  onMonitor?: () => void;
  onAngle?: (degrees: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef({
      on,
      ready,
      connected,
      length,
      mass,
      motion,
      onPower,
      onMonitor,
      onAngle,
    });
  live.current = {
    on,
    ready,
    connected,
    length,
    mass,
    motion,
    onPower,
    onMonitor,
    onAngle,
  };
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText =
      "height:100%;width:100%;display:block;touch-action:none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      kind === "computer"
        ? "3D workstation with system unit power button, monitor, keyboard and mouse."
        : "Interactive pendulum apparatus. Drag the brass bob to set its release angle.",
    );
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e6ebef");
    const pmrem = new THREE.PMREMGenerator(renderer),
      environment = new RoomEnvironment(),
      env = pmrem.fromScene(environment, 0.04);
    scene.environment = env.texture;
    const camera = new THREE.PerspectiveCamera(
      kind === "computer" ? 37 : 36,
      1,
      0.03,
      40,
    );
    camera.position.set(
      ...((kind === "computer" ? [3.4, 2.65, 4.1] : [1.5, 1.65, 4.2]) as [
        number,
        number,
        number,
      ]),
    );
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, kind === "computer" ? 1.15 : 1.4, 0);
    orbit.enableDamping = true;
    orbit.minDistance = kind === "computer" ? 2 : 1.5;
    orbit.maxDistance = 7;
    orbit.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667481, 1.5));
    const key = new THREE.DirectionalLight(0xfff6e9, 3);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd7e8ff, 1.2);
    fill.position.set(4, 3, -2);
    scene.add(fill);
    const materials: THREE.Material[] = [],
      textures: THREE.Texture[] = [];
    const material = (color: string, metalness = 0, roughness = 0.45) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      materials.push(m);
      return m;
    };
    const black = material("#19212b", 0.45, 0.3),
      rubber = material("#111922", 0.02, 0.8),
      metal = material("#8b9aa6", 0.9, 0.23),
      white = material("#e8e9e7", 0.05, 0.5),
      brass = material("#ba9144", 0.85, 0.17),
      wood = material("#b49d7c", 0.05, 0.6);
    const mesh = (
      geo: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const box = (
      w: number,
      h: number,
      d: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      p = scene as THREE.Object3D,
      r = 0.025,
    ) =>
      mesh(
        new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
        m,
        x,
        y,
        z,
        p,
      );
    const cylinder = (
      r: number,
      h: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      p = scene as THREE.Object3D,
    ) => mesh(new THREE.CylinderGeometry(r, r, h, 32), m, x, y, z, p);
    const text = (
      words: string,
      w: number,
      h: number,
      x: number,
      y: number,
      z: number,
      p: THREE.Object3D = scene,
    ) => {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 1024, 256);
      ctx.fillStyle = "#33475d";
      ctx.font = "600 65px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(words, 512, 160);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      const m = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      materials.push(m);
      return mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, p);
    };
    box(18, 0.1, 18, material("#d5dce1"), 0, -0.08, 0);
    let powerLight: THREE.Mesh | undefined,
      display: HTMLCanvasElement | undefined,
      displayTex: THREE.CanvasTexture | undefined,
      pendulum: THREE.Group | undefined,
      string: THREE.Mesh | undefined,
      bob: THREE.Mesh | undefined,
      bobHook: THREE.Mesh | undefined,
      gate: THREE.Group | undefined;
    const fans: THREE.Group[] = [];
    let screenSignature = "";
    if (kind === "computer") {
      box(4, 0.12, 2, wood, 0, 0.75, 0.05);
      for (const x of [-1.65, 1.65])
        box(0.08, 0.7, 0.08, metal, x, 0.35, -0.65);
      box(0.58, 1.05, 0.85, black, -1.1, 1.335, -0.2);
      box(0.53, 1, 0.025, rubber, -1.1, 1.335, 0.24);
      box(
        0.035,
        0.95,
        0.75,
        material("#344150", 0.55, 0.28),
        -0.79,
        1.335,
        -0.2,
      );
      for (let j = 0; j < 15; j++)
        box(
          0.3,
          0.012,
          0.012,
          metal,
          -1.1,
          1.12 + j * 0.017,
          0.262,
          scene,
          0.004,
        );
      for (const x of [-1.23, -1.1])
        box(0.065, 0.025, 0.016, rubber, x, 1.63, 0.263, scene, 0.004);
      const power = cylinder(0.055, 0.017, black, -0.94, 1.63, 0.267);
      power.rotation.x = Math.PI / 2;
      power.userData.action = "power";
      const led = material("#316c9a", 0.3, 0.2);
      powerLight = mesh(
        new THREE.TorusGeometry(0.035, 0.005, 10, 32),
        led,
        -0.94,
        1.63,
        0.279,
      );
      powerLight.userData.action = "power";
      text("AH • WORKSTATION", 0.39, 0.08, -1.1, 1.79, 0.264);
      for (const y of [1.18, 1.52]) {
        const fan = new THREE.Group();
        fan.position.set(-0.765, y, -0.2);
        fan.rotation.y = Math.PI / 2;
        scene.add(fan);
        for (let j = 0; j < 5; j++) {
          const blade = box(0.16, 0.035, 0.016, metal, 0.07, 0, 0, fan, 0.01);
          blade.rotation.z = (j * Math.PI * 2) / 5;
          blade.position.set(
            Math.cos((j * Math.PI * 2) / 5) * 0.06,
            Math.sin((j * Math.PI * 2) / 5) * 0.06,
            0,
          );
        }
        fans.push(fan);
      }
      box(0.42, 0.035, 0.35, black, 0.35, 0.85, -0.1);
      box(0.07, 0.4, 0.07, metal, 0.35, 1.04, -0.24);
      box(1.4, 0.88, 0.07, black, 0.35, 1.57, -0.15);
      box(1.33, 0.8, 0.018, rubber, 0.35, 1.59, -0.105);
      display = document.createElement("canvas");
      display.width = 1280;
      display.height = 800;
      displayTex = new THREE.CanvasTexture(display);
      displayTex.colorSpace = THREE.SRGBColorSpace;
      textures.push(displayTex);
      const screenMat = new THREE.MeshBasicMaterial({ map: displayTex });
      materials.push(screenMat);
      const screen = mesh(
        new THREE.PlaneGeometry(1.27, 0.75),
        screenMat,
        0.35,
        1.59,
        -0.092,
      );
      screen.userData.action = "monitor";
      text("ASSIGNMENT HUB", 0.35, 0.055, 0.35, 1.155, -0.105);
      box(1.25, 0.045, 0.43, black, 0.35, 0.82, 0.59);
      const keyMat = material("#3e4956", 0.15, 0.45);
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 14; col++)
          box(
            0.068,
            0.014,
            0.052,
            keyMat,
            -0.18 + col * 0.08,
            0.85,
            0.43 + row * 0.067,
            scene,
            0.006,
          );
      box(0.42, 0.018, 0.05, keyMat, 0.35, 0.857, 0.76, scene, 0.006);
      const mouse = mesh(
        new THREE.SphereGeometry(1, 32, 20),
        black,
        1.25,
        0.85,
        0.62,
      );
      mouse.scale.set(0.1, 0.055, 0.16);
      cylinder(0.022, 0.07, rubber, 1.25, 0.91, 0.58).rotation.x = Math.PI / 2;
      box(0.48, 0.015, 0.55, material("#566674", 0, 0.9), 1.25, 0.79, 0.6);
      const cable = (points: THREE.Vector3[]) =>
        mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            40,
            0.009,
            8,
            false,
          ),
          rubber,
          0,
          0,
          0,
        );
      cable([
        new THREE.Vector3(0.35, 0.83, 0.4),
        new THREE.Vector3(0.1, 0.81, 0.1),
        new THREE.Vector3(-0.5, 0.81, -0.6),
        new THREE.Vector3(-1.1, 1, -0.63),
      ]);
      cable([
        new THREE.Vector3(0.35, 1.3, -0.2),
        new THREE.Vector3(0.1, 0.82, -0.6),
        new THREE.Vector3(-1, 0.82, -0.8),
        new THREE.Vector3(-1.1, 1.2, -0.63),
      ]);
    } else {
      box(1.7, 0.12, 0.8, black, 0, 0.13, 0);
      box(0.08, 2.3, 0.08, metal, -0.65, 1.32, -0.16);
      box(1.35, 0.08, 0.12, metal, 0, 2.46, -0.12);
      box(0.16, 0.18, 0.2, black, 0, 2.43, -0.1);
      cylinder(0.035, 0.2, brass, 0, 2.42, 0).rotation.x = Math.PI / 2;
      // Actual degree markings and metre scale, with the pivot at the string origin.
      const pc = document.createElement("canvas");
      pc.width = 1024;
      pc.height = 600;
      const ctx = pc.getContext("2d")!;
      ctx.fillStyle = "#e7edf2";
      ctx.beginPath();
      ctx.arc(512, 50, 440, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#6b8295";
      ctx.fillStyle = "#34485e";
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      for (let degrees = -60; degrees <= 60; degrees += 5) {
        const a = (degrees * Math.PI) / 180,
          x = 512 + Math.sin(a) * 420,
          y = 50 + Math.cos(a) * 420;
        ctx.beginPath();
        ctx.moveTo(512 + Math.sin(a) * 395, 50 + Math.cos(a) * 395);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (degrees % 15 === 0)
          ctx.fillText(
            String(Math.abs(degrees)),
            512 + Math.sin(a) * 355,
            50 + Math.cos(a) * 355 + 10,
          );
      }
      const tex = new THREE.CanvasTexture(pc);
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      const pm = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      materials.push(pm);
      mesh(new THREE.PlaneGeometry(1.25, 0.73), pm, 0, 2.1, -0.07);
      box(0.12, 1.8, 0.025, white, 0.42, 1.5, -0.12);
      for (let j = 0; j <= 150; j++) {
        const y = 2.4 - j * 0.012,
          w = j % 10 === 0 ? 0.09 : j % 5 === 0 ? 0.06 : 0.025;
        box(w, 0.002, 0.008, metal, 0.4, y, -0.101, scene, 0.0005);
        if (j % 20 === 0)
          text((j / 100).toFixed(1), 0.1, 0.045, 0.53, y, -0.095);
      }
      text("LENGTH / m", 0.35, 0.07, 0.45, 2.5, -0.09);
      pendulum = new THREE.Group();
      pendulum.position.set(0, 2.4, 0);
      scene.add(pendulum);
      string = cylinder(
        0.004,
        1,
        material("#c8c1ab", 0, 0.85),
        0,
        -0.6,
        0,
        pendulum,
      );
      bob = mesh(
        new THREE.SphereGeometry(0.06, 48, 32),
        brass,
        0,
        -1.2,
        0,
        pendulum,
      );
      bob.userData.action = "bob";
      bobHook = cylinder(0.009, 0.055, metal, 0, -1.14, 0, pendulum);
      gate = new THREE.Group();
      scene.add(gate);
      box(0.3, 0.035, 0.2, black, 0, -0.12, 0.04, gate);
      box(0.035, 0.18, 0.2, black, -0.15, -0.03, 0.04, gate);
      box(0.035, 0.18, 0.2, black, 0.15, -0.03, 0.04, gate);
      text("OPTICAL GATE", 0.25, 0.045, 0, -0.12, 0.15, gate);
      text("PRECISION PENDULUM", 0.62, 0.08, 0, 0.19, 0.41);
    }
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2(),
      point = new THREE.Vector3(),
      plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    let down = [0, 0],
      drag = false;
    const aim = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
    };
    const pick = () =>
      ray
        .intersectObjects(scene.children, true)
        .find((h) => h.object.userData.action)?.object.userData.action;
    const pointerDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
      aim(e);
      if (pick() === "bob" && !live.current.motion?.current.running) {
        drag = true;
        orbit.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId);
      }
    };
    const pointerMove = (e: PointerEvent) => {
      if (!drag) return;
      aim(e);
      if (!ray.ray.intersectPlane(plane, point)) return;
      let degrees = THREE.MathUtils.clamp(
        (Math.atan2(point.x, 2.4 - point.y) * 180) / Math.PI,
        -40,
        40,
      );
      if (Math.abs(degrees) < 5) degrees = degrees < 0 ? -5 : 5;
      live.current.onAngle?.(Math.round(degrees));
    };
    const pointerUp = (e: PointerEvent) => {
      if (drag) {
        drag = false;
        orbit.enabled = true;
        if (renderer.domElement.hasPointerCapture(e.pointerId))
          renderer.domElement.releasePointerCapture(e.pointerId);
        return;
      }
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 7) return;
      aim(e);
      const action = pick();
      if (action === "power") live.current.onPower?.();
      if (action === "monitor") live.current.onMonitor?.();
    };
    const cancel = () => {
      drag = false;
      orbit.enabled = true;
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", cancel);
    let lost = false;
    const contextLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    let frame = 0;
    const tick = (now: number) => {
      if (lost) return;
      const s = live.current;
      if (powerLight)
        (powerLight.material as THREE.MeshStandardMaterial).emissive.set(
          s.on ? "#31a8f0" : "#000000",
        );
      fans.forEach((f) => {
        if (s.on) f.rotation.z = now * 0.008;
      });
      if (display && displayTex) {
        const sig = `${s.on}:${s.ready}:${s.connected}`;
        if (sig !== screenSignature) {
          screenSignature = sig;
          const dc = display.getContext("2d")!;
          dc.fillStyle = s.on ? "#12263d" : "#080d12";
          dc.fillRect(0, 0, 1280, 800);
          if (s.on) {
            dc.fillStyle = "#dceaf5";
            dc.font = "600 62px sans-serif";
            dc.fillText(
              s.ready ? "Assignment OS" : "AH / WORKSTATION",
              100,
              210,
            );
            dc.font = "30px sans-serif";
            dc.fillStyle = "#94b3ca";
            dc.fillText(
              s.ready
                ? "Click the monitor to use the desktop"
                : "Starting secure learning environment…",
              100,
              290,
            );
            if (s.ready) {
              for (let j = 0; j < 4; j++) {
                dc.fillStyle = ["#277dc7", "#2f9c8b", "#8870bc", "#d2934c"][j];
                dc.fillRect(100 + j * 250, 410, 150, 110);
              }
              dc.fillStyle = "#90b3c5";
              dc.fillText(
                s.connected
                  ? "School practice network connected"
                  : "Network disconnected",
                100,
                670,
              );
            }
          }
          displayTex.needsUpdate = true;
        }
      }
      if (pendulum && string && bob) {
        const l = s.length * 1.2;
        pendulum.rotation.z = s.motion?.current.theta ?? 0;
        string.scale.y = l;
        string.position.y = -l / 2;
        bob.position.y = -l;
        if (bobHook) bobHook.position.y = -l + 0.04;
        if (gate) gate.position.y = 2.4 - l;
        bob.scale.setScalar(Math.cbrt(s.mass / 100));
      }
      orbit.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      orbit.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      env.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, attempt]);
  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-xl bg-[#e6ebef]">
      <div
        ref={host}
        className={`h-full min-h-[400px] ${failed ? "hidden" : ""}`}
      />
      {failed && (
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="max-w-sm text-sm text-slate-600">
            3D rendering is unavailable. Use the labelled apparatus controls to
            continue.
          </p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            Retry 3D
          </button>
        </div>
      )}
    </div>
  );
}
