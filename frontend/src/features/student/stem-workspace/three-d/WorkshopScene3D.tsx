import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type {
  PracticalSpec,
  PracticalState,
  Placement,
} from "../../../../../../backend/src/labs/practical-engine";
export default function WorkshopScene3D({
  spec,
  state,
  selected,
  held,
  onPick,
  onPlace,
  onActivate,
}: {
  spec: PracticalSpec;
  state: PracticalState;
  selected: number;
  held: number | null;
  onPick: (tool: number) => void;
  onPlace: (tool: number, position: Placement) => void;
  onActivate: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef({ state, selected, held, onPick, onPlace, onActivate });
  live.current = { state, selected, held, onPick, onPlace, onActivate };
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;touch-action:none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      `${spec.title}: interactive 3D equipment. Drag an object onto the work mat. Equivalent keyboard controls are below.`,
    );
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8eef4");
    const camera = new THREE.PerspectiveCamera(43, 1, 0.05, 50);
    camera.position.set(3.2, 2.9, 4.9);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 1, 0);
    orbit.enableDamping = true;
    orbit.maxPolarAngle = Math.PI * 0.48;
    orbit.minDistance = 2;
    orbit.maxDistance = 12;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7c8fa5, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(4, 8, 6);
    scene.add(light);
    const materials: THREE.Material[] = [],
      textures: THREE.Texture[] = [];
    const animated: ((time: number) => void)[] = [];
    const mat = (colour: string, glass = false) => {
      const m = new THREE.MeshStandardMaterial({
        color: colour,
        roughness: 0.35,
        metalness: glass ? 0 : 0.15,
        transparent: glass,
        opacity: glass ? 0.48 : 1,
        side: THREE.DoubleSide,
      });
      materials.push(m);
      return m;
    };
    const metal = mat("#53677e"),
      blue = mat("#307ba4"),
      white = mat("#f4f8fc"),
      glass = mat("#8bbfd5", true),
      green = mat("#31836a"),
      red = mat("#c35f59"),
      amber = mat("#d59a3d");
    const mesh = (
      geo: THREE.BufferGeometry,
      material: THREE.Material,
      parent: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const box = (
      w: number,
      h: number,
      d: number,
      m: THREE.Material,
      p: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
    const ball = (
      r: number,
      m: THREE.Material,
      p: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => mesh(new THREE.SphereGeometry(r, 24, 16), m, p, x, y, z);
    const cyl = (
      r: number,
      h: number,
      m: THREE.Material,
      p: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => mesh(new THREE.CylinderGeometry(r, r, h, 24), m, p, x, y, z);
    const text = (
      content: string,
      w: number,
      h: number,
      p: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const c = document.createElement("canvas");
      c.width = 768;
      c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#f4f8fc";
      ctx.fillRect(0, 0, 768, 256);
      ctx.fillStyle = "#243b53";
      ctx.font = "600 40px sans-serif";
      ctx.textAlign = "center";
      content.split("\n").forEach((t, i) => ctx.fillText(t, 384, 90 + i * 55));
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      const m = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
      });
      materials.push(m);
      return mesh(new THREE.PlaneGeometry(w, h), m, p, x, y, z);
    };
    box(7, 0.18, 3.8, metal, scene, 0, 0.35, 0);
    box(6.9, 0.05, 3.7, white, scene, 0, 0.46, 0);
    box(3.2, 0.012, 1.8, mat("#d3e2e8"), scene, 0, 0.495, 0);
    box(7, 2, 0.12, mat("#d7e2e9"), scene, 0, 1, -2.15);
    text(spec.title.toUpperCase(), 3.3, 0.3, scene, 0, 1.7, -2.07);
    text(
      "WORK MAT · drag equipment here",
      2.3,
      0.18,
      scene,
      0,
      0.53,
      0.98,
    ).rotation.x = -Math.PI / 2;
    const grid = new THREE.GridHelper(3.2, 8, 0xa6bdc8, 0xc0d1d9);
    grid.position.y = 0.51;
    scene.add(grid);
    materials.push(
      ...(Array.isArray(grid.material) ? grid.material : [grid.material]),
    );
    const groups: THREE.Group[] = [],
      bases: THREE.Vector3[] = [];
    const digital = ["cyber", "network", "database", "algorithm"].includes(
        spec.kind,
      ),
      biology = [
        "anatomy",
        "digestion",
        "division",
        "respiration",
        "genetics",
        "ecosystem",
        "firstaid",
        "livestock",
      ].includes(spec.kind),
      molecular = ["molecule", "organic", "polymer"].includes(spec.kind),
      growing = ["plant", "soil", "hydroponics", "greenhouse"].includes(
        spec.kind,
      );
    for (let i = 0; i < spec.tools.length; i++) {
      const g = new THREE.Group();
      g.userData.tool = i;
      scene.add(g);
      groups.push(g);
      bases.push(new THREE.Vector3(-2.25 + i * 2.2, 0.51, -0.85));
      if (digital) {
        if (spec.kind === "database") {
          box(1.1, 0.9, 0.1, i === 2 ? amber : blue, g, 0, 0.55, 0);
          text(
            i === 0
              ? "LEARNERS\nID · name"
              : i === 1
                ? "RESULTS\nlearner_id · mark"
                : "FOREIGN KEY\nlearner_id → ID",
            1,
            0.45,
            g,
            0,
            0.58,
            0.06,
          );
        } else if (spec.kind === "algorithm") {
          for (let j = 0; j < 5; j++) {
            const b = box(
              0.16,
              (5 - j) * 0.12,
              0.25,
              [blue, green, amber][i],
              g,
              (j - 2) * 0.2,
              (5 - j) * 0.06,
              0,
            );
            animated.push((t) => {
              const sorted = live.current.state.completed >= 3;
              b.position.y = (sorted ? j + 1 : 5 - j) * 0.06;
              b.scale.y = sorted ? (j + 1) / (5 - j) : 1;
              if (sorted) b.position.z = Math.sin(t * 2 + j) * 0.02;
            });
          }
        } else if (i === 0) {
          box(0.9, 0.65, 0.08, metal, g, 0, 0.65, 0);
          const screen = box(
            0.78,
            0.52,
            0.012,
            mat("#122238"),
            g,
            0,
            0.65,
            0.05,
          );
          box(0.1, 0.3, 0.1, metal, g, 0, 0.18, 0);
          box(0.6, 0.04, 0.35, metal, g, 0, 0.03, 0.06);
          box(0.85, 0.04, 0.3, metal, g, 0, 0.025, 0.4);
          const display = document.createElement("canvas");
          display.width = 1024;
          display.height = 640;
          const dc = display.getContext("2d")!;
          const displayTexture = new THREE.CanvasTexture(display);
          displayTexture.colorSpace = THREE.SRGBColorSpace;
          textures.push(displayTexture);
          const displayMaterial = new THREE.MeshBasicMaterial({
            map: displayTexture,
          });
          materials.push(displayMaterial);
          screen.material = displayMaterial;
          let screenKey = "";
          animated.push(() => {
            const state = live.current.state,
              key = `${state.completed}:${state.value}`;
            if (key === screenKey) return;
            screenKey = key;
            dc.fillStyle = "#102139";
            dc.fillRect(0, 0, 1024, 640);
            dc.fillStyle =
              state.completed >= 4
                ? "#60d7ae"
                : state.completed >= 3
                  ? "#f7b45d"
                  : "#b8d8ed";
            dc.font = "bold 60px sans-serif";
            dc.fillText(
              state.completed ? "ASSIGNMENT OS" : "POWER OFF",
              60,
              100,
            );
            dc.fillStyle = "#e5edf7";
            dc.font = "36px sans-serif";
            const rows = [
              "Workstation ready",
              "Local network connected",
              "Threat event detected",
              "Defence policy enabled",
              "Retest: scenario blocked",
            ];
            rows
              .slice(0, state.completed)
              .forEach((line, index) =>
                dc.fillText(line, 60, 200 + index * 72),
              );
            displayTexture.needsUpdate = true;
          });
        } else if (spec.kind === "network" && i === 2) {
          mesh(
            new THREE.TorusGeometry(0.28, 0.025, 12, 40),
            blue,
            g,
            0,
            0.06,
            0,
          ).rotation.x = Math.PI / 2;
          box(0.12, 0.08, 0.1, glass, g, 0.28, 0.08, 0.1);
          box(0.12, 0.08, 0.1, glass, g, -0.28, 0.08, -0.1);
        } else {
          box(0.9, 0.22, 0.55, i === 2 ? green : blue, g, 0, 0.13, 0);
          for (let j = 0; j < 5; j++)
            box(0.09, 0.06, 0.01, metal, g, (j - 2) * 0.14, 0.15, 0.28);
          if (i === 2) text("SECURITY GATEWAY", 0.9, 0.18, g, 0, 0.35, 0.1);
          else text("SWITCH", 0.65, 0.18, g, 0, 0.35, 0.1);
        }
      } else if (spec.kind === "building") {
        if (i === 0) box(1.8, 0.12, 1.25, metal, g, 0, 0.06, 0);
        if (i === 1) {
          box(0.13, 0.85, 1.2, white, g, -0.7, 0.43, 0);
          box(0.13, 0.85, 1.2, white, g, 0.7, 0.43, 0);
          box(0.13, 0.85, 0.13, white, g, 0, 0.43, -0.55);
        }
        if (i === 2) {
          box(1.8, 0.12, 1.3, amber, g, 0, 1, 0);
          const load = box(0.4, 0.3, 0.4, red, g, 0, 1.2, 0);
          animated.push(() => {
            load.scale.y = live.current.state.value / 10;
            load.visible = live.current.state.completed >= 4;
          });
        }
      } else if (molecular) {
        const count =
          spec.kind === "organic" || spec.kind === "polymer"
            ? 6
            : spec.kind === "dna"
              ? 8
              : 4;
        for (let j = 0; j < count; j++) {
          const a = ball(
            i === 0 ? 0.13 : 0.09,
            [metal, red, blue][i],
            g,
            ((j % 4) - 1.5) * 0.23,
            0.2 + Math.floor(j / 4) * 0.32,
            Math.sin(j * 1.5) * 0.15,
          );
          animated.push((t) => {
            a.position.z = Math.sin(t * 0.4 + j) * 0.18;
            a.visible = j < Math.max(2, live.current.state.value);
          });
          if (j > 0)
            cyl(
              0.022,
              0.24,
              white,
              g,
              ((j % 4) - 1.5) * 0.23,
              0.3,
              0,
            ).rotation.z = Math.PI / 2;
        }
      } else if (spec.kind === "nutrition") {
        cyl(0.4, 0.05, white, g, 0, 0.07, 0);
        for (let j = 0; j < 4; j++)
          ball(
            0.1,
            [amber, red, green][i],
            g,
            ((j % 2) - 0.5) * 0.22,
            0.15,
            (Math.floor(j / 2) - 0.5) * 0.22,
          );
      } else if (spec.kind === "weather") {
        if (i === 0) {
          cyl(0.025, 0.9, glass, g, 0, 0.55, 0);
          cyl(0.012, 0.6, red, g, 0, 0.4, 0);
          ball(0.06, red, g, 0, 0.1, 0);
        } else if (i === 1) {
          cyl(0.18, 0.6, glass, g, 0, 0.3, 0);
          cyl(0.16, 0.16, blue, g, 0, 0.08, 0);
        } else {
          cyl(0.025, 0.8, metal, g, 0, 0.4, 0);
          const rotor = new THREE.Group();
          g.add(rotor);
          rotor.position.y = 0.85;
          for (let j = 0; j < 3; j++) {
            const arm = box(0.4, 0.025, 0.025, metal, rotor, 0.2, 0, 0);
            arm.rotation.y = (j * Math.PI * 2) / 3;
            ball(
              0.08,
              blue,
              rotor,
              Math.cos((j * Math.PI * 2) / 3) * 0.4,
              0,
              Math.sin((j * Math.PI * 2) / 3) * 0.4,
            );
          }
          animated.push((t) => {
            rotor.rotation.y = t * 2;
          });
        }
      } else if (spec.kind === "firstaid" && i === 1) {
        box(0.6, 0.35, 0.35, white, g, 0, 0.2, 0);
        box(0.12, 0.25, 0.02, red, g, 0, 0.2, 0.185);
        box(0.3, 0.08, 0.02, red, g, 0, 0.2, 0.19);
      } else if (spec.kind === "firstaid" && i === 2) {
        box(0.28, 0.5, 0.06, metal, g, 0, 0.3, 0);
        box(0.23, 0.38, 0.01, blue, g, 0, 0.32, 0.04);
        text("HELP", 0.21, 0.09, g, 0, 0.32, 0.05);
      } else if (spec.kind === "pcr" && i === 0) {
        box(0.9, 0.4, 0.7, white, g, 0, 0.2, 0);
        box(0.65, 0.06, 0.45, metal, g, 0, 0.43, 0);
        for (let j = 0; j < 6; j++)
          cyl(
            0.035,
            0.12,
            blue,
            g,
            ((j % 3) - 1) * 0.17,
            0.48,
            (Math.floor(j / 3) - 0.5) * 0.18,
          );
      } else if (spec.kind === "gel" && i === 0) {
        box(0.9, 0.15, 0.65, glass, g, 0, 0.1, 0);
        box(0.75, 0.04, 0.5, white, g, 0, 0.19, 0);
        for (let j = 0; j < 4; j++) {
          const band = box(
            0.11,
            0.015,
            0.03,
            blue,
            g,
            (j - 1.5) * 0.15,
            0.22,
            -0.15,
          );
          animated.push(() => {
            band.position.z =
              live.current.state.completed >= 3 ? 0.18 - j * 0.04 : -0.15;
          });
        }
      } else if (spec.kind === "dna") {
        const count = 12;
        for (let j = 0; j < count; j++) {
          const angle = j * 0.6,
            height = 0.15 + j * 0.065;
          ball(
            0.045,
            i === 0 ? metal : i === 1 ? red : blue,
            g,
            Math.cos(angle) * 0.25,
            height,
            Math.sin(angle) * 0.25,
          );
          ball(
            0.045,
            i === 0 ? metal : i === 1 ? amber : green,
            g,
            -Math.cos(angle) * 0.25,
            height,
            -Math.sin(angle) * 0.25,
          );
          if (i > 0) {
            const bond = cyl(0.016, 0.5, white, g, 0, height, 0);
            bond.rotation.z = Math.PI / 2;
            bond.rotation.y = -angle;
          }
        }
      } else if (biology) {
        if (
          ["anatomy", "firstaid", "digestion", "respiration"].includes(
            spec.kind,
          )
        ) {
          ball(0.17, i === 0 ? amber : red, g, 0, 1, 0);
          box(0.35, 0.52, 0.18, i === 0 ? blue : red, g, 0, 0.58, 0);
          box(0.1, 0.4, 0.1, metal, g, -0.13, 0.18, 0);
          box(0.1, 0.4, 0.1, metal, g, 0.13, 0.18, 0);
          if (i === 1) {
            ball(0.1, red, g, -0.08, 0.7, 0.13);
            ball(0.1, red, g, 0.08, 0.7, 0.13);
          }
        } else {
          const body = ball(0.35, [green, amber, blue][i], g, 0, 0.4, 0);
          body.scale.set(1, 0.6, 1);
          ball(0.1, red, g, 0.1, 0.44, 0.15);
          for (let j = 0; j < 4; j++) {
            const chromosome = box(
              0.04,
              0.18,
              0.04,
              blue,
              g,
              (j - 1.5) * 0.1,
              0.48,
              0.2,
            );
            animated.push((t) => {
              chromosome.position.x =
                (j - 1.5) *
                (0.1 +
                  (live.current.state.completed >= 3 ? 0.05 * Math.sin(t) : 0));
            });
          }
        }
      } else if (growing) {
        const plantTray = () => {
          box(0.7, 0.3, 0.6, metal, g, 0, 0.15, 0);
          box(0.66, 0.04, 0.56, mat("#82664f"), g, 0, 0.32, 0);
          for (let j = 0; j < 3; j++) {
            cyl(0.025, 0.5, green, g, (j - 1) * 0.2, 0.58, 0);
            const leaf = ball(0.14, green, g, (j - 1) * 0.2 + 0.06, 0.7, 0);
            leaf.scale.set(1, 0.25, 0.5);
            animated.push(() => {
              leaf.scale.x = 0.6 + live.current.state.value / (spec.max * 1.5);
            });
          }
        };
        if (spec.kind === "soil") {
          if (i === 0) {
            cyl(0.25, 0.4, mat("#997154"), g, 0, 0.2, 0);
            cyl(0.22, 0.05, mat("#644f3b"), g, 0, 0.42, 0);
          } else if (i === 1) {
            cyl(0.07, 0.6, glass, g, 0, 0.35, 0);
            cyl(0.06, 0.18, mat("#82664f"), g, 0, 0.15, 0);
          } else {
            cyl(0.025, 0.8, metal, g, 0, 0.45, 0);
            box(0.18, 0.22, 0.09, blue, g, 0, 0.92, 0);
          }
        } else if (spec.kind === "hydroponics") {
          if (i === 0) plantTray();
          else if (i === 1) {
            cyl(0.3, 0.5, glass, g, 0, 0.25, 0);
            cyl(0.27, 0.3, blue, g, 0, 0.16, 0);
          } else {
            box(0.4, 0.3, 0.4, metal, g, 0, 0.15, 0);
            cyl(0.03, 0.5, blue, g, 0.2, 0.35, 0);
            cyl(0.03, 0.5, blue, g, 0, 0.55, 0).rotation.z = Math.PI / 2;
          }
        } else if (spec.kind === "greenhouse") {
          if (i === 0) {
            box(1.2, 0.04, 0.8, metal, g, 0, 0.04, 0);
            for (const x of [-0.55, 0.55])
              for (const z of [-0.35, 0.35])
                box(0.025, 0.9, 0.025, metal, g, x, 0.5, z);
            box(1.1, 0.8, 0.015, glass, g, 0, 0.5, -0.35);
            box(1.15, 0.03, 0.8, glass, g, 0, 0.95, 0);
          } else if (i === 1) plantTray();
          else {
            box(0.6, 0.6, 0.1, white, g, 0, 0.4, 0);
            const fan = new THREE.Group();
            fan.position.y = 0.4;
            g.add(fan);
            for (let j = 0; j < 3; j++) {
              const blade = box(0.45, 0.06, 0.04, blue, fan);
              blade.rotation.z = (j * Math.PI) / 3;
            }
            animated.push((t) => {
              fan.rotation.z = live.current.state.completed >= 3 ? t * 5 : 0;
            });
          }
        } else if (i === 0) {
          plantTray();
        } else if (i === 1) {
          cyl(0.22, 0.4, green, g, 0, 0.23, 0);
          const spout = cyl(0.045, 0.45, green, g, 0.28, 0.35, 0);
          spout.rotation.z = -Math.PI / 3;
          mesh(
            new THREE.TorusGeometry(0.17, 0.025, 10, 24),
            metal,
            g,
            -0.24,
            0.25,
            0,
          );
        } else {
          box(0.7, 0.05, 0.6, white, g, 0, 1.1, 0);
          box(0.035, 1.1, 0.035, metal, g, 0.3, 0.55, 0);
          box(0.6, 0.04, 0.4, metal, g, 0.1, 0.03, 0);
          box(0.6, 0.012, 0.5, amber, g, 0, 1.065, 0);
        }
      } else if (spec.kind === "pendulum") {
        if (i === 0) {
          box(1.2, 0.08, 0.1, metal, g, 0, 1.6, 0);
          box(0.06, 1.6, 0.06, metal, g, -0.5, 0.8, 0);
          box(0.06, 1.6, 0.06, metal, g, 0.5, 0.8, 0);
        } else if (i === 1) {
          const p = new THREE.Group();
          g.add(p);
          p.position.y = 1.5;
          const wire = cyl(0.012, 1, metal, p, 0, -0.5, 0);
          const bob = ball(0.12, amber, p, 0, -1, 0);
          animated.push((t) => {
            const len = live.current.state.value * 0.6;
            wire.scale.y = len;
            wire.position.y = -len / 2;
            bob.position.y = -len;
            p.rotation.z =
              live.current.state.completed >= 3
                ? 0.15 *
                  Math.cos(Math.sqrt(9.81 / live.current.state.value) * t)
                : 0.15;
          });
        } else {
          cyl(0.2, 0.08, metal, g, 0, 0.3, 0).rotation.x = Math.PI / 2;
          text("TIMER", 0.45, 0.18, g, 0, 0.6, 0);
        }
      } else if (
        ["lever", "aviation", "projectile", "automotive"].includes(spec.kind)
      ) {
        if (spec.kind === "lever") {
          if (i === 0) {
            const beam = box(1.4, 0.06, 0.25, blue, g, 0, 0.5, 0);
            animated.push((t) => {
              beam.rotation.z =
                live.current.state.completed >= 3 ? Math.sin(t) * 0.04 : 0;
            });
          } else if (i === 1)
            mesh(new THREE.ConeGeometry(0.2, 0.45, 4), amber, g, 0, 0.24, 0);
          else {
            box(0.3, 0.3, 0.3, metal, g, 0, 0.2, 0);
            text("10 N", 0.28, 0.12, g, 0, 0.25, 0.16);
          }
        } else if (spec.kind === "projectile") {
          if (i === 0) {
            box(0.7, 0.08, 0.5, metal, g, 0, 0.06, 0);
            const launcher = cyl(0.08, 0.65, blue, g, 0, 0.4, 0);
            animated.push(() => {
              launcher.rotation.z =
                (-(90 - live.current.state.value) * Math.PI) / 180;
            });
          } else if (i === 1) {
            const projectile = ball(0.12, red, g, 0, 0.15, 0);
            animated.push((t) => {
              const a = (live.current.state.value * Math.PI) / 180,
                f = (t % 2) / 2;
              projectile.position.set(
                live.current.state.completed >= 3 ? f * 0.8 : 0,
                0.15 +
                  (live.current.state.completed >= 3
                    ? Math.sin(f * Math.PI) * Math.sin(a)
                    : 0),
                0,
              );
            });
          } else {
            box(1.3, 0.035, 0.15, white, g, 0, 0.04, 0);
            for (let j = 0; j < 10; j++)
              box(0.01, 0.008, 0.08, metal, g, (j - 4.5) * 0.12, 0.065, 0);
          }
        } else if (spec.kind === "aviation") {
          if (i === 0) {
            box(1.1, 0.05, 0.5, blue, g, 0, 0.6, 0).rotation.z = 0.08;
            box(0.05, 0.6, 0.05, metal, g, 0, 0.3, 0);
          } else if (i === 1) {
            box(0.55, 0.55, 0.2, metal, g, 0, 0.35, 0);
            const fan = box(0.4, 0.06, 0.04, white, g, 0, 0.35, 0.12);
            animated.push((t) => {
              fan.rotation.z = live.current.state.completed >= 2 ? t * 4 : 0;
            });
          } else {
            cyl(0.2, 0.08, white, g, 0, 0.4, 0).rotation.x = Math.PI / 2;
            box(0.5, 0.08, 0.35, metal, g, 0, 0.05, 0);
          }
        } else {
          if (i === 0) {
            box(0.8, 0.45, 0.5, metal, g, 0, 0.3, 0);
            for (let j = 0; j < 3; j++)
              cyl(0.09, 0.18, amber, g, (j - 1) * 0.22, 0.6, 0);
          } else if (i === 1) {
            box(0.55, 0.4, 0.3, metal, g, 0, 0.2, 0);
            box(0.12, 0.05, 0.1, red, g, -0.15, 0.43, 0);
            box(0.12, 0.05, 0.1, blue, g, 0.15, 0.43, 0);
          } else {
            box(0.35, 0.55, 0.1, amber, g, 0, 0.3, 0);
            text("DC V", 0.26, 0.14, g, 0, 0.4, 0.06);
          }
        }
      } else if (
        ["microscope", "optics", "spectrum", "photoelectric"].includes(
          spec.kind,
        )
      ) {
        if (spec.kind === "microscope") {
          if (i === 0) {
            box(0.7, 0.07, 0.6, metal, g, 0, 0.04, 0);
            box(0.09, 0.8, 0.09, metal, g, -0.22, 0.45, 0);
            cyl(0.08, 0.45, white, g, 0, 0.85, 0);
            box(0.55, 0.04, 0.4, metal, g, 0, 0.4, 0);
            cyl(0.045, 0.15, metal, g, 0, 0.55, 0);
          } else if (i === 1) {
            box(0.65, 0.03, 0.25, glass, g, 0, 0.05, 0);
            const cell = ball(0.1, green, g, 0, 0.08, 0);
            cell.scale.y = 0.1;
            ball(0.025, red, g, 0.02, 0.095, 0);
          } else {
            cyl(0.13, 0.1, metal, g, 0, 0.25, 0).rotation.z = Math.PI / 2;
            box(0.03, 0.3, 0.03, metal, g, 0, 0.14, 0);
          }
        } else {
          box(0.55, 0.05, 0.4, metal, g, 0, 0.04, 0);
          box(0.035, 0.6, 0.035, metal, g, 0, 0.35, 0);
          if (i === 0)
            cyl(0.13, 0.4, metal, g, 0, 0.7, 0).rotation.z = Math.PI / 2;
          else if (i === 1)
            cyl(0.25, 0.035, glass, g, 0, 0.7, 0).rotation.z = Math.PI / 2;
          else box(0.04, 0.7, 0.65, white, g, 0, 0.55, 0);
        }
      } else if (spec.kind === "waves") {
        for (let j = 0; j < 8; j++) {
          const w = box(
            0.07,
            0.08,
            0.18,
            [blue, green, amber][i],
            g,
            (j - 3.5) * 0.13,
            0.4,
            0,
          );
          animated.push((t) => {
            w.position.y =
              0.4 +
              (live.current.state.completed >= 2
                ? 0.18 *
                  Math.sin(
                    t * 3 -
                      j * 0.5 +
                      (i === 1
                        ? (live.current.state.value * Math.PI) / 180
                        : 0),
                  )
                : 0);
          });
        }
      } else if (["climate", "volcano", "decay"].includes(spec.kind)) {
        if (spec.kind === "volcano")
          mesh(
            new THREE.ConeGeometry(0.45, 0.8, 32),
            mat("#876e58"),
            g,
            0,
            0.4,
            0,
          );
        else ball(0.4, i === 0 ? blue : i === 1 ? glass : amber, g, 0, 0.45, 0);
      } else if (["circuit", "magnet", "induction"].includes(spec.kind)) {
        const battery = () => {
          box(0.6, 0.4, 0.3, metal, g, 0, 0.23, 0);
          box(0.18, 0.06, 0.18, red, g, -0.15, 0.46, 0);
          box(0.18, 0.06, 0.18, blue, g, 0.15, 0.46, 0);
        };
        const coil = () => {
          for (let j = 0; j < 10; j++)
            mesh(
              new THREE.TorusGeometry(0.17, 0.017, 8, 24),
              amber,
              g,
              (j - 4.5) * 0.045,
              0.3,
              0,
            ).rotation.y = Math.PI / 2;
        };
        if (spec.kind === "induction") {
          if (i === 0) coil();
          else if (i === 1) {
            box(0.5, 0.13, 0.13, red, g, -0.25, 0.3, 0);
            box(0.5, 0.13, 0.13, blue, g, 0.25, 0.3, 0);
          } else {
            box(0.55, 0.45, 0.12, white, g, 0, 0.3, 0);
            text("EMF", 0.4, 0.2, g, 0, 0.35, 0.07);
          }
        } else if (spec.kind === "magnet") {
          if (i === 0)
            cyl(0.07, 0.8, metal, g, 0, 0.3, 0).rotation.z = Math.PI / 2;
          else if (i === 1) coil();
          else battery();
        } else if (i === 0) battery();
        else if (i === 1) {
          if (spec.tools[i] === "Resistor") {
            box(0.6, 0.13, 0.18, white, g, 0, 0.25, 0);
            for (let j = 0; j < 4; j++)
              box(
                0.04,
                0.14,
                0.19,
                [amber, red, metal, blue][j],
                g,
                (j - 1.5) * 0.1,
                0.25,
                0,
              );
          } else {
            const bulb = ball(0.2, mat("#e2b54e"), g, 0, 0.5, 0);
            cyl(0.1, 0.25, metal, g, 0, 0.2, 0);
            animated.push(() => {
              (bulb.material as THREE.MeshStandardMaterial).emissive.set(
                live.current.state.completed >= 3 ? "#d8a12f" : "#000000",
              );
            });
          }
        } else {
          box(0.6, 0.08, 0.4, white, g, 0, 0.05, 0);
          const arm = box(0.45, 0.04, 0.06, metal, g, 0, 0.2, 0);
          animated.push(() => {
            arm.rotation.z = live.current.state.completed >= 3 ? 0 : 0.3;
          });
        }
      } else {
        // Wet bench: vessels, instruments and dispensers have distinct manipulable shapes.
        if (i === 0) {
          cyl(0.28, 0.65, glass, g, 0, 0.34, 0);
          const solution = mat("#80b5c9");
          cyl(0.25, 0.3, solution, g, 0, 0.19, 0);
          if (spec.kind === "acid")
            animated.push(() => {
              solution.color.set(
                live.current.state.completed < 2
                  ? "#80b5c9"
                  : live.current.state.value < 5
                    ? "#d77670"
                    : live.current.state.value <= 8
                      ? "#69aa80"
                      : "#796bb7",
              );
            });
          if (spec.kind === "electrolysis") {
            for (const x of [-0.12, 0.12])
              cyl(0.018, 0.55, metal, g, x, 0.45, 0);
            for (let j = 0; j < 6; j++) {
              const gas = ball(
                0.025,
                j < 4 ? blue : red,
                g,
                j < 4 ? -0.12 : 0.12,
                0.2,
                0,
              );
              animated.push((t) => {
                gas.visible = live.current.state.completed >= 3;
                gas.position.y = 0.2 + ((t * 0.3 + j * 0.1) % 0.45);
              });
            }
          }
        } else if (i === 1) {
          cyl(0.045, 1, metal, g, 0, 0.6, 0);
          ball(0.11, blue, g, 0, 1.15, 0);
        } else {
          box(0.6, 0.15, 0.5, metal, g, 0, 0.08, 0);
          cyl(0.16, 0.35, glass, g, 0, 0.35, 0);
        }
        if (spec.kind === "chromatography") {
          const paper = box(0.18, 0.65, 0.01, white, g, 0, 0.65, 0.1);
          ball(0.025, red, paper, 0, -0.15, 0.01);
          ball(0.025, blue, paper, 0, 0.1, 0.01);
        }
      }
      text(spec.tools[i], 1.15, 0.22, g, 0, 0.07, 0.44);
    }
    const connectors: THREE.Mesh[] = [];
    if (digital || ["circuit", "magnet", "induction"].includes(spec.kind))
      for (let i = 0; i < 2; i++) {
        const c = cyl(0.018, 1, blue, scene);
        connectors.push(c);
      }
    const packets: THREE.Mesh[] = [];
    if (spec.kind === "cyber")
      for (let i = 0; i < 6; i++)
        packets.push(ball(0.055, mat("#d6605c"), scene));
    const outline = new THREE.BoxHelper(groups[0], 0x2b80bb);
    scene.add(outline);
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2(),
      plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.52),
      point = new THREE.Vector3();
    let drag: number | null = null,
      offset = new THREE.Vector3();
    const aim = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      aim(e);
      const hit = ray.intersectObjects(groups, true)[0];
      if (!hit) return;
      let item: THREE.Object3D | null = hit.object;
      while (item && item.userData.tool === undefined) item = item.parent;
      if (!item) return;
      drag = item.userData.tool as number;
      live.current.onPick(drag);
      orbit.enabled = false;
      renderer.domElement.setPointerCapture(e.pointerId);
      if (ray.ray.intersectPlane(plane, point))
        offset.copy(groups[drag].position).sub(point);
    };
    const move = (e: PointerEvent) => {
      if (drag === null) return;
      aim(e);
      if (!ray.ray.intersectPlane(plane, point)) return;
      const p = point.clone().add(offset);
      groups[drag].position.set(
        THREE.MathUtils.clamp(p.x, -2.8, 2.8),
        0.68,
        THREE.MathUtils.clamp(p.z, -1.2, 1.2),
      );
    };
    const up = (e: PointerEvent) => {
      if (drag === null) return;
      const id = drag,
        p = groups[id].position;
      drag = null;
      orbit.enabled = true;
      live.current.onPlace(id, {
        x: p.x,
        z: p.z,
        rotation: groups[id].rotation.y,
      });
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
    };
    const cancel = () => {
      drag = null;
      orbit.enabled = true;
    };
    const activate = () => live.current.onActivate();
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    renderer.domElement.addEventListener("dblclick", activate);
    let lost = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    const resize = new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      if (lost) return;
      const t = (now - start) / 1000,
        s = live.current.state;
      groups.forEach((g, i) => {
        if (drag === i) return;
        const p = s.placements[i];
        g.position.set(
          p?.x ?? bases[i].x,
          live.current.held === i ? 0.85 : 0.51,
          p?.z ?? bases[i].z,
        );
        g.rotation.y = p?.rotation ?? 0;
      });
      animated.forEach((fn) => fn(t));
      outline.setFromObject(groups[live.current.selected] ?? groups[0]);
      connectors.forEach((c, i) => {
        const a = groups[i].position.clone().add(new THREE.Vector3(0, 0.2, 0)),
          b = groups[i + 1].position.clone().add(new THREE.Vector3(0, 0.2, 0)),
          v = b.clone().sub(a);
        c.position.copy(a.add(b).multiplyScalar(0.5));
        c.scale.y = v.length();
        c.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          v.normalize(),
        );
        c.visible = s.completed >= 2;
      });
      packets.forEach((p, i) => {
        const f = (t * 0.3 + i / 6) % 1,
          a = groups[1].position,
          b = groups[0].position;
        p.position.lerpVectors(a, b, f);
        p.position.y = 0.9 + Math.sin(f * Math.PI) * 0.3;
        p.visible = s.completed >= 3;
        (p.material as THREE.MeshStandardMaterial).color.set(
          s.completed >= 4 ? "#2a9d79" : "#d6605c",
        );
        if (s.completed >= 4 && f > 0.55) p.visible = false;
      });
      orbit.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      orbit.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("dblclick", activate);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      grid.geometry.dispose();
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [spec.key, retry]);
  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg bg-[#e8eef4]">
      <div
        ref={host}
        className={`h-full min-h-[420px] ${failed ? "hidden" : ""}`}
      />
      {failed && (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 p-6 text-center">
          <p role="status" className="max-w-sm text-sm text-slate-600">
            3D rendering is unavailable on this device. Equipment and procedure
            controls below remain available.
          </p>
          <div
            aria-label="Accessible equipment positions"
            className="flex flex-wrap justify-center gap-2"
          >
            {spec.tools.map((name, i) => (
              <span
                key={name}
                className="rounded-lg border bg-white p-3 text-xs"
              >
                {name}: {state.placements[i] ? "on bench" : "on shelf"}
              </span>
            ))}
          </div>
          <button
            className="rounded-lg border bg-white p-3 text-sm"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry 3D
          </button>
        </div>
      )}
    </div>
  );
}
