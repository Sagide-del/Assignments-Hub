import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  juniorReading,
  type JuniorConfig,
  type JuniorKind,
} from "../../../../../../backend/src/labs/junior-science";
export default function JuniorScienceScene({
  kind,
  config,
}: {
  kind: JuniorKind;
  config: JuniorConfig;
}) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(config);
  current.current = config;
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.domElement.style.display = "block";
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0xf1f5f9);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(5, 3.5, 6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 7, 5);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.04;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.left = -4;
    light.shadow.camera.right = 4;
    light.shadow.camera.top = 5;
    light.shadow.camera.bottom = -2;
    scene.add(light);
    const materials: THREE.Material[] = [];
    const mat = (color: number, opacity = 1) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.15,
        transparent: opacity < 1,
        opacity,
        side: THREE.DoubleSide,
      });
      materials.push(m);
      return m;
    };
    const metal = mat(0x334155),
      glass = mat(0x9dd6ed, 0.2),
      water = mat(0x38bdf8, 0.6),
      white = mat(0xf8fafc);
    const mesh = (
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      scene.add(o);
      return o;
    };
    mesh(new THREE.BoxGeometry(6, 0.16, 3.4), white, 0, -0.08, 0).castShadow =
      false;
    let residue: THREE.Mesh | undefined;
    let turret: THREE.Group | undefined;
    const waves: THREE.Line[] = [];
    const grains: {
      mesh: THREE.Mesh;
      size: number;
      angle: number;
      radius: number;
    }[] = [];
    const focusParts: THREE.Mesh[] = [];
    if (kind === "filtration") {
      mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 3.4, 20),
        metal,
        -1.4,
        1.7,
        0,
      );
      mesh(new THREE.BoxGeometry(2.1, 0.1, 0.12), metal, -0.65, 2.7, 0);
      mesh(
        new THREE.CylinderGeometry(0.85, 0.14, 1.1, 48, 1, true),
        glass,
        0,
        2.45,
        0,
      );
      mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.6, 24, 1, true),
        glass,
        0,
        1.65,
        0,
      );
      mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.12, 40), white, 0, 2.3, 0);
      residue = mesh(
        new THREE.CylinderGeometry(0.61, 0.61, 0.07, 36),
        mat(0x9a6b3d),
        0,
        2.39,
        0,
      );
      mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 1.1, 48, 1, true),
        glass,
        0,
        0.6,
        0,
      );
      mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.55, 40), water, 0, 0.32, 0);
      mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.8, 12),
        water,
        0,
        1.03,
        0,
      );
      const sand = mat(0x946638);
      for (let i = 0; i < 100; i++) {
        const angle = i * 2.399,
          r = 0.5 * Math.sqrt((i + 0.5) / 100),
          size = i < 10 ? 20 : i < 30 ? 80 : i < 60 ? 300 : 1500;
        const particle = mesh(
          new THREE.SphereGeometry(
            size === 1500 ? 0.035 : size === 300 ? 0.025 : 0.018,
            7,
            5,
          ),
          sand,
          Math.cos(angle) * r,
          2.45 + (i % 4) * 0.025,
          Math.sin(angle) * r,
        );
        grains.push({ mesh: particle, size, angle, radius: r });
      }
    } else if (kind === "microscope") {
      mesh(new THREE.CylinderGeometry(0.85, 1, 0.16, 40), metal, 0, 0.1, 0);
      const armShape = new THREE.Shape();
      armShape.moveTo(-0.8, 0.2);
      armShape.bezierCurveTo(-0.75, 0.8, -0.82, 1.7, -0.48, 2.1);
      armShape.bezierCurveTo(-0.3, 2.35, 0.05, 2.35, 0.2, 2.08);
      armShape.lineTo(0.05, 1.9);
      armShape.bezierCurveTo(-0.18, 2.02, -0.4, 1.76, -0.42, 1.4);
      armShape.lineTo(-0.35, 0.2);
      armShape.closePath();
      mesh(
        new THREE.ExtrudeGeometry(armShape, {
          depth: 0.25,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.05,
          bevelThickness: 0.04,
        }),
        white,
        0,
        0,
        -0.13,
      );
      focusParts.push(
        mesh(new THREE.BoxGeometry(1.3, 0.12, 1.1), metal, 0, 1.15, 0),
      );
      focusParts.push(
        mesh(new THREE.BoxGeometry(0.9, 0.035, 0.35), glass, 0.1, 1.24, 0),
      );
      [-0.3, 0.4].forEach((x) =>
        focusParts.push(
          mesh(new THREE.BoxGeometry(0.08, 0.035, 0.5), metal, x, 1.26, 0),
        ),
      );
      mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20),
        mat(0x34d399),
        0.1,
        1.27,
        0,
      );
      mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 30), metal, 0, 2, 0);
      turret = new THREE.Group();
      turret.position.set(0, 1.84, 0);
      scene.add(turret);
      [0, 1, 2].forEach((i) => {
        const o = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.07, 0.25 + i * 0.1, 18),
          mat([0xdc2626, 0xfacc15, 0x2563eb][i]),
        );
        o.position.set(
          Math.cos(i * 2.094) * 0.2,
          -0.1,
          Math.sin(i * 2.094) * 0.2,
        );
        turret!.add(o);
      });
      const tube = mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.8, 24),
        white,
        -0.1,
        2.44,
        0,
      );
      tube.rotation.z = 0.3;
      const eye = mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.2, 24),
        metal,
        -0.24,
        2.88,
        0,
      );
      eye.rotation.z = 0.3;
      const knob = mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.2, 28),
        metal,
        -0.7,
        1.4,
        0.15,
      );
      knob.rotation.z = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 28), white, 0, 0.75, 0);
    } else {
      scene.add(new THREE.GridHelper(6, 24, 0x94a3b8, 0xcbd5e1));
      camera.position.set(5, 3.4, 6);
      controls.target.set(0, 0.8, 0);
      [0x2563eb, 0xd97706, 0x7c3aed].forEach((color) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(181 * 3), 3),
        );
        const m = new THREE.LineBasicMaterial({ color });
        materials.push(m);
        const line = new THREE.Line(geometry, m);
        waves.push(line);
        scene.add(line);
      });
    }
    focusParts.forEach((part) => {
      part.userData.originalY = part.position.y;
    });
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = 0;
    const clock = new THREE.Clock();
    let visible = true;
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersection.observe(el);
    function draw() {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      const time = clock.getElapsedTime(),
        c = current.current;
      if (residue) residue.scale.y = 0.3 + juniorReading(kind, c).reading / 10;
      grains.forEach((grain, i) => {
        if (grain.size >= c.filter) {
          grain.mesh.position.set(
            Math.cos(grain.angle) * grain.radius,
            2.45 + (i % 4) * 0.025,
            Math.sin(grain.angle) * grain.radius,
          );
        } else {
          const y = 3.05 - ((time * 0.55 + i * 0.053) % 2.5),
            r = y > 2.3 ? grain.radius : y > 1.1 ? 0.05 : grain.radius * 0.75;
          grain.mesh.position.set(
            Math.cos(grain.angle) * r,
            y,
            Math.sin(grain.angle) * r,
          );
        }
      });
      focusParts.forEach((part) => {
        part.position.y = part.userData.originalY + c.focus * 0.08;
      });
      if (turret) turret.rotation.y = [4, 10, 40].indexOf(c.objective) * 2.094;
      waves.forEach((line, index) => {
        const positions = line.geometry.attributes
          .position as THREE.BufferAttribute;
        for (let i = 0; i <= 180; i++) {
          const x = i / 30 - 3,
            base =
              2 * Math.PI * ((c.frequency * x) / 2 - c.frequency * time * 0.2),
            a = c.amplitude * 0.28 * Math.sin(base),
            b = c.amplitude * 0.28 * Math.sin(base + (c.phase * Math.PI) / 180);
          positions.setXYZ(
            i,
            x,
            1 + (index === 0 ? a : index === 1 ? b : a + b),
            (index - 1) * 0.8,
          );
        }
        positions.needsUpdate = true;
      });
      controls.update();
      renderer.render(scene, camera);
    }
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line)
          o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind]);
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-slate-100"
      style={{ height: "clamp(224px,32vw,384px)" }}
    >
      <div
        ref={host}
        style={{ position: "absolute", inset: 0 }}
        className="h-full w-full"
        aria-label={`${kind} interactive apparatus`}
      />
      {fallback ? (
        <div
          role="status"
          className="absolute inset-0 grid place-content-center p-8 text-center"
        >
          3D graphics are unavailable. The measurements and diagrams below
          remain available.
        </div>
      ) : (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600">
          Drag to inspect · scroll or pinch to zoom · teaching model
        </p>
      )}
    </div>
  );
}
