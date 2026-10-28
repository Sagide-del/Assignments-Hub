import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { StarchState } from "../../../../../../backend/src/labs/starch-engine";
import { scienceScene } from "./science-scene";
export type StarchTarget =
  "burner" | "bath" | "tube" | "ethanol" | "rinse" | "tile" | "iodine" | "leaf";
export default function StarchScene({
  state,
  onTarget,
}: {
  state: StarchState;
  onTarget: (t: StarchTarget) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef({ state, onTarget });
  live.current = { state, onTarget };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    let s: ReturnType<typeof scienceScene>;
    try {
      s = scienceScene(host.current, {
        label:
          "Leaf starch practical: Bunsen burner, water bath, ethanol test tube, rinse beaker and iodine tile.",
        target: [0, 0.85, 0],
        camera: [4.5, 4.2, 6.5],
      });
    } catch {
      setFailed(true);
      return;
    }
    const { scene, mat, box, cyl, ball, line, glass } = s;
    const steel = mat("#acb9c3", 0.8, 0.22),
      dark = mat("#293d4a"),
      water = mat("#b7dce8"),
      amber = mat("#8f4b15"),
      white = mat("#f6f5ef"),
      green = mat("#426b27");
    water.transparent = true;
    water.opacity = 0.45;
    box(6, 0.2, 3.4, mat("#cbd4da"), scene, 0, 0, 0);
    box(6, 0.08, 3.4, mat("#f0f1ed"), scene, 0, 0.13, 0);
    const burner = new THREE.Group();
    burner.position.set(-1.55, 0.2, 0);
    scene.add(burner);
    cyl(0.28, 0.08, dark, burner, 0, 0.04, 0, "burner");
    cyl(0.07, 0.58, steel, burner, 0, 0.35, 0, "burner");
    const flame = new THREE.Group();
    burner.add(flame);
    const blue = mat("#267eff");
    blue.transparent = true;
    blue.opacity = 0.8;
    const inner = mat("#84d9ff");
    const outerCone = s.mesh(
      new THREE.ConeGeometry(0.09, 0.34, 24),
      blue,
      flame,
      0,
      0.78,
      0,
    );
    s.mesh(new THREE.ConeGeometry(0.04, 0.19, 24), inner, flame, 0, 0.72, 0);
    // Tripod supports the gauze and borosilicate bath above the flame.
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      line(
        new THREE.Vector3(Math.cos(a) * 0.4, 0.03, Math.sin(a) * 0.4),
        new THREE.Vector3(Math.cos(a) * 0.29, 0.99, Math.sin(a) * 0.29),
        0.025,
        steel,
        burner,
      );
    }
    cyl(0.47, 0.025, steel, burner, 0, 1.01, 0);
    const bath = new THREE.Group();
    bath.position.set(-1.55, 1.23, 0);
    scene.add(bath);
    cyl(0.4, 0.58, glass, bath, 0, 0.28, 0, "bath");
    cyl(0.375, 0.37, water, bath, 0, 0.19, 0, "bath");
    for (let i = 1; i < 5; i++) {
      const tick = box(
        0.12,
        0.009,
        0.01,
        dark,
        bath,
        0.26,
        0.1 + i * 0.08,
        0.29,
      );
      tick.rotation.y = 0.3;
    }
    const tube = new THREE.Group();
    tube.position.set(0.1, 0.8, -0.5);
    scene.add(tube);
    cyl(0.105, 0.65, glass, tube, 0, 0.3, 0, "tube");
    ball(0.105, glass, tube, 0, -0.025, 0, "tube");
    const alcoholMat = mat("#e6e5cf");
    alcoholMat.transparent = true;
    alcoholMat.opacity = 0.65;
    const alcohol = cyl(0.09, 0.4, alcoholMat, tube, 0, 0.17, 0, "tube");
    box(0.5, 0.12, 0.42, dark, scene, 0.1, 0.25, -0.5);
    for (const x of [-0.18, 0.38])
      cyl(0.018, 0.48, steel, scene, x, 0.53, -0.5);
    const ethanol = new THREE.Group();
    ethanol.position.set(0.9, 0.2, -0.85);
    scene.add(ethanol);
    cyl(0.19, 0.48, amber, ethanol, 0, 0.24, 0, "ethanol");
    cyl(0.11, 0.12, dark, ethanol, 0, 0.54, 0, "ethanol");
    s.text("ETHANOL", 0.5, ethanol, 0, 0.3, 0.2);
    const rinse = new THREE.Group();
    rinse.position.set(1.65, 0.2, 0.1);
    scene.add(rinse);
    cyl(0.29, 0.5, glass, rinse, 0, 0.25, 0, "rinse");
    cyl(0.27, 0.3, water, rinse, 0, 0.16, 0, "rinse");
    box(1.1, 0.055, 0.75, white, scene, 0.25, 0.23, 1.02, "tile");
    const iodine = new THREE.Group();
    iodine.position.set(2.2, 0.2, 1);
    scene.add(iodine);
    cyl(0.14, 0.3, amber, iodine, 0, 0.15, 0, "iodine");
    cyl(0.08, 0.15, dark, iodine, 0, 0.38, 0, "iodine");
    // Curved leaf blade, midrib, secondary veins and translucent patch for variegation.
    const leaf = new THREE.Group();
    scene.add(leaf);
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.46);
    shape.bezierCurveTo(-0.34, -0.22, -0.35, 0.23, 0, 0.52);
    shape.bezierCurveTo(0.35, 0.23, 0.34, -0.22, 0, -0.46);
    const geometry = new THREE.ShapeGeometry(shape, 28);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++)
      positions.setZ(
        i,
        0.05 * Math.sin(positions.getY(i) * 4) +
          Math.abs(positions.getX(i)) * 0.15,
      );
    geometry.computeVertexNormals();
    const leafMat = green.clone();
    leafMat.side = THREE.DoubleSide;
    s.materials.push(leafMat);
    s.mesh(geometry, leafMat, leaf, 0, 0, 0, "leaf");
    const veinMat = mat("#c8c295");
    line(
      new THREE.Vector3(0, -0.53, 0.035),
      new THREE.Vector3(0, 0.47, 0.035),
      0.008,
      veinMat,
      leaf,
    );
    for (let i = 0; i < 5; i++) {
      const y = -0.25 + i * 0.13;
      for (const sign of [-1, 1])
        line(
          new THREE.Vector3(0, y, 0.035),
          new THREE.Vector3(sign * (0.22 - Math.abs(y) * 0.2), y + 0.15, 0.06),
          0.0035,
          veinMat,
          leaf,
        );
    }
    const patch = s.mesh(
      new THREE.CircleGeometry(0.12, 24),
      mat("#e3d7b1"),
      leaf,
      0.08,
      0.05,
      0.065,
    );
    patch.scale.set(1, 2, 1);
    const forceps = new THREE.Group();
    scene.add(forceps);
    for (const x of [-0.035, 0.035]) {
      const arm = box(0.025, 0.025, 0.6, steel, forceps, x, 0, 0);
      arm.rotation.y = x * 0.7;
    }
    forceps.position.set(-0.6, 0.24, 1.1);
    const steam: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const m = mat("#ffffff");
      m.transparent = true;
      m.opacity = 0.22;
      steam.push(ball(0.025, m, scene, -1.55, 1.8, 0));
    }
    const anchor = (x: number, y: number, z: number) => {
      const a = new THREE.Object3D();
      a.position.set(x, y, z);
      scene.add(a);
      return a;
    };
    const label = (
      name: string,
      t: StarchTarget,
      p: [number, number, number],
    ) =>
      s.label(name, anchor(...p), new THREE.Vector3(), () =>
        live.current.onTarget(t),
      );
    label("Bunsen burner", "burner", [-1.85, 0.45, 0.42]);
    label("Hot water bath", "bath", [-1.55, 2.02, 0]);
    s.label("Ethanol tube", tube, new THREE.Vector3(0, 0.8, 0), () =>
      live.current.onTarget("tube"),
    );
    label("Ethanol · flammable", "ethanol", [0.9, 1.12, -0.85]);
    label("Warm rinse water", "rinse", [1.65, 1.02, 0.1]);
    label("White tile", "tile", [0.25, 0.4, 1.55]);
    label("Iodine bottle", "iodine", [2.2, 0.9, 1]);
    s.label("Leaf sample", leaf, new THREE.Vector3(-0.2, 0.38, 0), () =>
      live.current.onTarget("leaf"),
    );
    let down = [0, 0];
    const pd = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pu = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) {
        const target = s.hit(e.clientX, e.clientY);
        if (target) live.current.onTarget(target as StarchTarget);
      }
    };
    s.renderer.domElement.addEventListener("pointerdown", pd);
    s.renderer.domElement.addEventListener("pointerup", pu);
    const lost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    s.renderer.domElement.addEventListener("webglcontextlost", lost);
    const dropper = new THREE.Group();
    scene.add(dropper);
    cyl(0.025, 0.4, glass, dropper, 0, 0, 0);
    cyl(0.055, 0.14, dark, dropper, 0, 0.25, 0);
    const iodineFluid = cyl(0.015, 0.25, amber, dropper, 0, -0.05, 0);
    const iodineDrop = ball(0.027, amber, scene);
    let previousLeaf = live.current.state.leaf,
      moveStart = -1000,
      previousIodine = false,
      iodineStart = -1000,
      previousEthanol = false,
      pourStart = -1000;
    let frame = 0;
    const tick = (time: number) => {
      const st = live.current.state;
      if (previousLeaf !== st.leaf) {
        moveStart = time;
        previousLeaf = st.leaf;
      }
      if (!previousIodine && st.iodineApplied) iodineStart = time;
      previousIodine = st.iodineApplied;
      if (!previousEthanol && st.ethanolFilled) pourStart = time;
      previousEthanol = st.ethanolFilled;
      const pouring = time - pourStart < 1700;
      ethanol.position.lerp(
        new THREE.Vector3(
          pouring ? 0.45 : 0.9,
          pouring ? 1.35 : 0.2,
          pouring ? -0.5 : -0.85,
        ),
        0.1,
      );
      ethanol.rotation.z = pouring ? -0.85 : 0;
      const dosing = time - iodineStart < 1800;
      dropper.position.lerp(
        new THREE.Vector3(
          dosing ? 0.25 : 2.2,
          dosing ? 0.9 : 0.9,
          dosing ? 1.02 : 1,
        ),
        0.12,
      );
      iodineFluid.visible = st.iodineLoaded || dosing;
      iodineDrop.visible = dosing;
      iodineDrop.position.set(0.25, 0.65 - ((time * 0.0018) % 1) * 0.3, 1.02);
      flame.visible = st.burner;
      outerCone.scale.y = 1 + 0.08 * Math.sin(time * 0.015);
      alcohol.visible = st.ethanolFilled;
      alcoholMat.color.set(st.extractSeconds > 0 ? "#72934b" : "#e6e5cf");
      tube.position.set(
        st.tubeInBath ? -1.5 : 0.1,
        st.tubeInBath ? 1.48 : 0.8,
        st.tubeInBath ? 0 : -0.5,
      );

      const destination =
        st.leaf === "plant"
          ? new THREE.Vector3(-0.8, 0.28, 0.7)
          : st.leaf === "water"
            ? new THREE.Vector3(-1.55, 1.47, 0)
            : st.leaf === "ethanol"
              ? tube.position.clone().add(new THREE.Vector3(0, 0.18, 0.02))
              : st.leaf === "rinsed"
                ? new THREE.Vector3(1.65, 0.49, 0.1)
                : new THREE.Vector3(0.25, 0.29, 1.02);
      const transferring = time - moveStart < 1700;
      if (transferring)
        destination.y +=
          Math.sin(Math.min(1, (time - moveStart) / 1700) * Math.PI) * 0.6;
      leaf.position.lerp(destination, 0.09);
      forceps.position.lerp(
        transferring
          ? leaf.position.clone().add(new THREE.Vector3(0, 0.12, 0.24))
          : new THREE.Vector3(-0.6, 0.24, 1.1),
        0.15,
      );
      forceps.rotation.x = transferring ? -0.4 : 0;
      const scale =
        st.leaf === "ethanol" ? 0.25 : st.leaf === "water" ? 0.55 : 0.7;
      leaf.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.09);
      leaf.rotation.x = st.leaf === "ethanol" ? 0 : -Math.PI / 2;
      const decolour = st.extractSeconds / 60;
      leafMat.color.set("#426b27").lerp(new THREE.Color("#d9d4ad"), decolour);
      if (st.iodineApplied)
        leafMat.color.set(st.sample === "dark" ? "#ae6a24" : "#25243f");
      patch.visible = st.sample === "variegated";
      patch.material instanceof THREE.MeshStandardMaterial &&
        patch.material.color.set(st.iodineApplied ? "#ae6a24" : "#e3d7b1");
      steam.forEach((o, i) => {
        o.visible = st.waterTemperature > 80;
        const phase = (time * 0.0005 + i / 9) % 1;
        o.position.set(
          -1.55 + Math.sin(i * 4 + time * 0.001) * 0.12,
          1.85 + phase * 0.45,
          Math.cos(i) * 0.1,
        );
        o.scale.setScalar(0.4 + phase * 1.3);
      });
      s.render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      s.renderer.domElement.removeEventListener("pointerdown", pd);
      s.renderer.domElement.removeEventListener("pointerup", pu);
      s.renderer.domElement.removeEventListener("webglcontextlost", lost);
      s.dispose();
    };
  }, []);
  return (
    <div className="relative min-h-[500px] h-[min(65vh,650px)] overflow-hidden rounded-xl bg-slate-100">
      <div ref={host} className="relative h-full w-full" />
      {failed && (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center bg-slate-50 p-6 text-sm"
        >
          3D rendering is unavailable. Use the labelled apparatus buttons below
          to continue.
        </div>
      )}
    </div>
  );
}
