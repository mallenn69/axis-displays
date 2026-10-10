import { useContext, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SceneBrand } from './scene-brand';
import { site } from '@/config/site';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Proportions traced from the supplied front/rear photos. Small hardware shares
// merged geometry, keeping the added detail to one draw call per material.
type Finish = 'cast' | 'housing' | 'rubber' | 'steel' | 'blue';
type Batches = Record<Finish, THREE.BufferGeometry[]>;
const finishes: Record<Finish, { color: string; metalness: number; roughness: number }> = {
  cast: { color: '#303236', metalness: 0.28, roughness: 0.8 },
  housing: { color: '#222428', metalness: 0.08, roughness: 0.86 },
  rubber: { color: '#080a0d', metalness: 0.05, roughness: 0.8 },
  steel: { color: '#a4a7aa', metalness: 0.88, roughness: 0.34 },
  blue: { color: '#2b7fff', metalness: 0.15, roughness: 0.42 },
};
function satinTexture() {
  // A small, deterministic powder-coat texture, generated once per assembly.
  // Mipmaps soften the grain at a distance, avoiding shimmer during rotation.
  const size = 128, pixels = new Uint8Array(size * size * 4);
  let seed = 37;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = 224 + (seed >>> 27);
    pixels.set([grain, grain, grain, 255], i * 4);
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function hardware(rear: boolean) {
  const parts: Batches = { cast: [], housing: [], rubber: [], steel: [], blue: [] };
  const add = (finish: Finish, geometry: THREE.BufferGeometry, x: number, y: number, z: number, rotation = 0) => {
    geometry.rotateZ(rotation); geometry.translate(x, y, z);
    // All primitive batches use position/normal/uv attributes and indexed faces.
    parts[finish].push(geometry);
  };
  const box = (finish: Finish, x: number, y: number, z: number, w: number, h: number, d: number, rotation = 0) => add(finish, new THREE.BoxGeometry(w, h, d), x, y, z, rotation);
  const disk = (finish: Finish, x: number, y: number, z: number, radius: number, depth: number, segments = 16) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, segments);
    geometry.rotateX(Math.PI / 2); add(finish, geometry, x, y, z);
  };
  const ring = (finish: Finish, x: number, y: number, z: number, radius: number, tube: number, arc = Math.PI * 2) => add(finish, new THREE.TorusGeometry(radius, tube, 4, 24, arc), x, y, z);
  const rounded = (finish: Finish, x: number, y: number, z: number, w: number, h: number, d: number, r: number) => {
    const shape = new THREE.Shape();
    const a = -w / 2, b = -h / 2;
    shape.moveTo(a + r, b); shape.lineTo(a + w - r, b); shape.quadraticCurveTo(a + w, b, a + w, b + r);
    shape.lineTo(a + w, b + h - r); shape.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    shape.lineTo(a + r, b + h); shape.quadraticCurveTo(a, b + h, a, b + h - r);
    shape.lineTo(a, b + r); shape.quadraticCurveTo(a, b, a + r, b);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 4 });
    add(finish, geo, x, y, z - d / 2);
  };
  if (!rear) {
    // Thin black perimeter; the front LED modules cover the full square face.
    box('cast', 0, 0.97, -0.025, 2, 0.06, 0.24);
    box('cast', 0, -0.97, -0.025, 2, 0.06, 0.24);
    box('cast', -0.97, 0, -0.025, 0.06, 1.88, 0.24);
    box('cast', 0.97, 0, -0.025, 0.06, 1.88, 0.24);
    box('cast', 0, 0, -0.07, 0.06, 1.88, 0.06);
    box('cast', 0, 0, -0.07, 1.88, 0.06, 0.06);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      rounded('cast', sx * 0.91, sy * 0.91, -0.04, 0.17, 0.17, 0.2, 0.04);
      // Silver protective corner strips and fasteners, visible from the rear.
      box('steel', sx * 0.975, sy * 0.91, -0.15, 0.013, 0.18, 0.025, -sx * sy * 0.3);
      disk('steel', sx * 0.9, sy * 0.9, -0.155, 0.022, 0.012);
    }
    // Recessed side grab handles and horizontal center supports.
    for (const sx of [-1, 1]) {
      box('cast', sx * 0.88, 0, -0.19, 0.085, 0.55, 0.16);
      box('cast', sx * 0.8, 0.27, -0.14, 0.19, 0.06, 0.09);
      box('cast', sx * 0.8, -0.27, -0.14, 0.19, 0.06, 0.09);
      for (const y of [-0.51, 0.51]) {
        rounded('housing', sx * 0.97, y, -0.13, 0.1, 0.17, 0.1, 0.02);
        box('steel', sx * 0.95, y, -0.192, 0.12, 0.025, 0.018);
        disk('steel', sx * 0.94, y, -0.21, 0.014, 0.015);
      }
    }
    box('cast', 0, 0, -0.13, 1.6, 0.045, 0.1);
    // One top carry handle, rather than the old pair of lifting loops.
    box('rubber', 0, 0.91, -0.22, 0.43, 0.055, 0.07);
    for (const sx of [-1, 1]) box('cast', sx * 0.22, 0.92, -0.15, 0.05, 0.09, 0.15);
  } else {
    // Four service modules with circular locking handles and diagonal cast ribs.
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx * 0.51, y = sy * 0.48;
      rounded('housing', x, y, -0.02, 0.88, 0.89, 0.055, 0.035);
      // Baked dark seats around the raised locks, without shadow-map passes.
      disk('rubber', x, y, -0.051, 0.165, 0.005);
      for (const side of [-1, 1]) box('cast', x + side * 0.26, y, -0.065, 0.028, 0.76, 0.024, side * sy * 0.27);
      ring('cast', x, y, -0.067, 0.145, 0.017);
      disk('rubber', x, y, -0.073, 0.121, 0.02);
      rounded('cast', x, y, -0.101, 0.045, 0.2, 0.038, 0.012);
      for (const side of [-1, 1]) {
        disk('rubber', x + side * 0.065, y, -0.092, 0.012, 0.01, 8);
        for (const offset of [-0.3, 0.3]) {
          rounded('cast', x + side * 0.16, y + offset, -0.07, 0.05, 0.1, 0.04, 0.01);
          disk('rubber', x + side * 0.16, y + offset, -0.097, 0.011, 0.01, 8);
        }
      }
      // Top and bottom tool-free latch blocks with silver plungers.
      box('cast', x, y + sy * 0.34, -0.08, 0.34, 0.04, 0.06);
      box('steel', x, y + sy * 0.36, -0.106, 0.025, 0.12, 0.02);
      rounded('housing', x, y + sy * 0.3, -0.12, 0.08, 0.07, 0.045, 0.01);
    }
    // Sculpted central power/data housing and inset vertical cooling ribs.
    rounded('rubber', 0, 0, -0.056, 0.54, 1.74, 0.008, 0.24);
    rounded('cast', 0, 0, -0.095, 0.48, 1.68, 0.22, 0.22);
    rounded('housing', 0, 0, -0.23, 0.37, 1.53, 0.07, 0.17);
    rounded('rubber', 0, -0.025, -0.28, 0.255, 0.95, 0.025, 0.12);
    for (let i = 0; i < 13; i++) {
      const x = (i - 6) * 0.016;
      const h = 0.78 - Math.abs(i - 6) * 0.018;
      box('cast', x, -0.025, -0.299, 0.007, h, 0.01);
    }
    rounded('cast', 0, 0.58, -0.275, 0.16, 0.23, 0.03, 0.065);
    for (const sx of [-1, 1]) {
      for (const y of [-0.33, 0.32]) {
        box('steel', sx * 0.24, y, -0.19, 0.023, 0.075, 0.035);
        box('rubber', sx * 0.24, y, -0.214, 0.028, 0.05, 0.013);
      }
      // Blue power/data socket collars are the only hardware accent.
      box('cast', sx * 0.24, 0.64, -0.14, 0.11, 0.13, 0.1, sx * 0.18);
      box('blue', sx * 0.292, 0.64, -0.17, 0.025, 0.11, 0.09, sx * 0.18);
      box('steel', sx * 0.23, -0.61, -0.15, 0.045, 0.09, 0.045, -sx * 0.18);
    }
    disk('steel', 0, -0.7, -0.283, 0.026, 0.012);
    disk('rubber', 0, -0.7, -0.293, 0.016, 0.01);
    // Circular Axis emblem replaces the old brand badge in the reference.
    disk('cast', 0, 0.03, -0.318, 0.075, 0.016, 24);
  }
  return (Object.keys(parts) as Finish[]).flatMap(finish => {
    const sources = parts[finish]; if (!sources.length) return [];
    // Extruded rounded parts are unindexed; normalize before merging.
    const normalized = sources.map(geo => geo.index ? geo.toNonIndexed() : geo);
    const geometry = mergeGeometries(normalized);
    sources.forEach(geo => geo.dispose()); normalized.forEach((geo, i) => { if (geo !== sources[i]) geo.dispose(); });
    if (!geometry) throw new Error('Unable to assemble panel hardware');
    return [{ finish, geometry }];
  });
}
function Hardware({ rear }: { rear: boolean }) {
  const batches = useMemo(() => hardware(rear), [rear]);
  const grain = useMemo(satinTexture, []);
  useEffect(() => () => grain.dispose(), [grain]);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  return <>{batches.map(({ finish, geometry }) => <mesh key={finish} geometry={geometry}>
    <meshStandardMaterial {...finishes[finish]}
      roughnessMap={finish === 'cast' || finish === 'housing' ? grain : null}
      bumpMap={finish === 'cast' || finish === 'housing' ? grain : null}
      bumpScale={0.002} envMapIntensity={finish === 'steel' ? 0.8 : 0.35} />
  </mesh>)}</>;
}
export function PanelFrame() { return <Hardware rear={false} />; }
export function PanelRear() {
  const brand = useContext(SceneBrand);
  const badge = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#2b7fff'; ctx.beginPath();
    ctx.moveTo(128, 28); ctx.lineTo(141, 66); ctx.lineTo(179, 79); ctx.lineTo(141, 92);
    ctx.lineTo(128, 130); ctx.lineTo(115, 92); ctx.lineTo(77, 79); ctx.lineTo(115, 66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = brand ? 'bold 29px sans-serif' : 'bold 46px sans-serif'; ctx.fillText(brand ?? site.name.split(' ')[0]!.toUpperCase(), 128, 183);
    ctx.fillStyle = '#bcc0c8'; ctx.font = '16px sans-serif'; ctx.fillText(site.labels.led, 128, 211);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, [brand]);
  useEffect(() => () => badge.dispose(), [badge]);
  return <><Hardware rear />
    <mesh position={[0, 0.03, -0.328]} rotation-y={Math.PI}>
      <circleGeometry args={[0.066, 24]} /><meshBasicMaterial map={badge} toneMapped={false} />
    </mesh>
  </>;
}
