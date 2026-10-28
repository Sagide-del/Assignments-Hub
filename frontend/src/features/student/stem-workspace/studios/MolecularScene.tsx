import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  moleculeSpec,
  type MolecularState,
  type Element,
} from "../../../../../../backend/src/labs/molecular-engine";
import { scienceScene } from "./science-scene";
export default function MolecularScene({
  state,
  onSlot,
  onDrop,
  guides,
}: {
  state: MolecularState;
  onSlot: (id: number) => void;
  onDrop: (id: number, element: Element) => void;
  guides: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef({ state, onSlot, onDrop, guides });
  live.current = { state, onSlot, onDrop, guides };
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!host.current) return;
    let s: ReturnType<typeof scienceScene>;
    try {
      s = scienceScene(host.current, {
        label:
          "Interactive molecular model. Choose an element and click an empty atomic site; choose bond mode to connect atoms.",
        camera: [3, 2, 5.2],
        target: [0, 0, 0],
        background: "#eef1f6",
      });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);
    const group = new THREE.Group();
    s.scene.add(group);
    const symbols: { obj: THREE.Object3D; slot: number }[] = [];
    const atomMeshes: THREE.Mesh[] = [];
    const ghost = s.mat("#8ca1b5");
    ghost.transparent = true;
    ghost.opacity = 0.2;
    ghost.wireframe = true;
    const palette = {
        C: s.mat("#303b48", 0.1, 0.24),
        H: s.mat("#edf2f7", 0.05, 0.3),
        O: s.mat("#c34e59", 0.1, 0.24),
      },
      bondMat = s.mat("#8b9cad", 0.45, 0.28),
      hint = s.mat("#afc1ce");
    hint.transparent = true;
    hint.opacity = 0.18;
    const spec = moleculeSpec(state.molecule);
    for (let i = 0; i < spec.slots.length; i++) {
      const p = spec.slots[i].position,
        mesh = s.ball(0.25, ghost, group, ...p, String(i));
      atomMeshes.push(mesh);
      const symbol = s.text(
        `${spec.slots[i].element}${i + 1}`,
        0.34,
        group,
        p[0],
        p[1] + 0.34,
        p[2],
      );
      symbols.push({ obj: symbol, slot: i });
    }
    const bonds = new THREE.Group(),
      hints = new THREE.Group();
    group.add(bonds, hints);
    for (const b of spec.bonds)
      s.line(
        new THREE.Vector3(...spec.slots[b.a].position),
        new THREE.Vector3(...spec.slots[b.b].position),
        0.014,
        hint,
        hints,
      );
    let signature = "";
    const rebuild = () => {
      bonds.children.forEach((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      bonds.clear();
      for (const b of live.current.state.bonds) {
        const a = new THREE.Vector3(...spec.slots[b.a].position),
          c = new THREE.Vector3(...spec.slots[b.b].position),
          direction = c.clone().sub(a).normalize(),
          perp = new THREE.Vector3().crossVectors(
            direction,
            new THREE.Vector3(0, 0, 1),
          );
        if (perp.length() < 0.01)
          perp.crossVectors(direction, new THREE.Vector3(0, 1, 0));
        perp.normalize();
        for (let i = 0; i < b.order; i++) {
          const delta = perp
            .clone()
            .multiplyScalar((i - (b.order - 1) / 2) * 0.14);
          s.line(
            a.clone().add(delta),
            c.clone().add(delta),
            0.045,
            bondMat,
            bonds,
          );
        }
      }
    };
    let down = [0, 0];
    const pd = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pu = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const id = s.hit(e.clientX, e.clientY);
      if (id !== undefined) live.current.onSlot(Number(id));
    };
    const drag = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const element = e.dataTransfer?.getData(
        "application/x-assignmenthub-element",
      );
      const id = s.hit(e.clientX, e.clientY);
      if (id !== undefined && ["C", "H", "O"].includes(element ?? ""))
        live.current.onDrop(Number(id), element as Element);
    };
    s.renderer.domElement.addEventListener("pointerdown", pd);
    s.renderer.domElement.addEventListener("pointerup", pu);
    s.renderer.domElement.addEventListener("dragover", drag);
    s.renderer.domElement.addEventListener("drop", drop);
    let lost = false;
    const contextLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setFailed(true);
    };
    s.renderer.domElement.addEventListener("webglcontextlost", contextLost);
    let frame = 0;
    const tick = () => {
      if (lost) return;
      const current = live.current.state;
      atomMeshes.forEach((m, i) => {
        const e = current.atoms[i];
        m.material = e ? palette[e] : ghost;
        m.scale.setScalar(e === "H" ? 0.65 : 1);
      });
      symbols.forEach(({ obj, slot }) => {
        obj.visible = live.current.guides || !!current.atoms[slot];
      });
      hints.visible = live.current.guides;
      const next = JSON.stringify(current.bonds);
      if (next !== signature) {
        signature = next;
        rebuild();
      }
      s.render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      s.renderer.domElement.removeEventListener("pointerdown", pd);
      s.renderer.domElement.removeEventListener("pointerup", pu);
      s.renderer.domElement.removeEventListener("dragover", drag);
      s.renderer.domElement.removeEventListener("drop", drop);
      s.renderer.domElement.removeEventListener(
        "webglcontextlost",
        contextLost,
      );
      s.dispose();
    };
  }, [state.molecule, retry]);
  return (
    <div className="relative h-[500px] overflow-hidden rounded-xl bg-slate-100">
      <div ref={host} className={`relative h-full ${failed ? "hidden" : ""}`} />
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-slate-600">
            3D rendering is unavailable. The atomic-site and bond controls below
            remain available.
          </p>
          <button
            onClick={() => setRetry((n) => n + 1)}
            className="min-h-10 rounded-lg border bg-white px-4 text-xs"
          >
            Retry 3D model
          </button>
        </div>
      )}
    </div>
  );
}
