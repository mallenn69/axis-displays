import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { VignetteEffect } from 'postprocessing';
import { sceneState, setScene, useSceneState } from './store';
import { ledShared, makeLedMaterial } from './led-material';
import { partLabels } from '@/config/site';
import { PanelFrame, PanelRear } from './panel-hardware';

/* ---------- helpers ---------- */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const damp = THREE.MathUtils.damp;
/** cubic-bezier(0.65, 0, 0.35, 1) — the single easing curve used across the story. */
function ease(x: number) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const x1 = 0.65, y1 = 0, x2 = 0.35, y2 = 1;
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
  return by(t);
}
const MOVE = 1.1, PART_DUR = 1.0, STAGGER = 0.08;
type Pose = { x: number; y: number; z: number; rx: number; ry: number; s: number };

function readAnchor(r: DOMRect | undefined, vp: { width: number; height: number }) {
  if (!r) return null;
  const W = window.innerWidth, H = window.innerHeight;
  return { x: ((r.left + r.width / 2) / W - 0.5) * vp.width, y: -((r.top + r.height / 2) / H - 0.5) * vp.height, w: (r.width / W) * vp.width, h: (r.height / H) * vp.height };
}

const MODULES = [0, 1, 2, 3].map(i => ({ x: (i % 2) - 0.5, y: 0.5 - Math.floor(i / 2) }));
const GW = 8, GH = 4, MAIN = 11; // main panel lives at col 3, row 1 of the wall
const SHAPES: [number, number, number, number][] = [[0, 7, 0, 3], [1, 6, 0, 2], [2, 5, 0, 3], [0, 7, 1, 2], [1, 6, 0, 3]];
const RANK = Array.from({ length: 32 }, (_, k) => (k * 13) % 32);
const START = Array.from({ length: 32 }, (_, k) => { const a = k * 2.399; return new THREE.Vector3(Math.cos(a) * 9, Math.sin(a) * 6, 3 + (k % 3) * 2); });
const CHIPS: [number, number, number][] = [[-0.25, 0.2, 0.18], [0.2, 0.25, 0.12], [-0.1, -0.2, 0.14], [0.28, -0.15, 0.1], [0.02, 0.02, 0.2], [-0.3, -0.32, 0.08]];

