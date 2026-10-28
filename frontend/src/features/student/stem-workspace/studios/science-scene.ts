import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export function scienceScene(
  host: HTMLDivElement,
  options: {
    label: string;
    target: [number, number, number];
    camera: [number, number, number];
    background?: string;
  },
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.style.cssText =
    "width:100%;height:100%;display:block;touch-action:none";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", options.label);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background ?? "#e9eef2");
  const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 50);
  camera.position.set(...options.camera);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...options.target);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 12;
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    env = pmrem.fromScene(room, 0.06);
  scene.environment = env.texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x67798c, 1.6));
  const key = new THREE.DirectionalLight(0xfff4e5, 2.5);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9e9ff, 1.5);
  fill.position.set(4, 3, -2);
  scene.add(fill);
  const materials: THREE.Material[] = [],
    geometries: THREE.BufferGeometry[] = [],
    textures: THREE.Texture[] = [],
    labels: {
      button: HTMLButtonElement;
      anchor: THREE.Object3D;
      offset: THREE.Vector3;
    }[] = [];
  const mat = (colour: string, metalness = 0, roughness = 0.4) => {
    const m = new THREE.MeshStandardMaterial({
      color: colour,
      metalness,
      roughness,
    });
    materials.push(m);
    return m;
  };
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#d5e4e9",
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(glass);
  const mesh = (
    g: THREE.BufferGeometry,
    m: THREE.Material,
    p: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    id?: string,
  ) => {
    geometries.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    if (id) o.userData.id = id;
    p.add(o);
    return o;
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
    id?: string,
  ) =>
    mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(0.025, w / 4, h / 4, d / 4)),
      m,
      p,
      x,
      y,
      z,
      id,
    );
  const cyl = (
    r: number,
    h: number,
    m: THREE.Material,
    p: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    id?: string,
  ) => mesh(new THREE.CylinderGeometry(r, r, h, 32), m, p, x, y, z, id);
  const ball = (
    r: number,
    m: THREE.Material,
    p: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    id?: string,
  ) => mesh(new THREE.SphereGeometry(r, 32, 24), m, p, x, y, z, id);
  const line = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    r: number,
    m: THREE.Material,
    p: THREE.Object3D,
  ) => {
    const v = b.clone().sub(a),
      o = cyl(r, v.length(), m, p);
    o.position.copy(a.clone().add(b).multiplyScalar(0.5));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    return o;
  };
  const text = (
    words: string,
    size: number,
    p: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#27394b";
    ctx.font = "600 45px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(words, 128, 80);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    const m = new THREE.SpriteMaterial({ map: t, depthTest: false });
    materials.push(m);
    const o = new THREE.Sprite(m);
    o.position.set(x, y, z);
    o.scale.set(size, size * 0.5, 1);
    p.add(o);
    return o;
  };
  const label = (
    words: string,
    anchor: THREE.Object3D,
    offset: THREE.Vector3,
    click: () => void,
  ) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = words;
    b.className =
      "absolute z-10 rounded-lg border border-white/90 bg-white/95 px-2 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm";
    b.onclick = click;
    host.appendChild(b);
    labels.push({ button: b, anchor, offset });
    return b;
  };
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const hit = (clientX: number, clientY: number) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((clientX - r.left) / r.width) * 2 - 1,
      (-(clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    return ray
      .intersectObjects(scene.children, true)
      .find((h) => h.object.userData.id)?.object.userData.id as
      string | undefined;
  };
  const resize = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.fov =
      camera.aspect < 0.75
        ? THREE.MathUtils.radToDeg(
            2 *
              Math.atan(
                (Math.tan(THREE.MathUtils.degToRad(38) / 2) * 0.75) /
                  camera.aspect,
              ),
          )
        : 38;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  const v = new THREE.Vector3();
  const render = () => {
    controls.update();
    for (const l of labels) {
      l.anchor.getWorldPosition(v);
      v.add(l.offset).project(camera);
      l.button.hidden = Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z > 1;
      l.button.style.left = `${(v.x + 1) * 0.5 * host.clientWidth}px`;
      l.button.style.top = `${(1 - v.y) * 0.5 * host.clientHeight}px`;
      l.button.style.transform = "translate(-50%,-50%)";
    }
    renderer.render(scene, camera);
  };
  const dispose = () => {
    resize.disconnect();
    controls.dispose();
    labels.forEach((l) => l.button.remove());
    const allGeo = new Set(geometries),
      allMat = new Set(materials);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        allGeo.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          allMat.add(m),
        );
      }
    });
    allGeo.forEach((g) => g.dispose());
    allMat.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    env.dispose();
    room.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
  return {
    scene,
    renderer,
    camera,
    controls,
    materials,
    geometries,
    textures,
    mat,
    glass,
    mesh,
    box,
    cyl,
    ball,
    line,
    text,
    label,
    hit,
    render,
    dispose,
  };
}
