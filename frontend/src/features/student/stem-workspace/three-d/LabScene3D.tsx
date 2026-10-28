import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export interface SceneState {
  reading: number;
  volume: number;
  colour: string;
  valve: boolean;
  mixed: boolean;
  aliquot: boolean;
  indicator: boolean;
  action: string;
  length?: number;
  mass?: number;
}
export default function LabScene3D({
  state,
  kind = "titration",
  view = "bench",
  onSelect,
  placements,
  held,
  onPick,
  onPlace,
}: {
  state: SceneState;
  kind?: "titration" | "pendulum";
  view?: string;
  onSelect?: (name: string) => void;
  placements?: Record<string, { x: number; z: number; rotation: number }>;
  held?: string | null;
  onPick?: (name: string) => void;
  onPlace?: (
    name: string,
    position: { x: number; z: number; rotation: number },
  ) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(state),
    select = useRef(onSelect),
    cameraView = useRef(view);
  latest.current = state;
  select.current = onSelect;
  cameraView.current = view;
  const interaction = useRef({ placements, held, onPick, onPlace });
  interaction.current = { placements, held, onPick, onPlace };
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;touch-action:none";
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      kind === "titration"
        ? "Interactive 3D titration apparatus: burette, pipette, conical flask and reagent bottles. Use equipment buttons for keyboard access."
        : "Animated three-dimensional pendulum. Change length and mass using the experiment controls.",
    );
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e7eef5");
    scene.fog = new THREE.Fog("#e7eef5", 13, 26);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
    camera.position.set(3.9, 3.5, 6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.enableDamping = true;
    controls.minDistance = 1.4;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8ca3, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 2.4);
    light.position.set(3, 8, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);
    const fill = new THREE.DirectionalLight(0xc5e0ff, 1.2);
    fill.position.set(-5, 4, -3);
    scene.add(fill);
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const mat = (color: string, metalness = 0, roughness = 0.5) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      materials.push(m);
      return m;
    };
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#90bad0",
      transparent: true,
      opacity: 0.36,
      roughness: 0.07,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materials.push(glass);
    const mesh = (
      geo: THREE.BufferGeometry,
      material: THREE.Material,
      pos: [number, number, number],
      name = "",
      parent: THREE.Object3D = scene,
    ) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(...pos);
      m.castShadow = material !== glass;
      m.receiveShadow = true;
      if (name) m.userData.equipment = name;
      parent.add(m);
      return m;
    };
    const cylinder = (
      rt: number,
      rb: number,
      h: number,
      material: THREE.Material,
      pos: [number, number, number],
      name = "",
      parent: THREE.Object3D = scene,
    ) =>
      mesh(
        new THREE.CylinderGeometry(rt, rb, h, 32),
        material,
        pos,
        name,
        parent,
      );
    function label(
      text: string,
      w: number,
      h: number,
      pos: [number, number, number],
      parent: THREE.Object3D = scene,
    ) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 192;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#f7fafc";
      ctx.fillRect(0, 0, 512, 192);
      ctx.fillStyle = "#23364d";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      text
        .split("\n")
        .forEach((line, i) => ctx.fillText(line, 256, 78 + i * 46));
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      materials.push(material);
      return mesh(new THREE.PlaneGeometry(w, h), material, pos, "", parent);
    }
    mesh(new THREE.BoxGeometry(7, 0.2, 3.5), mat("#263b50", 0.2), [0, 0.35, 0]);
    mesh(new THREE.BoxGeometry(6.8, 0.06, 3.3), mat("#f0f4f8"), [0, 0.48, 0]);
    mesh(
      new THREE.PlaneGeometry(40, 40),
      mat("#d6e0e9"),
      [0, -0.55, 0],
    ).rotation.x = -Math.PI / 2;
    mesh(new THREE.BoxGeometry(7, 3, 0.12), mat("#dce7ee"), [0, 1, -2.4]);
    label("ASSIGNMENT HUB  /  SCIENCE LAB", 3.8, 0.35, [0, 2.2, -2.31]);
    let liquid: THREE.Mesh | undefined,
      meniscus: THREE.Mesh | undefined,
      flaskLiquid: THREE.Mesh | undefined,
      tap: THREE.Mesh | undefined,
      drop: THREE.Mesh | undefined,
      pipette: THREE.Group | undefined,
      flask: THREE.Group | undefined,
      cloud: THREE.Mesh | undefined,
      bob: THREE.Group | undefined,
      string: THREE.Mesh | undefined;
    const liquidMat = mat("#b1dbef", 0, 0.18),
      indicatorMat = mat("#e75d9e", 0, 0.2);
    if (kind === "titration") {
      const metal = mat("#697d91", 0.8, 0.2);
      mesh(
        new THREE.BoxGeometry(1.05, 0.1, 0.75),
        metal,
        [-0.65, 0.55, -0.23],
        "Stand",
      );
      cylinder(0.035, 0.035, 3.7, metal, [-0.65, 2.4, -0.23], "Stand");
      mesh(
        new THREE.BoxGeometry(0.7, 0.045, 0.08),
        metal,
        [-0.3, 3.6, -0.23],
        "Burette",
      );
      cylinder(0.064, 0.064, 2.65, glass, [0, 2.975, 0], "Burette");
      cylinder(0.018, 0.04, 0.15, glass, [0, 1.575, 0], "Burette");
      liquid = cylinder(0.043, 0.043, 1, liquidMat, [0, 2.4, 0], "Burette");
      meniscus = cylinder(
        0.052,
        0.052,
        0.008,
        mat("#439bc4"),
        [0, 4.2, 0],
        "Burette",
      );
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 2048;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 256, 2048);
      ctx.fillStyle = "#254761";
      ctx.strokeStyle = "#254761";
      ctx.lineWidth = 2;
      ctx.font = "bold 32px sans-serif";
      for (let i = 0; i <= 500; i++) {
        const y = 30 + (i / 500) * 1980;
        ctx.beginPath();
        ctx.moveTo(6, y);
        ctx.lineTo(i % 50 === 0 ? 105 : i % 10 === 0 ? 70 : 35, y);
        ctx.stroke();
        if (i % 50 === 0) ctx.fillText(String(i / 10), 115, y + 10);
      }
      const scaleTex = new THREE.CanvasTexture(c);
      scaleTex.colorSpace = THREE.SRGBColorSpace;
      textures.push(scaleTex);
      const scaleMat = new THREE.MeshBasicMaterial({
        map: scaleTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      materials.push(scaleMat);
      mesh(
        new THREE.PlaneGeometry(0.24, 2.65),
        scaleMat,
        [0.11, 2.975, 0.075],
        "Burette",
      );
      cylinder(
        0.07,
        0.07,
        0.09,
        mat("#aab8c5"),
        [0, 1.55, 0],
        "Burette",
      ).rotation.z = Math.PI / 2;
      tap = mesh(
        new THREE.BoxGeometry(0.32, 0.045, 0.045),
        mat("#327cd5"),
        [0.12, 1.55, 0.02],
        "Burette",
      );
      flask = new THREE.Group();
      flask.position.set(0, 0.52, 0);
      scene.add(flask);
      const points = [
        [0.21, 0],
        [0.43, 0.03],
        [0.49, 0.1],
        [0.46, 0.35],
        [0.13, 0.82],
        [0.13, 0.98],
        [0.16, 1.0],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      mesh(
        new THREE.LatheGeometry(points, 48),
        glass,
        [0, 0, 0],
        "Flask",
        flask,
      );
      flaskLiquid = cylinder(
        0.38,
        0.43,
        0.24,
        mat("#b7deeb", 0, 0.18),
        [0, 0.13, 0],
        "Flask",
        flask,
      );
      cloud = mesh(
        new THREE.SphereGeometry(0.085, 16, 12),
        indicatorMat,
        [0.06, 0.23, 0],
        "Flask",
        flask,
      );
      label("HCl · 25 mL", 0.55, 0.18, [0, 0.28, 0.43], flask);
      mesh(
        new THREE.BoxGeometry(1.4, 0.025, 1.15),
        mat("#fafafa"),
        [0, 0.51, 0.1],
        "White tile",
      );
      pipette = new THREE.Group();
      scene.add(pipette);
      cylinder(0.018, 0.018, 1.7, glass, [0, 0, 0], "Pipette", pipette);
      const bulb = mesh(
        new THREE.SphereGeometry(0.095, 24, 16),
        glass,
        [0, 0, 0],
        "Pipette",
        pipette,
      );
      bulb.scale.y = 2.2;
      mesh(
        new THREE.SphereGeometry(0.09),
        mat("#cf7459"),
        [0, 1, 0],
        "Pipette",
        pipette,
      );
      label("25.00 mL", 0.36, 0.12, [0, 0.4, 0.035], pipette);
      function bottle(x: number, text: string, cap: string) {
        const g = new THREE.Group();
        scene.add(g);
        g.position.set(x, 0.51, -0.65);
        g.userData.equipment = text.startsWith("Indicator")
          ? "Indicator"
          : text.startsWith("NaOH")
            ? "NaOH"
            : "HCl";
        cylinder(0.19, 0.22, 0.55, glass, [0, 0.3, 0], text, g);
        cylinder(0.16, 0.19, 0.38, mat("#cae5ee"), [0, 0.23, 0], text, g);
        cylinder(0.09, 0.09, 0.12, mat(cap), [0, 0.64, 0], text, g);
        label(text, 0.38, 0.21, [0, 0.3, 0.218], g);
      }
      bottle(-1.9, "NaOH\n0.100 M", "#2978ca");
      bottle(-1.25, "HCl\nSample", "#ef9b44");
      bottle(1.95, "Indicator\nPhenolphthalein", "#e26a9a");
      drop = mesh(
        new THREE.SphereGeometry(0.021, 12, 8),
        mat("#b7dff6"),
        [0, 1.5, 0],
      );
      const goggles = new THREE.Group();
      goggles.position.set(2.25, 0.6, 0.7);
      scene.add(goggles);
      for (const x of [-0.14, 0.14])
        mesh(
          new THREE.TorusGeometry(0.14, 0.025, 8, 24),
          mat("#4279a2"),
          [x, 0, 0],
          "Goggles",
          goggles,
        );
      mesh(
        new THREE.BoxGeometry(0.08, 0.025, 0.025),
        mat("#4279a2"),
        [0, 0, 0],
        "Goggles",
        goggles,
      );
    } else {
      const metal = mat("#61758b", 0.8, 0.25);
      for (const x of [-0.85, 0.85])
        cylinder(0.045, 0.045, 3.9, metal, [x, 2.5, 0]);
      mesh(new THREE.BoxGeometry(1.9, 0.08, 0.08), metal, [0, 4.45, 0]);
      bob = new THREE.Group();
      bob.position.set(0, 4.4, 0);
      scene.add(bob);
      string = cylinder(
        0.008,
        0.008,
        1,
        mat("#27445d"),
        [0, -1, 0],
        "Pendulum",
        bob,
      );
      const ball = mesh(
        new THREE.SphereGeometry(0.15, 32, 24),
        mat("#d3a449", 0.8, 0.18),
        [0, -2, 0],
        "Pendulum",
        bob,
      );
      ball.name = "bob";
      label("SIMPLE PENDULUM", 1.7, 0.25, [0, 0.65, 0.7]);
    }
    const movable: Record<string, THREE.Group> = {};
    if (kind === "titration") {
      for (const name of [
        "Burette",
        "Flask",
        "Pipette",
        "Goggles",
        "Indicator",
        "NaOH",
        "HCl",
      ]) {
        const group = new THREE.Group();
        group.userData.equipment = name;
        group.userData.movable = true;
        const members = scene.children.filter(
          (child) =>
            child.userData.equipment === name ||
            child ===
              (
                { Flask: flask, Pipette: pipette } as Record<
                  string,
                  THREE.Object3D | undefined
                >
              )[name] ||
            (child instanceof THREE.Group &&
              child.children.some((c) => c.userData.equipment === name)),
        );
        members.forEach((child) => group.add(child));
        scene.add(group);
        movable[name] = group;
      }
    }
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let down = [0, 0],
      dragging: string | null = null;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.52),
      point = new THREE.Vector3(),
      offset = new THREE.Vector3();
    const aim = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const onDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
      if (e.button !== 0) return;
      aim(e);
      const hit = raycaster
        .intersectObjects(scene.children, true)
        .find(
          (h) =>
            h.object.userData.equipment || h.object.parent?.userData.equipment,
        );
      if (!hit) return;
      let root: THREE.Object3D | null = hit.object;
      while (root && !root.userData.movable) root = root.parent;
      if (root && interaction.current.onPlace) {
        dragging = root.userData.equipment;
        controls.enabled = false;
        interaction.current.onPick?.(dragging!);
        renderer.domElement.setPointerCapture(e.pointerId);
        if (raycaster.ray.intersectPlane(plane, point))
          offset.copy(root.position).sub(point);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      aim(e);
      if (!raycaster.ray.intersectPlane(plane, point)) return;
      point.add(offset);
      movable[dragging].position.set(
        THREE.MathUtils.clamp(point.x, -2.8, 2.8),
        0.15,
        THREE.MathUtils.clamp(point.z, -1.2, 1.2),
      );
    };
    const onUp = (e: PointerEvent) => {
      if (dragging) {
        const name = dragging,
          p = movable[name].position;
        dragging = null;
        controls.enabled = true;
        interaction.current.onPlace?.(name, {
          x: p.x,
          z: p.z,
          rotation: movable[name].rotation.y,
        });
        if (renderer.domElement.hasPointerCapture(e.pointerId))
          renderer.domElement.releasePointerCapture(e.pointerId);
        return;
      }
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      aim(e);
      const hit = raycaster
        .intersectObjects(scene.children, true)
        .find((h) => h.object.userData.equipment);
      if (hit) select.current?.(hit.object.userData.equipment);
    };
    const cancel = () => {
      dragging = null;
      controls.enabled = true;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", cancel);
    let contextLost = false;
    const lost = (e: Event) => {
      contextLost = true;
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const resize = new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    let frame = 0,
      previousView = "",
      previousAction = "",
      actionStart = 0;
    const start = performance.now();
    const animate = (now: number) => {
      if (contextLost) return;
      for (const [name, group] of Object.entries(movable)) {
        if (name === dragging) continue;
        const p = interaction.current.placements?.[name];
        group.position.set(
          p?.x ?? 0,
          interaction.current.held === name ? 0.2 : 0,
          p?.z ?? 0,
        );
        group.rotation.y = p?.rotation ?? 0;
      }
      const s = latest.current,
        t = (now - start) / 1000;
      if (previousView !== cameraView.current) {
        previousView = cameraView.current;
        if (previousView === "meniscus") {
          camera.position.set(0.35, 4.3 - (s.reading / 50) * 2.65, 1.4);
          controls.target.set(0, 4.3 - (s.reading / 50) * 2.65, 0);
        } else if (previousView === "flask") {
          camera.position.set(1.2, 1.55, 2.1);
          controls.target.set(0, 0.9, 0);
        } else {
          camera.position.set(3.9, 3.5, 6);
          controls.target.set(0, 2, 0);
        }
      }
      if (previousAction !== s.action) {
        previousAction = s.action;
        actionStart = t;
      }
      if (cameraView.current === "meniscus") {
        const y = 4.3 - (s.reading / 50) * 2.65;
        camera.position.y += y - controls.target.y;
        controls.target.y = y;
      }
      if (liquid && meniscus) {
        const h = Math.max(0.001, 2.65 * (1 - s.reading / 50));
        liquid.scale.y = h;
        liquid.position.y = 1.65 + h / 2;
        meniscus.position.y = 1.65 + h;
      }
      if (flaskLiquid) {
        flaskLiquid.visible = s.aliquot;
        flaskLiquid.scale.y = 1 + Math.min(s.volume, 50) / 100;
        flaskLiquid.position.y = 0.13 * flaskLiquid.scale.y;
        (flaskLiquid.material as THREE.MeshStandardMaterial).color.set(
          s.indicator && s.mixed
            ? s.colour === "Deep pink"
              ? "#df5497"
              : s.colour === "Pale pink"
                ? "#f6bed8"
                : "#b7deeb"
            : "#b7deeb",
        );
      }
      if (cloud) cloud.visible = s.indicator && !s.mixed && s.volume > 0;
      if (tap) tap.rotation.y = s.valve ? Math.PI / 2 : 0;
      if (drop) {
        drop.visible =
          s.valve || (s.action.startsWith("drop") && t - actionStart < 0.7);
        drop.position.y = 1.52 - ((t * 2.4) % 1) * 0.24;
      }
      if (pipette) {
        const moving = s.action.startsWith("pipette") && t - actionStart < 2;
        const placed = !!interaction.current.placements?.Pipette;
        pipette.position.set(
          moving && !placed ? 0 : 1.15,
          moving ? 2.45 : 1.65,
          moving && !placed ? 0 : 0.4,
        );
        pipette.rotation.z = moving ? 0 : -0.22;
      }
      if (flask)
        flask.rotation.z =
          s.action.startsWith("swirl") && t - actionStart < 2
            ? Math.sin(t * 14) * 0.045
            : 0;
      if (bob && string) {
        const length = (s.length ?? 1) * 1.35;
        bob.rotation.z = 0.15 * Math.cos(Math.sqrt(9.81 / (s.length ?? 1)) * t);
        string.scale.y = length;
        string.position.y = -length / 2;
        const ball = bob.getObjectByName("bob")!;
        ball.position.y = -length;
        ball.scale.setScalar(Math.cbrt(s.mass ?? 1));
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, attempt]);
  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-xl bg-[#e7eef5]">
      <div
        ref={host}
        className={`h-full min-h-[360px] w-full ${failed ? "hidden" : ""}`}
      />
      {failed && (
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="max-w-sm text-sm text-slate-600">
            3D is unavailable on this device. The accessible apparatus view and
            experiment controls remain available.
          </p>
          <svg
            viewBox="0 0 300 220"
            role="img"
            aria-label={
              kind === "pendulum"
                ? `2D pendulum fallback; length ${state.length ?? 1} metres`
                : `2D apparatus fallback; burette ${state.reading.toFixed(2)} mL; flask ${state.colour}`
            }
            className="h-48 w-full"
          >
            {kind === "pendulum" ? (
              <g>
                <path
                  d="M75 205V25H200M160 25V155"
                  stroke="#507089"
                  strokeWidth="4"
                  fill="none"
                />
                <circle cx="160" cy="170" r="15" fill="#507089" />
                <text x="185" y="100" fontSize="16">
                  {state.length ?? 1} m
                </text>
              </g>
            ) : (
              <>
                <path
                  d="M65 20V195H200M65 35H140V150"
                  stroke="#507089"
                  strokeWidth="4"
                  fill="none"
                />
                <rect
                  x="132"
                  y="20"
                  width="16"
                  height="120"
                  fill="#c4e5f4"
                  stroke="#507089"
                />
                <path
                  d="M130 150L100 205H180L150 150Z"
                  fill={state.colour === "Colourless" ? "#c4e5f4" : "#ed9bc3"}
                  stroke="#507089"
                />
                <text x="170" y="75" fontSize="16">
                  {state.reading.toFixed(2)} mL
                </text>
              </>
            )}
          </svg>
          <button
            type="button"
            className="rounded-lg border bg-white px-4 py-2 text-sm"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry 3D
          </button>
        </div>
      )}
    </div>
  );
}