const labelPortal = { current: null } as unknown as React.RefObject<HTMLElement>;
/* ---------- interactive part wrapper (hover glow + label) ---------- */
type HoverCtl = { hover: string | null; setHover: (n: string | null) => void; stepRef: { current: number } };
function Part({ name, size, ctl, children, label, labelPos, side = 'up', order = 0, show }: { name: string; size: [number, number, number]; ctl: HoverCtl; children: ReactNode; label?: string | undefined; labelPos?: [number, number, number]; side?: 'up' | 'down'; order?: number; show?: boolean }) {
  const on = ctl.hover === name;
  return <group
    onPointerOver={(e: ThreeEvent<PointerEvent>) => { if (ctl.stepRef.current !== 4) return; e.stopPropagation(); ctl.setHover(name); }}
    onPointerOut={() => { if (ctl.hover === name) ctl.setHover(null); }}>
    {children}
    {on && <mesh><boxGeometry args={size.map(v => v + 0.06) as [number, number, number]} /><meshBasicMaterial color={[0.3, 0.7, 2.4]} transparent opacity={0.22} toneMapped={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>}
    {show && label && labelPos && <Html position={labelPos} zIndexRange={[40, 30]} portal={labelPortal} style={{ pointerEvents: 'none' }}>
      <div className={`part-label part-label-${name} ${side} ${show ? 'show' : ''} ${on ? 'hover' : ''}`} style={{ transitionDelay: show ? `${1500 + order * 80}ms` : '0ms' }}><span className="leader" /><span className="label-text">{label}</span></div>
    </Html>}
  </group>;
}

/* ---------- the rig: one persistent panel + wall copies ---------- */
function Rig({ mobile, local, vigRef }: { mobile: boolean; local: boolean; vigRef: React.RefObject<VignetteEffect | null> }) {
  const snap = useSceneState();
  const anchors = useRef<Record<string, DOMRect>>({});
  useEffect(() => {
    if (local) return;
    // Layout reads belong to scroll/resize, not every WebGL frame.
    let frame = 0;
    const measure = () => {
      frame = 0;
      document.querySelectorAll<HTMLElement>('[data-scene-anchor]').forEach(el => {
        anchors.current[el.dataset['sceneAnchor']!] = el.getBoundingClientRect();
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    document.querySelectorAll('[data-scene-anchor]').forEach(el => observer.observe(el));
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [snap.section, mobile, local]);
  const [hover, setHover] = useState<string | null>(null);
  const stepRef = useRef(0); stepRef.current = snap.section === 'story' ? snap.step : -1;
  const ctl: HoverCtl = { hover, setHover, stepRef };
  const showLabels = !document.querySelector('.dc-panel-anchor') && !mobile && snap.section === 'story' && snap.step === 4;
  useEffect(() => { setScene({ ready: true }); }, []);
  useEffect(() => { if (!showLabels) setHover(null); }, [showLabels]);
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);

  const mats = useMemo(() => ({
    metal: new THREE.MeshStandardMaterial({ color: '#4a505a', metalness: 0.92, roughness: 0.38 }),
    dark: new THREE.MeshStandardMaterial({ color: '#1d2129', metalness: 0.85, roughness: 0.45 }),
    mask: new THREE.MeshStandardMaterial({ color: '#050608', metalness: 0, roughness: 0.92 }),
    pcb: new THREE.MeshPhysicalMaterial({ color: '#0d5a2b', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    chip: new THREE.MeshStandardMaterial({ color: '#111216', roughness: 0.35, metalness: 0.2 }),
    magnet: new THREE.MeshStandardMaterial({ color: '#cfd3da', metalness: 1, roughness: 0.22 }),
    psu: new THREE.MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.9, roughness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.6 }),
    ribbon: new THREE.MeshStandardMaterial({ color: '#8b909a', roughness: 0.5, metalness: 0.3 }),
    flash: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.9, 3), transparent: true, opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }),
  }), []);
  const leds = useMemo(() => Array.from({ length: 5 }, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.7, 2.5), toneMapped: false })), []);

  const panelLed = useMemo(() => {
    const base = { value: new THREE.Vector2(0, 0) }, span = { value: new THREE.Vector2(1, 1) }, cells = { value: 192 };
    return { base, span, mats: MODULES.map((_, i) => makeLedMaterial({ offset: [(i % 2) * 0.5, (1 - Math.floor(i / 2)) * 0.5], scale: [0.5, 0.5], base, span, cells })) };
  }, [mobile]);
  const wall = useMemo(() => {
    const faces = new THREE.PlaneGeometry(1.96, 1.96);
    const uv = new THREE.InstancedBufferAttribute(new Float32Array(32 * 4), 4);
    const flash = new THREE.InstancedBufferAttribute(new Float32Array(32), 1);
    faces.setAttribute('instanceUv', uv); faces.setAttribute('instanceFlash', flash);
    const material = makeLedMaterial({ offset: [0, 0], scale: [1, 1], base: { value: new THREE.Vector2() }, span: { value: new THREE.Vector2(1 / GW, 1 / GH) }, cells: { value: mobile ? 40 : 64 }, instanced: true });
    return { faces, uv, flash, material, objects: Array.from({ length: 32 }, () => new THREE.Object3D()), face: new THREE.Object3D() };
  }, [mobile]);
  const shells = useRef<THREE.InstancedMesh>(null), faces = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const seg = mobile ? 16 : 40;
    const cable = (dy: number, wig: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(wig, dy * 0.3, -0.3), new THREE.Vector3(-wig, dy * 0.7, -0.7), new THREE.Vector3(0, dy, -1)]), seg, 0.018, mobile ? 5 : 8);
    return { cabinet: new THREE.BoxGeometry(2, 2, 0.25), cableA: cable(-0.5, 0.12), cableB: cable(0.8, -0.1), cableC: cable(-0.35, 0.08) };
  }, [mobile]);

  useEffect(() => () => { Object.values(mats).forEach(material => material.dispose()); leds.forEach(material => material.dispose()); }, [mats, leds]);
  useEffect(() => () => { panelLed.mats.forEach(material => material.dispose()); }, [panelLed]);
  useEffect(() => () => { wall.faces.dispose(); wall.material.dispose(); }, [wall]);
  useEffect(() => () => { Object.values(geo).forEach(geometry => geometry.dispose()); }, [geo]);

  const root = useRef<THREE.Group>(null);
  const modRefs = useRef<(THREE.Group | null)[]>([]), maskRefs = useRef<(THREE.Group | null)[]>([]), pcbRefs = useRef<(THREE.Group | null)[]>([]), magRefs = useRef<(THREE.Group | null)[]>([]);
  const cardRef = useRef<THREE.Group>(null), hubRef = useRef<THREE.Group>(null), psuRef = useRef<THREE.Group>(null), backRef = useRef<THREE.Group>(null);
  const cabA = useRef<THREE.Group>(null), cabB = useRef<THREE.Group>(null), cabC = useRef<THREE.Group>(null);
  const flashRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ring = useRef<THREE.Mesh>(null), pulseLight = useRef<THREE.PointLight>(null), sweepLight = useRef<THREE.PointLight>(null);

  const P = useRef<Pose>({ x: 0, y: 0, z: 0, rx: 0, ry: 0, s: 0 }).current, F = useRef<Pose>({ x: 0, y: 0, z: 0, rx: 0, ry: 0, s: 0 }).current;
  const tw = useRef({ key: '', start: 0, eTarget: 0, eStart: 0, eCur: new Float32Array(7), eFrom: new Float32Array(7) }).current;
  const S = useRef({ powerStart: -1, pulseStart: -10, lastStep: -1, wallStart: -1, landed: new Array<boolean>(32).fill(false), flash: new Float32Array(32), p: new Float32Array(32), vis: new Float32Array(32).fill(1), tgt: Array.from({ length: 32 }, () => new THREE.Vector3()), center: new THREE.Vector3(), cell: 0.4, shape: 0, shapeAt: 0, swept: false, prevE: 0, conn: 0, popDone: false, floorY: -2, floorO: 0, vig: 0.55, ringX: 0 }).current;

  const calloutPoint = useMemo(() => new THREE.Vector3(), []);
  const calloutNodes = useRef<{ line: SVGLineElement; dot: SVGCircleElement }[]>([]);
  useEffect(() => {
    calloutNodes.current = Array.from(document.querySelectorAll<SVGLineElement>('[data-panel-leader]')).map((line, i) => ({ line, dot: document.querySelector<SVGCircleElement>(`[data-panel-dot="${i}"]`)! }));
  }, [snap.step]);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05), t = state.clock.elapsedTime, now = performance.now() / 1000;
    const { section, step, stepChangedAt } = sceneState.current; const since = now - stepChangedAt / 1000;
    const vp = state.viewport;
    ledShared.uTime.value = t;
    // Dense face at normal distance; resolved RGB clusters in the close-up.
    panelLed.mats.forEach(material => { material.uniforms['uCells']!.value = section === 'story' && step === 1 ? 64 : 192; });

    if (section === 'story' && S.powerStart < 0) S.powerStart = now;
    ledShared.uPower.value = S.powerStart < 0 ? 0 : clamp((now - S.powerStart) / 1.4);
    if (section === 'story' && step !== S.lastStep) { S.lastStep = step; S.popDone = false; }

    const a = section === 'none' ? null : local ? { x: 0, y: 0, w: vp.width, h: vp.height } : readAnchor(anchors.current[section], vp);
    const wallMode = (section === 'story' && step === 6) || section === 'build';
    if (section === 'build' && now - S.shapeAt > 3) { S.shape = (S.shape + 1) % SHAPES.length; S.shapeAt = now; }
    if (section !== 'build') S.shape = 0;
    const [c0, c1, r0, r1] = SHAPES[S.shape] ?? [0, 7, 0, 3];
    const sw = c1 - c0 + 1, shh = r1 - r0 + 1, cx = (c0 + c1) / 2, cy = (r0 + r1) / 2;

    if (wallMode && a) {
      if (S.wallStart < 0) { S.wallStart = now; S.swept = false; S.landed.fill(false); S.center.set(a.x, a.y, 0); }
      S.cell = Math.min((a.w * 0.96) / GW, (a.h * 0.9) / GH);
      S.center.x = damp(S.center.x, a.x, 4, dt); S.center.y = damp(S.center.y, a.y, 4, dt);
    } else if (!wallMode) S.wallStart = -1;

    /* target pose */
    const T = { x: P.x, y: P.y, z: 0, rx: 0, ry: P.ry, s: 0, e: 0 };
    if (a && wallMode) {
      Object.assign(T, { x: S.center.x + (3 - cx) * S.cell, y: S.center.y + (1 - cy) * S.cell, ry: 0, s: S.cell / 2 });
      panelLed.base.value.set((3 - c0) / sw, (1 - r0) / shh); panelLed.span.value.set(1 / sw, 1 / shh);
    } else {
      panelLed.base.value.set(0, 0); panelLed.span.value.set(1, 1);
      if (a && section === 'story') {
        const sb = Math.min(a.h, a.w) * 0.36;
        Object.assign(T, { x: a.x, y: a.y, s: sb });
        if (step === 0) Object.assign(T, { ry: -0.6, rx: 0.12 });
        if (step === 1) Object.assign(T, { s: sb * (mobile ? 1.65 : 1.7), ry: 0 });
        if (step === 3) Object.assign(T, { ry: -Math.PI + 0.35, rx: 0.06 });
        if (step === 4) Object.assign(T, { ry: -1.05, rx: 0.12, s: sb * 0.72, e: 1 });
        if (step === 5) Object.assign(T, { ry: -0.35, rx: 0.08 });
      } else if (a && section === 'quote') {
        Object.assign(T, { x: a.x, y: a.y, s: a.h * 0.42, ry: -0.3, rx: 0.1 });
      }
    }

    /* tweened pose: snapshot on every step/section change, then ease toward the live target */
    const key = `${section}|${section === 'story' ? step : ''}|${wallMode}`;
    if (key !== tw.key) { tw.key = key; tw.start = now; Object.assign(F, P); F.ry = T.ry - Math.atan2(Math.sin(T.ry - P.ry), Math.cos(T.ry - P.ry)); }
    const k = ease((now - tw.start) / (mobile ? 0.65 : MOVE));
    (['x', 'y', 'z', 'rx', 's'] as const).forEach(f => { P[f] = F[f] + (T[f] - F[f]) * k; });
    P.ry = F.ry + (T.ry - F.ry) * k;
    if (T.e !== tw.eTarget) { tw.eTarget = T.e; tw.eStart = now + (T.e > 0 ? MOVE * 0.45 : 0); tw.eFrom.set(tw.eCur); }
    for (let j = 0; j < 7; j++) { const order = T.e > 0 ? j : 6 - j; const f = tw.eFrom[j] ?? 0; tw.eCur[j] = f + (T.e - f) * ease((now - tw.eStart - order * STAGGER) / PART_DUR); }
    const ec = (j: number) => tw.eCur[j] ?? 0;
    const s = Math.max(0.0001, P.s);
    const idle = !mobile && section === 'story' && step !== 1 && !wallMode ? ease((now - tw.start - MOVE) / 1.5) * Math.sin(t * 0.35) * 0.035 : 0;
    const g = root.current;
    if (g) { g.position.set(P.x, P.y, P.z); g.rotation.set(P.rx, P.ry + idle, 0); g.scale.set(s, s, s * 0.72); g.visible = P.s > 0.003 && !(wallMode && now - S.wallStart >= MOVE); }

    /* exploded view */
    let popZ = 0, popRy = 0;
    if (section === 'story' && step === 5 && since > (mobile ? 0.7 : 2.0)) {
      const p = clamp((since - (mobile ? 0.7 : 2.0)) / 2.4); const bump = ease(p < 0.5 ? p * 2 : 2 - p * 2);
      popZ = bump * 1.1; popRy = bump * Math.PI * 0.9;
    }
    S.conn = 0;
    MODULES.forEach((m, i) => {
      const e0 = ec(0);
      const mod = modRefs.current[i]; if (mod) { mod.position.set(m.x * (1 + 0.18 * e0), m.y * (1 + 0.18 * e0), i === 0 ? popZ : 0); mod.rotation.y = i === 0 ? popRy : 0; }
      const mk = maskRefs.current[i]; if (mk) mk.position.z = 0.16 + 1.25 * e0;
      const pc = pcbRefs.current[i]; if (pc) pc.position.z = 0.125 + 0.8 * ec(1);
      const mg = magRefs.current[i]; if (mg) mg.position.z = 0.095 + 0.42 * ec(2);
      const fl = flashRefs.current[i]; if (fl) fl.scale.setScalar(0.2 + S.conn * 0.9);
    });
    mats.flash.opacity = S.conn * 0.9;
    const zc = -0.06 - 0.55 * ec(3), zh = -0.09 - 0.95 * ec(4), zp = -0.11 - 1.4 * ec(5), zb = -0.17 - 1.85 * ec(6);
    if (cardRef.current) cardRef.current.position.z = zc;
    if (hubRef.current) hubRef.current.position.z = zh;
    if (psuRef.current) psuRef.current.position.z = zp;
    if (backRef.current) backRef.current.position.z = zb;
    if (cabA.current) { cabA.current.position.z = zc; cabA.current.scale.z = Math.max(0.02, zc - zh); }
    if (cabB.current) { cabB.current.position.z = zh; cabB.current.scale.z = Math.max(0.02, zh - zp); }
    if (cabC.current) { cabC.current.position.z = zh; cabC.current.scale.z = Math.max(0.02, zh - zb); }

    // Project actual module positions into the product frame so leaders follow the explosion.
    if (section === 'story' && step === 4 && calloutNodes.current.length) {
      const rect = anchors.current['story'];
      const width = local ? state.size.width : rect?.width;
      const height = local ? state.size.height : rect?.height;
      const targets = [maskRefs.current[0], maskRefs.current[1], magRefs.current[2]];
      if (width && height) targets.forEach((target, i) => {
        const nodes = calloutNodes.current[i]; if (!target || !nodes) return;
        target.updateWorldMatrix(true, false);
        calloutPoint.set(0, 0, 0); target.localToWorld(calloutPoint); calloutPoint.project(state.camera);
        const x = (calloutPoint.x + 1) / 2 * state.size.width - (local ? 0 : rect!.left);
        const y = (1 - calloutPoint.y) / 2 * state.size.height - (local ? 0 : rect!.top);
        nodes.line.setAttribute('x2', String(x)); nodes.line.setAttribute('y2', String(y));
        nodes.dot.setAttribute('cx', String(x)); nodes.dot.setAttribute('cy', String(y));
      });
    }

    /* status LEDs */
    const powered = ledShared.uPower.value > 0.9;
    leds.forEach((m, i) => {
      const seq = i === 4 ? powered : section === 'story' && (step > 3 || (step === 3 && since > MOVE + i * 0.18));
      const lv = !seq ? 0.05 : 0.6 + 0.4 * Math.sin(t * 1.5 + i * 1.7);
      m.color.setRGB(0.3 * lv, 0.7 * lv, 2.6 * lv);
    });

    /* pulse + lights */
    const pe = now - S.pulseStart;
    ledShared.uPulse.value = pe < 0.9 ? 1 - (pe / 0.9) * 0.4 : 0; ledShared.uPulsePos.value = (pe / 0.7) * 1.4 - 0.2;
    if (pulseLight.current) pulseLight.current.intensity = 0;
    if (sweepLight.current) sweepLight.current.intensity = 0;

    /* floor + power-on ring */
    if (a && section === 'story') { S.floorY = a.y - a.h * 0.5; S.ringX = a.x; }
    S.floorO = damp(S.floorO, section === 'story' && step !== 1 ? 1 : 0, 4, dt);

    if (ring.current) {
      const rp = S.powerStart < 0 ? 0 : (now - S.powerStart) / 1.8;
      ring.current.position.set(S.ringX, S.floorY + 0.01, 0); ring.current.scale.setScalar(0.3 + rp * 4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = S.powerStart < 0 ? 0 : Math.max(0, 1 - rp) * S.floorO;
    }

    /* wall copies */
    const landedAll = MOVE + 31 * 0.05 + 0.9;
    if (wallMode && S.wallStart >= 0 && !S.swept && now - S.wallStart > landedAll) { S.swept = true; S.pulseStart = now; }
    // Leave settled wall instances alone while the single cabinet is displayed.
    const updateWall = wallMode || S.p.some(progress => progress > 0);
    if (updateWall) for (let k = 0; k < 32; k++) {
      const mesh = wall.objects[k]!;
      const col = k % GW, row = Math.floor(k / GW), inShape = col >= c0 && col <= c1 && row >= r0 && row <= r1;
      let pk = S.p[k] ?? 0;
      pk = wallMode && S.wallStart >= 0 ? clamp((now - S.wallStart - (mobile ? 0.2 : MOVE) - (RANK[k] ?? 0) * (mobile ? 0.02 : 0.05)) / (mobile ? 0.55 : 0.9)) : Math.max(0, pk - dt * 2.5);
      if (k === MAIN && wallMode) pk = now - S.wallStart >= MOVE ? 1 : 0;
      S.p[k] = pk;
      if (wallMode && pk >= 1 && !S.landed[k]) { S.landed[k] = true; S.flash[k] = 1; }
      S.flash[k] = (S.flash[k] ?? 0) * Math.exp(-5 * dt);
      S.vis[k] = damp(S.vis[k] ?? 1, inShape ? 1 : 0, 6, dt);
      const tx = (col - cx) * S.cell, ty = (row - cy) * S.cell, tg = S.tgt[k]!;
      if (pk < 0.02) tg.set(tx, ty, 0); else { tg.x = damp(tg.x, tx, 5, dt); tg.y = damp(tg.y, ty, 5, dt); }
      const ebk = ease(pk), st = START[k]!;
      mesh.position.set(S.center.x + tg.x + st.x * (1 - ebk), S.center.y + tg.y + st.y * (1 - ebk), st.z * (1 - ebk));
      mesh.rotation.set((1 - ebk) * 0.8, (1 - ebk) * (k % 2 ? 1.6 : -1.6), 0);
      const sc = (S.cell / 2) * (S.vis[k] ?? 1);
      mesh.scale.setScalar(Math.max(0.0001, sc)); mesh.visible = pk > 0.001 && (S.vis[k] ?? 0) > 0.02;
      if (!mesh.visible) mesh.scale.setScalar(0);
      mesh.updateMatrix(); shells.current?.setMatrixAt(k, mesh.matrix);
      wall.face.position.copy(mesh.position); wall.face.quaternion.copy(mesh.quaternion); wall.face.scale.copy(mesh.scale);
      wall.face.translateZ(0.127 * mesh.scale.x); wall.face.updateMatrix(); faces.current?.setMatrixAt(k, wall.face.matrix);
      wall.uv.setXYZW(k, (col - c0) / sw, (row - r0) / shh, 1 / sw, 1 / shh); wall.flash.setX(k, S.flash[k] ?? 0);
    }

    if (shells.current) { shells.current.visible = updateWall; if (updateWall) shells.current.instanceMatrix.needsUpdate = true; }
    if (faces.current) { faces.current.visible = updateWall; if (updateWall) faces.current.instanceMatrix.needsUpdate = true; }
    if (updateWall) { wall.uv.needsUpdate = true; wall.flash.needsUpdate = true; }

    /* post */
    S.vig = damp(S.vig, section === 'story' && step === 1 ? 0.95 : 0.55, 3, dt);
    if (vigRef.current) vigRef.current.darkness = S.vig;
  });

  return <>
    <group ref={root} scale={0.0001}>
      {/* front modules */}
      {MODULES.map((m, i) => <group key={i} ref={el => { modRefs.current[i] = el; }} position={[m.x, m.y, 0]}>
        <group ref={el => { maskRefs.current[i] = el; }} position={[0, 0, 0.16]}>
          <Part name="mask" size={[0.998, 0.998, 0.04]} ctl={ctl} label={i === 1 ? partLabels.mask : undefined} labelPos={[0, 0.5, 0]} order={0} show={showLabels}>
            <mesh material={mats.mask}><boxGeometry args={[0.998, 0.998, 0.03]} /></mesh>
            <mesh material={panelLed.mats[i]!} position={[0, 0, 0.0165]}><planeGeometry args={[0.996, 0.996]} /></mesh>
          </Part>
          <mesh ref={el => { flashRefs.current[i] = el; }} material={mats.flash} position={[0, 0, 0.03]}><circleGeometry args={[0.35, 24]} /></mesh>
        </group>
        <group ref={el => { pcbRefs.current[i] = el; }} position={[0, 0, 0.125]}>
          <Part name="pcb" size={[0.94, 0.94, 0.06]} ctl={ctl} label={i === 1 ? partLabels.pcb : undefined} labelPos={[0, -0.5, 0]} side="down" order={1} show={showLabels}>
            <mesh material={mats.pcb}><boxGeometry args={[0.94, 0.94, 0.02]} /></mesh>
            {(mobile ? CHIPS.slice(0, 2) : CHIPS).map(([x, y, w], j) => <mesh key={j} material={mats.chip} position={[x, y, -0.018]}><boxGeometry args={[w, w * 0.7, 0.016]} /></mesh>)}
          </Part>
        </group>
        <group ref={el => { magRefs.current[i] = el; }} position={[0, 0, 0.095]}>
          <Part name="magnets" size={[0.7, 0.7, 0.06]} ctl={ctl} label={i === 1 ? partLabels.magnets : undefined} labelPos={[0.35, 0.4, 0]} order={2} show={showLabels}>
            {([[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]] as [number, number][]).map(([x, y], j) => <mesh key={j} material={mats.magnet} position={[x, y, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.04, 16]} /></mesh>)}
          </Part>
        </group>
      </group>)}

      {/* die-cast frame */}
      <Part name="frame" size={[2.1, 2.1, 0.4]} ctl={ctl} label={partLabels.frame} labelPos={[-0.9, -1.05, 0]} side="down" order={3} show={showLabels}>
        <PanelFrame />
      </Part>

      {/* electronics */}
      <group ref={cardRef} position={[0, 0.15, -0.06]}>
        <Part name="card" size={[0.5, 0.3, 0.04]} ctl={ctl} label={partLabels.card} labelPos={[0, 0.2, 0]} order={4} show={showLabels}>
          <mesh material={mats.pcb}><boxGeometry args={[0.5, 0.3, 0.02]} /></mesh>
          <mesh material={mats.chip} position={[-0.08, 0, -0.015]}><boxGeometry args={[0.14, 0.1, 0.012]} /></mesh>
          <mesh material={leds[4]!} position={[0.18, 0.1, -0.015]}><sphereGeometry args={[0.018, 10, 10]} /></mesh>
        </Part>
      </group>
      <group ref={hubRef} position={[0, -0.35, -0.09]}>
        <Part name="hub" size={[0.6, 0.4, 0.04]} ctl={ctl} label={partLabels.hub} labelPos={[0, -0.25, 0]} side="down" order={5} show={showLabels}>
          <mesh material={mats.pcb}><boxGeometry args={[0.6, 0.4, 0.02]} /></mesh>
          {[-0.2, 0, 0.2].map(x => <mesh key={x} material={mats.dark} position={[x, 0.1, -0.02]}><boxGeometry args={[0.1, 0.05, 0.03]} /></mesh>)}
        </Part>
      </group>
      <group ref={psuRef} position={[0, 0.45, -0.11]}>
        <Part name="psu" size={[0.7, 0.25, 0.14]} ctl={ctl} label={partLabels.psu} labelPos={[0, 0.18, 0]} order={6} show={showLabels}>
          <mesh material={mats.psu}><boxGeometry args={[0.7, 0.25, 0.12]} /></mesh>
          {Array.from({ length: 7 }, (_, j) => <mesh key={j} material={mats.chip} position={[-0.27 + j * 0.09, 0, -0.061]}><boxGeometry args={[0.035, 0.17, 0.004]} /></mesh>)}
        </Part>
      </group>
      <group ref={cabA} position={[0.05, 0.15, -0.06]}><mesh geometry={geo.cableA} material={mats.ribbon} /></group>
      <group ref={cabB} position={[-0.1, -0.35, -0.09]}><mesh geometry={geo.cableB} material={mats.rubber} /></group>
      <group ref={cabC} position={[0.15, -0.35, -0.09]}><mesh geometry={geo.cableC} material={mats.rubber} /></group>

      {/* back plate */}
      <group ref={backRef} position={[0, 0, -0.17]}>
        <Part name="back" size={[1.9, 1.9, 0.4]} ctl={ctl} label={partLabels.back} labelPos={[-0.4, 0.98, 0]} order={7} show={showLabels}>
          <PanelRear />
        </Part>
      </group>
    </group>

    {/* wall copies */}
    <instancedMesh ref={shells} args={[geo.cabinet, mats.dark, 32]} frustumCulled={false} />
    <instancedMesh ref={faces} args={[wall.faces, wall.material, 32]} frustumCulled={false} />

    {/* floor + ring */}
    <mesh ref={ring} rotation-x={-Math.PI / 2}><ringGeometry args={[0.92, 1, 64]} /><meshBasicMaterial color={[0.3, 0.7, 3]} toneMapped={false} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    <pointLight ref={pulseLight} color="#4d8dff" intensity={0} distance={8} />
    <pointLight ref={sweepLight} color="#ffffff" intensity={0} distance={10} />
  </>;
}

function RenderBudget({ active, mobile }: { active: boolean; mobile: boolean }) {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    if (!active) return;
    let frame = 0, last = -Infinity;
    const interval = 1000 / (mobile ? 30 : 60);
    const tick = (now: number) => {
      if (now - last >= interval - 1) { last = now; invalidate(); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, mobile, invalidate]);
  return null;
}

export default function AxisScene() {
  const { section, mobile } = useSceneState();
  const [loop, setLoop] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', update); update(); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => { if (section !== 'none') { setLoop(true); return; } const id = window.setTimeout(() => setLoop(false), 1500); return () => window.clearTimeout(id); }, [section]);
  const vigRef = useRef<VignetteEffect>(null);
  const anchor = mobile ? document.querySelector<HTMLElement>('.dc-panel-anchor') : null;
  const local = Boolean(anchor);
  const scene = <><div className="scene-labels" ref={el => { (labelPortal as { current: HTMLElement | null }).current = el; }} aria-hidden="true" /><div className={`scene-canvas ${local ? 'scene-canvas-local' : ''} ${loop ? '' : 'idle'}`} aria-hidden="true">
    <Canvas onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setScene({ enabled: false, ready: false }), { once: true }); }} frameloop="demand" dpr={mobile ? [1, 1.5] : 1} camera={{ position: [0, 0, 8], fov: 35, near: 0.1, far: 60 }} gl={{ antialias: true, powerPreference: mobile ? 'low-power' : 'default' }} eventSource={anchor ?? document.body} eventPrefix="client">
      <RenderBudget active={loop && visible} mobile={mobile} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, 6]} intensity={1.6} color="#f2f5ff" />
      <directionalLight position={[-2, 3, -6]} intensity={2} color="#f2f5ff" />
      <pointLight position={[-4, 2, -3]} intensity={12} color="#2f6bff" />
      <pointLight position={[4, -1, -3]} intensity={10} color="#3d7dff" />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.5} color="#5b8cff" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={1.5} color="#5b8cff" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={0.8} position={[0, 0, 6]} scale={[8, 3, 1]} />
      </Environment>
      <Rig mobile={mobile} local={local} vigRef={vigRef} />
      {!mobile && <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.8} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur resolutionScale={0.5} />
        <Vignette ref={vigRef} offset={0.3} darkness={0.55} />
      </EffectComposer>}
    </Canvas>
  </div></>;
  return anchor ? createPortal(scene, anchor) : scene;
}
