import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { builder, setBuilder, useBuilder, type BuilderState } from './store';
import { GRID_W, slotOf } from './slots';
import { setCell, addCol, removeCol, addRow, removeRow } from './grid';
import { roomSizes, pitchOf, contentText, contents, sizeLimits } from '@/config/builder';

/* ---------------- geometry of the build ---------------- */
const CAB = 0.5, MAX = 480, STAGE_TOP = 1.0;
const damp = THREE.MathUtils.damp;
type T = { p: THREE.Vector3; ry: number; cell: [number, number] };

export function layoutInfo(s: BuilderState) {
  const room = roomSizes.find(r => r.id === s.room) ?? roomSizes[1];
  const k = room.scale, W = s.cols * CAB, H = s.rows * CAB;
  const base = STAGE_TOP + (s.mount === 'flown' ? 2.2 : 0.6);
  const wallZ = -5 * k;
  const halfW = Math.max(9 * k, W / 2 + (s.layout === 'sides' ? 2.5 + s.sideCols * CAB : 3));
  const ceil = Math.max(7.5 * k, base + H + 2.5);
  const seatStart = 2, seatEnd = seatStart + room.rows * 1.1;
  return { k, W, H, base, wallZ, halfW, ceil, seatStart, seatEnd, rows: room.rows };
}

const SIDE_BASE = 288, SIDE_W = 8;
/** Fixed slot per grid position so cabinets keep their identity while the wall is edited. */
function targets(s: BuilderState, includeHoles = false): (T | null)[] {
  const { W, base, wallZ } = layoutInfo(s);
  const out: (T | null)[] = new Array(MAX).fill(null);
  const R = Math.max(W * 0.85, 6);
  const third = Math.floor(s.cols / 3);
  const holes = new Set(includeHoles ? [] : s.holes);
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    if (holes.has(`${c}:${r}`)) continue;
    const xc = (c - (s.cols - 1) / 2) * CAB, y = base + (r + 0.5) * CAB; let t: T;
    if (s.layout === 'curved') { const th = xc / R; t = { p: new THREE.Vector3(R * Math.sin(th), y, wallZ + R * (1 - Math.cos(th))), ry: -th, cell: [c, r] }; }
    else if (s.layout === 'panorama' && third >= 1 && s.cols >= 6 && (c < third || c >= s.cols - third)) {
      const right = c >= s.cols - third, a = 0.32, edge = (s.cols / 2 - third) * CAB;
      const d = (right ? c - (s.cols - third) + 0.5 : third - c - 0.5) * CAB;
      t = { p: new THREE.Vector3((right ? 1 : -1) * (edge + Math.cos(a) * d), y, wallZ + Math.sin(a) * d), ry: right ? -a : a, cell: [c, r] };
    } else t = { p: new THREE.Vector3(xc, y, wallZ), ry: 0, cell: [c, r] };
    out[slotOf(c, r)] = t;
  }
  if (s.layout === 'sides' && !includeHoles) {
    const sc = s.sideCols;
    [-1, 1].forEach((side, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < sc; c++) {
      const cx = side * (W / 2 + 1.4 + sc * CAB / 2), a = side * -0.42, lx = (c - (sc - 1) / 2) * CAB;
      out[SIDE_BASE + si * 96 + r * SIDE_W + c] = { p: new THREE.Vector3(cx + Math.cos(a) * lx, base + (r + 0.5) * CAB, wallZ + 0.6 - Math.sin(a) * lx), ry: a, cell: [(c / sc) * s.cols, r] };
    } });
  }
  return out;
}

/* ---------------- LED shader ---------------- */
const vert = /* glsl */ `
attribute vec2 aCell; attribute float aFlash;
varying vec2 vUv; varying vec2 vCell; varying float vFlash;
void main(){ vUv=uv; vCell=aCell; vFlash=aFlash; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`;
const frag = /* glsl */ `
uniform float uTime, uBright, uCells, uPixelVis, uWipe, uPower, uWash, uFlashAll;
uniform int uContent, uPrev; uniform vec2 uGrid;
uniform sampler2D uTexA, uTexB;
varying vec2 vUv; varying vec2 vCell; varying float vFlash;
vec3 motion(vec2 g){ float w1=sin(g.x*6.0-uTime*1.1+sin(g.y*4.0+uTime*.5)*1.8); float w2=sin(g.y*8.0+uTime*.8+g.x*3.0);
  vec3 c=mix(vec3(.01,.05,.35),vec3(.15,.55,1.4),.5+.5*w1); return c+vec3(.6,.8,1.2)*pow(max(0.,w2),10.)*.7; }
vec3 imag(vec2 g){ vec3 bg=mix(vec3(.04,.05,.1),vec3(.12,.16,.3),g.y); vec2 q=(g-vec2(.5+.03*sin(uTime*.4),.0))*vec2(1.6,1.);
  float head=smoothstep(.13,.12,length(q-vec2(0.,.62))); float body=smoothstep(.36,.35,length((q-vec2(0.,.08))*vec2(1.,1.6)));
  vec3 skin=vec3(.75,.55,.45), shirt=vec3(.08,.12,.22); vec3 c=mix(bg,shirt,body); c=mix(c,skin,head); c+=vec3(.9,.95,1.)*smoothstep(.02,0.,abs(g.y-.08))*.0; return c; }
vec3 content(int m, vec2 g, sampler2D tex){
  if(m==2) return motion(g); if(m==3) return imag(g);
  vec3 bg = m==1 ? mix(vec3(.02,.03,.08),vec3(.05,.1,.25),g.x) : motion(g)*.45;
  vec4 t=texture2D(tex,g); return mix(bg,vec3(1.),t.a*t.r); }
void main(){
  vec2 g=(vCell+vUv)/uGrid;
  vec3 a=content(uContent,g,uTexA), b=content(uPrev,g,uTexB);
  float edge=uWipe*1.25-.1; float wipe=smoothstep(edge-.06,edge,g.x+ (fract(sin(dot(floor(g*vec2(uGrid.x*8.,uGrid.y*8.)),vec2(12.9,78.2)))*43758.)*.06));
  vec3 base=mix(a,b,wipe);
  base+=vec3(.5,.8,1.6)*smoothstep(.04,0.,abs(g.x-edge))*step(uWipe,.999)*.8;
  vec2 cuv=vUv*uCells; vec2 f=fract(cuv);
  float dots=smoothstep(.48,.28,length(f-.5));
  vec3 col=mix(base, base*dots*1.6, uPixelVis);
  float seam=step(.012,vUv.x)*step(vUv.x,.988)*step(.012,vUv.y)*step(vUv.y,.988);
  float on=smoothstep(0.,.08,uPower*1.1-(1.-g.x)*.0-g.x*.0) * step(g.x, uPower*1.2);
  col*=seam*uBright*on;
  col=mix(col,col*.55+vec3(.18),uWash);
  col+=vec3(.6,.8,1.4)*vFlash+vec3(1.)*uFlashAll;
  gl_FragColor=vec4(col+vec3(.01),1.);
}`;

function textTexture(lines: string[], big: boolean) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 512); x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = `600 ${big ? 78 : 56}px Inter, sans-serif`; x.fillText(lines[0] ?? '', 512, 230);
  x.font = '400 44px Inter, sans-serif'; x.fillText(lines[1] ?? '', 512, 320);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}
const CONTENT_INDEX: Record<string, number> = { lyrics: 0, slides: 1, motion: 2, imag: 3, announce: 4 };

/* ---------------- Wall (instanced) ---------------- */
function Wall({ lowPower }: { lowPower: boolean }) {
  const s = useBuilder();
  const face = useRef<THREE.InstancedMesh>(null!), body = useRef<THREE.InstancedMesh>(null!);
  const textures = useMemo(() => ({ lyrics: textTexture(contentText.lyrics, true), slides: textTexture(contentText.slides, true), announce: textTexture(contentText.announce, false) }), []);
  const blank = useMemo(() => new THREE.DataTexture(new Uint8Array(4), 1, 1), []);
  const texFor = (id: string) => (textures as Record<string, THREE.Texture>)[id] ?? blank;
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, toneMapped: false, uniforms: {
    uTime: { value: 0 }, uBright: { value: 1 }, uCells: { value: 8 }, uPixelVis: { value: 0 }, uWipe: { value: 1 }, uPower: { value: 0 }, uWash: { value: 0 }, uFlashAll: { value: 0 },
    uContent: { value: 2 }, uPrev: { value: 2 }, uGrid: { value: new THREE.Vector2(12, 7) }, uTexA: { value: blank }, uTexB: { value: blank } } }), [blank]);
  const faceGeo = useMemo(() => new THREE.PlaneGeometry(CAB * 0.985, CAB * 0.985).translate(0, 0, 0.051), []);
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(CAB * 0.99, CAB * 0.99, 0.1), []);
  const sim = useMemo(() => ({
    pos: Array.from({ length: MAX }, () => new THREE.Vector3(0, -50, 0)), ry: new Float32Array(MAX), spin: new Float32Array(MAX), sc: new Float32Array(MAX),
    tgt: [] as (T | null)[], present: new Uint8Array(MAX), flying: new Uint8Array(MAX), lastKey: '', shiftN: 0, prevContent: 'motion',
    cell: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2), flash: new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1),
  }), []);
  useEffect(() => { faceGeo.setAttribute('aCell', sim.cell); faceGeo.setAttribute('aFlash', sim.flash); }, [faceGeo, sim]);

  // content wipe
  useEffect(() => {
    mat.uniforms['uPrev']!.value = CONTENT_INDEX[sim.prevContent]; mat.uniforms['uTexB']!.value = texFor(sim.prevContent);
    mat.uniforms['uContent']!.value = CONTENT_INDEX[s.content]; mat.uniforms['uTexA']!.value = texFor(s.content);
    mat.uniforms['uWipe']!.value = sim.prevContent === s.content ? 1 : 0; sim.prevContent = s.content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.content]);

  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []), v = useMemo(() => new THREE.Vector3(), []);
  const t0 = useRef(performance.now());
  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.05), b = builder.current, u = mat.uniforms;
    const introT = (performance.now() - t0.current) / 1000;
    const intro = !b.introDone && introT < 3.2;
    const key = intro && introT < 1.3 ? 'intro' : `${b.cols}x${b.rows}|${b.layout}|${b.mount}|${b.room}|${b.venue}|${b.holes.join(',')}|${b.sideCols}`;
    if (b.shift.n !== sim.shiftN) { // columns/rows added or removed at the left/bottom: carry cabinets to their new slots
      sim.shiftN = b.shift.n; const { dx, dy } = b.shift;
      const pos = sim.pos.map(p => p.clone()), ry = sim.ry.slice(), sc = sim.sc.slice(), pr = sim.present.slice();
      for (let r = 0; r < 12; r++) for (let c = 0; c < GRID_W; c++) {
        const to = slotOf(c, r), fc = c - dx, fr = r - dy;
        if (fc < 0 || fr < 0 || fc >= GRID_W || fr >= 12) { sim.present[to] = 0; sim.sc[to] = 0; continue; }
        const from = slotOf(fc, fr); sim.pos[to]!.copy(pos[from]!); sim.ry[to] = ry[from]!; sim.sc[to] = sc[from]!; sim.present[to] = pr[from]!;
      }
    }
    if (key !== sim.lastKey) {
      const tg: (T | null)[] = key === 'intro' ? [{ p: new THREE.Vector3(0, layoutInfo(b).base + 1.5, layoutInfo(b).wallZ), ry: 0, cell: [0, 0] }, ...new Array(MAX - 1).fill(null)] : targets(b);
      for (let i = 0; i < MAX; i++) {
        const t = tg[i]; if (!t) continue;
        if (!sim.present[i] || sim.sc[i]! < 0.2) { // fly in from offscreen
          const a = i * 2.399; sim.pos[i]!.set(t.p.x + Math.cos(a) * 9, t.p.y + 5 + Math.sin(a) * 3, t.p.z + 7 + (i % 4)); sim.ry[i] = (i % 2 ? 1 : -1) * 2.5; sim.flying[i] = 1; sim.sc[i] = 1;
        } else if (sim.pos[i]!.distanceTo(t.p) > 0.3) sim.flying[i] = 1;
        sim.cell.setXY(i, t.cell[0], t.cell[1]);
      }
      for (let i = 0; i < MAX; i++) sim.present[i] = tg[i] ? 1 : 0;
      sim.cell.needsUpdate = true;
      u['uGrid']!.value.set(key === 'intro' ? 1 : b.cols, key === 'intro' ? 1 : b.rows);
      sim.tgt = tg; sim.lastKey = key;
    }
    const hov = b.step === 2 && b.hover.startsWith('c') ? Number(b.hover.slice(1)) : -1;
    for (let i = 0; i < MAX; i++) {
      const tg = sim.tgt[i];
      if (tg) {
        const rate = sim.flying[i] ? 4.5 : 7;
        sim.pos[i]!.lerp(tg.p, 1 - Math.exp(-rate * dt)); sim.ry[i] = damp(sim.ry[i]!, tg.ry, rate, dt);
        sim.sc[i] = damp(sim.sc[i]!, 1, 8, dt);
        if (sim.flying[i] && sim.pos[i]!.distanceTo(tg.p) < 0.03) { sim.flying[i] = 0; sim.flash.setX(i, 1); if (!intro && i % 9 === 0) setBuilder({ shakeAt: performance.now() }); }
      } else if (sim.sc[i]! > 0.001) { // ejected
        v.set(sim.pos[i]!.x * 0.02, 0.02, 0.12); sim.pos[i]!.add(v); sim.sc[i] = damp(sim.sc[i]!, 0, 4, dt); if (sim.sc[i]! < 0.01) sim.sc[i] = 0;
      }
      sim.flash.setX(i, Math.max(i === hov ? 0.35 : 0, sim.flash.getX(i) * Math.exp(-5 * dt)));
      e.set(0, sim.ry[i]!, 0); q.setFromEuler(e); v.setScalar(sim.sc[i]!);
      m.compose(sim.pos[i]!, q, v); face.current.setMatrixAt(i, m); body.current.setMatrixAt(i, m);
    }
    face.current.instanceMatrix.needsUpdate = body.current.instanceMatrix.needsUpdate = true; sim.flash.needsUpdate = true;
    // uniforms
    u['uTime']!.value = st.clock.elapsedTime;
    u['uPower']!.value = Math.min(1, intro ? Math.max(0, (introT - 0.4) / 0.8) : u['uPower']!.value + dt);
    u['uBright']!.value = damp(u['uBright']!.value, 0.35 + (b.brightness / 1200) * 1.15, 6, dt);
    u['uWipe']!.value = Math.min(1, u['uWipe']!.value + dt / 0.9);
    const pitch = pitchOf(b).mm;
    u['uCells']!.value = damp(u['uCells']!.value, Math.min(40, 500 / pitch / 5), 5, dt); // visual density, scaled down 5x for legibility
    const ft = b.step === 1 ? b.viewingFt : 40; const pv = THREE.MathUtils.clamp(1 - (ft / (pitch * 3.28) - 0.5) / 2, 0, 1);
    u['uPixelVis']!.value = damp(u['uPixelVis']!.value, b.step === 1 ? pv : lowPower ? 0 : 0.15, 5, dt);
    const amb = { house: 0.75, dim: 0.35, worship: 0.1, daylight: 0.9, midday: 1, sunset: 0.5, night: 0.05 }[b.lighting] ?? 0.4;
    u['uWash']!.value = damp(u['uWash']!.value, THREE.MathUtils.clamp(amb - b.brightness / 1500, 0, 0.6), 4, dt);
    u['uFlashAll']!.value = Math.max(0, 1 - (performance.now() - b.flash) / 450);
  });
  return <group>
    <instancedMesh ref={body} args={[bodyGeo, undefined, MAX]} frustumCulled={false}><meshStandardMaterial color="#14161b" metalness={0.6} roughness={0.4} /></instancedMesh>
    <instancedMesh ref={face} args={[faceGeo, mat, MAX]} frustumCulled={false}
      onPointerMove={ev => { if (builder.current.step !== 2 || ev.instanceId === undefined || ev.instanceId >= SIDE_BASE) return; ev.stopPropagation(); const h = `c${ev.instanceId}`; if (builder.current.hover !== h) setBuilder({ hover: h }); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { if (builder.current.hover.startsWith('c')) setBuilder({ hover: '' }); document.body.style.cursor = ''; }}
      onClick={ev => { if (builder.current.step !== 2 || ev.instanceId === undefined || ev.instanceId >= SIDE_BASE || ev.delta > 6) return; ev.stopPropagation(); setCell(ev.instanceId % GRID_W, Math.floor(ev.instanceId / GRID_W), false); }} />
    <Ghosts />
    <WallSpill />
  </group>;
}

function WallSpill() {
  const l = useRef<THREE.PointLight>(null!);
  useFrame((_, dt) => { const b = builder.current, i = layoutInfo(b); l.current.position.set(0, i.base + i.H / 2, i.wallZ + 2.5); l.current.intensity = damp(l.current.intensity, (b.brightness / 1200) * 40 * (i.W / 6), 4, dt); });
  return <pointLight ref={l} color="#3b7dff" distance={22} decay={1.6} />;
}

/* ---------------- environments ---------------- */
function useGrow(active: boolean, speed = 2.5) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (!g.current) return; const v = damp(g.current.scale.y, active ? 1 : 0.0001, speed, dt); g.current.scale.set(1, v, 1); g.current.visible = v > 0.002; });
  return g;
}
function Figure({ position, color = '#0b0c10', h = 1.75 }: { position: [number, number, number]; color?: string; h?: number }) {
  const sc = h / 1.75;
  return <group position={position} scale={sc}><mesh position={[0, 0.65, 0]}><capsuleGeometry args={[0.2, 0.9, 4, 8]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh><mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh></group>;
}

function Seats({ info }: { info: ReturnType<typeof layoutInfo> }) {
  const ref = useRef<THREE.InstancedMesh>(null!); const PER = 16, MAXR = 12;
  const m = useMemo(() => new THREE.Matrix4(), []), sc = useRef(new Float32Array(MAXR));
  useFrame((_, dt) => {
    const i = layoutInfo(builder.current); const spread = (i.halfW * 2 - 4) / PER;
    for (let r = 0; r < MAXR; r++) {
      sc.current[r] = damp(sc.current[r]!, r < i.rows ? 1 : 0, 4, dt);
      for (let c = 0; c < PER; c++) { const s = sc.current[r]!; m.makeScale(s, s, s); m.setPosition((c - (PER - 1) / 2) * spread, 0.3 * s + r * 0.12, i.seatStart + r * 1.1); ref.current.setMatrixAt(r * PER + c, m); }
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, PER * MAXR]} frustumCulled={false} key={info.k}><boxGeometry args={[0.55, 0.6, 0.55]} /><meshStandardMaterial color="#1a1c22" roughness={0.8} /></instancedMesh>;
}

function MovingHead({ x, phase, info, colorful }: { x: number; phase: number; info: ReturnType<typeof layoutInfo>; colorful: boolean }) {
  const g = useRef<THREE.Group>(null!), beam = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(st => {
    const t = st.clock.elapsedTime; g.current.rotation.z = Math.sin(t * 0.45 + phase) * 0.5; g.current.rotation.x = 0.35 + Math.sin(t * 0.3 + phase * 2) * 0.2;
    const hue = colorful ? (0.6 + 0.15 * Math.sin(t * 0.2 + phase)) % 1 : 0.6; beam.current.color.setHSL(hue, colorful ? 0.9 : 0.6, 0.6);
    beam.current.opacity = damp(beam.current.opacity, builder.current.lighting === 'worship' || builder.current.lighting === 'night' ? 0.13 : 0.04, 2, st.clock.getDelta() || 0.016);
  });
  return <group position={[x, info.ceil - 0.6, info.wallZ + 3]}><mesh><boxGeometry args={[0.3, 0.35, 0.3]} /><meshStandardMaterial color="#222" /></mesh>
    <group ref={g}><mesh position={[0, -5, 0]}><coneGeometry args={[1.2, 10, 20, 1, true]} /><meshBasicMaterial ref={beam} color="#5b9dff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh></group></group>;
}

function Haze({ count }: { count: number }) {
  const g = useRef<THREE.Group>(null!);
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }, []);
  useFrame(st => { g.current.children.forEach((c, i) => { c.position.x = Math.sin(st.clock.elapsedTime * 0.05 + i * 1.7) * 6; }); });
  return <group ref={g}>{Array.from({ length: count }, (_, i) => <sprite key={i} position={[0, 2 + (i % 3) * 1.4, -3 + i * 1.6]} scale={[10, 5, 1]}><spriteMaterial map={tex} color="#5b7fbf" transparent opacity={0.07} depthWrite={false} /></sprite>)}</group>;
}

function Indoor({ active, mobile }: { active: boolean; mobile: boolean }) {
  const s = useBuilder(); const info = layoutInfo(s); const g = useGrow(active);
  const room = useRef<THREE.Group>(null!); const ceil = useRef<THREE.Group>(null!);
  const left = useRef<THREE.Mesh>(null!), right = useRef<THREE.Mesh>(null!), back = useRef<THREE.Mesh>(null!);
  const win = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((_, dt) => {
    const i = layoutInfo(builder.current);
    left.current.position.x = damp(left.current.position.x, -i.halfW, 3, dt); right.current.position.x = damp(right.current.position.x, i.halfW, 3, dt);
    ceil.current.position.y = damp(ceil.current.position.y, i.ceil, 3, dt);
    back.current.position.z = damp(back.current.position.z, i.wallZ - 1.2, 3, dt); back.current.scale.x = damp(back.current.scale.x, i.halfW * 2, 3, dt);
    win.current.opacity = damp(win.current.opacity, builder.current.lighting === 'daylight' ? 0.9 : 0.05, 3, dt);
  });
  const band: [number, number, number][] = [[-2.2, STAGE_TOP, info.wallZ + 2.4], [0, STAGE_TOP, info.wallZ + 1.8], [2.4, STAGE_TOP, info.wallZ + 2.6], [1.1, STAGE_TOP, info.wallZ + 3.4]];
  return <group ref={g}><group ref={room}>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 4]}><planeGeometry args={[80, 60]} /><meshStandardMaterial color="#121318" roughness={0.6} metalness={0.2} /></mesh>
    <mesh position={[0, STAGE_TOP / 2, info.wallZ + 2]}><boxGeometry args={[info.halfW * 1.6, STAGE_TOP, 7]} /><meshStandardMaterial color="#0d0e12" roughness={0.35} metalness={0.4} /></mesh>
    {[0, 1, 2].map(i => <mesh key={i} position={[0, STAGE_TOP * (0.25 + i * 0.25) / 1 - STAGE_TOP * 0.125, info.wallZ + 5.5 + (2 - i) * 0.35]}><boxGeometry args={[4, STAGE_TOP * 0.25 * (i + 1), 0.35]} /><meshStandardMaterial color="#16181e" /></mesh>)}
    <mesh ref={back} position={[0, 6, info.wallZ - 1.2]}><boxGeometry args={[1, 14, 0.2]} /><meshStandardMaterial color="#0a0b0e" roughness={0.9} /></mesh>
    <mesh ref={left} position={[-info.halfW, 6, 4]} rotation-y={Math.PI / 2}><planeGeometry args={[40, 14]} /><meshStandardMaterial color="#0c0d11" side={THREE.DoubleSide} /></mesh>
    <mesh ref={right} position={[info.halfW, 6, 4]} rotation-y={-Math.PI / 2}><planeGeometry args={[40, 14]} /><meshStandardMaterial color="#0c0d11" side={THREE.DoubleSide} />
      <mesh position={[0, -1, 0.02]}><planeGeometry args={[18, 4]} /><meshBasicMaterial ref={win} color="#cfe0ff" transparent opacity={0.05} /></mesh></mesh>
    <group ref={ceil} position={[0, info.ceil, 0]}><mesh position={[0, 0, info.wallZ + 3]}><boxGeometry args={[info.halfW * 1.7, 0.25, 0.25]} /><meshStandardMaterial color="#2a2c33" metalness={0.8} roughness={0.3} /></mesh></group>
    <Seats info={info} />
    {band.map((p, i) => <Figure key={i} position={p} color="#07080b" />)}
    {(mobile ? [-3, 3] : [-6, -2, 2, 6]).map((x, i) => <MovingHead key={i} x={x * info.k} phase={i * 1.3} info={info} colorful={s.lighting === 'worship'} />)}
    <Haze count={mobile ? 3 : 7} />
  </group></group>;
}

function Outdoor({ active }: { active: boolean }) {
  const s = useBuilder(); const info = layoutInfo(s); const g = useGrow(active);
  const sun = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { const l = builder.current.lighting; const y = l === 'midday' ? 40 : l === 'sunset' ? 4 : -10; sun.current.position.y = damp(sun.current.position.y, y, 1.5, dt); sun.current.position.x = damp(sun.current.position.x, l === 'midday' ? 10 : -30, 1.5, dt); });
  const audience = useMemo(() => Array.from({ length: 40 }, (_, i) => [((i * 7.31) % 16) - 8, 0, 3 + ((i * 3.7) % 12)] as [number, number, number]), []);
  return <group ref={g}>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 5]}><planeGeometry args={[160, 120]} /><meshStandardMaterial color="#14301c" roughness={1} /></mesh>
    <mesh position={[0, STAGE_TOP / 2, info.wallZ + 2]}><boxGeometry args={[Math.max(14, info.W + 6), STAGE_TOP, 8]} /><meshStandardMaterial color="#111216" /></mesh>
    <mesh position={[0, info.ceil + 0.2, info.wallZ + 2]}><boxGeometry args={[Math.max(15, info.W + 7), 0.3, 9]} /><meshStandardMaterial color="#1c1e24" metalness={0.7} roughness={0.4} /></mesh>
    {[-1, 1].map(sx => [-2, 6].map(dz => <mesh key={`${sx}${dz}`} position={[sx * Math.max(7, info.W / 2 + 3.2), info.ceil / 2, info.wallZ + dz * 0.5 + 0.5]}><boxGeometry args={[0.3, info.ceil, 0.3]} /><meshStandardMaterial color="#2a2c33" metalness={0.8} /></mesh>))}
    <mesh ref={sun} position={[10, 40, -80]}><sphereGeometry args={[4, 24, 24]} /><meshBasicMaterial color="#fff2c8" toneMapped={false} /></mesh>
    {[[-25, 22, -60], [18, 26, -70], [40, 18, -50], [-45, 15, -40]].map((p, i) => <group key={i} position={p as [number, number, number]}>{[0, 1, 2].map(j => <mesh key={j} position={[j * 3 - 3, (j % 2) * 1.2, 0]}><sphereGeometry args={[3 - (j % 2), 12, 12]} /><meshStandardMaterial color="#e8edf5" roughness={1} transparent opacity={0.85} /></mesh>)}</group>)}
    {audience.map((p, i) => <Figure key={i} position={p} color="#0a0b0f" h={1.6 + (i % 3) * 0.1} />)}
  </group>;
}

/** Particle burst when switching venues. */
function Dissolve() {
  const s = useBuilder(); const ref = useRef<THREE.Points>(null!); const mat = useRef<THREE.PointsMaterial>(null!);
  const N = 900;
  const { geo, vel } = useMemo(() => { const p = new Float32Array(N * 3), v = new Float32Array(N * 3); for (let i = 0; i < N; i++) { v[i * 3] = (Math.random() - 0.5) * 6; v[i * 3 + 1] = Math.random() * 3; v[i * 3 + 2] = (Math.random() - 0.5) * 6; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return { geo: g, vel: v }; }, []);
  useEffect(() => { if (!s.venueChangedAt) return; const p = geo.attributes['position']!.array as Float32Array; for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 24; p[i * 3 + 1] = Math.random() * 8; p[i * 3 + 2] = (Math.random() - 0.5) * 20; } geo.attributes['position']!.needsUpdate = true; }, [s.venueChangedAt, geo]);
  useFrame((_, dt) => { const age = (performance.now() - builder.current.venueChangedAt) / 1000; mat.current.opacity = Math.max(0, 1 - age / 1.6); ref.current.visible = mat.current.opacity > 0; if (!ref.current.visible) return; const p = geo.attributes['position']!.array as Float32Array; for (let i = 0; i < N * 3; i++) p[i] = p[i]! + vel[i]! * dt; geo.attributes['position']!.needsUpdate = true; });
  return <points ref={ref} geometry={geo}><pointsMaterial ref={mat} color="#5b9dff" size={0.07} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

/* ---------------- rigging, extras, overlay ---------------- */
function Rigging() {
  const s = useBuilder(); const i = layoutInfo(s); const flown = s.mount === 'flown';
  const cab = useRef<THREE.Group>(null!), frames = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { cab.current.scale.y = damp(cab.current.scale.y, flown ? 1 : 0.001, 3, dt); frames.current.scale.y = damp(frames.current.scale.y, flown ? 0.001 : 1, 3, dt); });
  const xs = [-1, -0.33, 0.33, 1].map(f => f * (i.W / 2 - 0.3));
  const topY = i.base + i.H, cableLen = Math.max(0.5, i.ceil - topY);
  return <group>
    <group ref={cab} position={[0, i.ceil, i.wallZ]}>{xs.map((x, j) => <mesh key={j} position={[x, -cableLen / 2, 0]}><cylinderGeometry args={[0.012, 0.012, cableLen, 6]} /><meshStandardMaterial color="#9aa3b5" metalness={1} roughness={0.2} /></mesh>)}
      <mesh position={[0, -cableLen, 0]}><boxGeometry args={[i.W, 0.08, 0.12]} /><meshStandardMaterial color="#3a3d45" metalness={0.8} /></mesh></group>
    <group ref={frames} position={[0, STAGE_TOP, i.wallZ - 0.15]}>{xs.map((x, j) => <mesh key={j} position={[x, (i.base - STAGE_TOP) / 2, 0]}><boxGeometry args={[0.12, i.base - STAGE_TOP, 0.5]} /><meshStandardMaterial color="#2a2c33" metalness={0.8} roughness={0.3} /></mesh>)}
      <mesh position={[0, i.base - STAGE_TOP, 0]}><boxGeometry args={[i.W, 0.06, 0.4]} /><meshStandardMaterial color="#2a2c33" metalness={0.8} /></mesh></group>
  </group>;
}

function Extra({ on, position, children }: { on: boolean; position: [number, number, number]; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!); const vel = useRef(0);
  useFrame((_, dt) => { const target = on ? 1 : 0; vel.current += (target - g.current.scale.x) * 180 * dt; vel.current *= Math.exp(-12 * dt); const v = Math.max(0.0001, g.current.scale.x + vel.current * dt); g.current.scale.setScalar(v); g.current.visible = v > 0.01; });
  return <group ref={g} position={position} scale={0.0001}>{children}<pointLight color="#2b7fff" intensity={on ? 3 : 0} distance={3} /></group>;
}
function Extras() {
  const s = useBuilder(); const i = layoutInfo(s); const has = (id: string) => s.extras.includes(id); const x = Math.min(i.halfW - 1.2, i.W / 2 + 2), y = STAGE_TOP, z = i.wallZ + 3.2;
  const glow = <meshStandardMaterial color="#2b7fff" emissive="#2b7fff" emissiveIntensity={2} toneMapped={false} />;
  return <group>
    <Extra on={has('processor')} position={[x, y, z]}><mesh position={[0, 0.5, 0]}><boxGeometry args={[0.6, 1, 0.6]} /><meshStandardMaterial color="#1b1d22" metalness={0.6} /></mesh>{[0.3, 0.5, 0.7].map(h => <mesh key={h} position={[0, h, 0.305]}><boxGeometry args={[0.5, 0.04, 0.01]} />{glow}</mesh>)}</Extra>
    <Extra on={has('spares')} position={[x - 1.1, y, z + 0.6]}><mesh position={[0, 0.3, 0]}><boxGeometry args={[0.9, 0.6, 0.55]} /><meshStandardMaterial color="#26282e" roughness={0.6} /></mesh><mesh position={[0, 0.3, 0.28]}><boxGeometry args={[0.92, 0.04, 0.01]} />{glow}</mesh></Extra>
    <Extra on={has('install')} position={[-x, y, z]}><mesh position={[0, 0.9, 0]}><boxGeometry args={[0.08, 1.8, 0.5]} /><meshStandardMaterial color="#555b66" metalness={0.8} /></mesh><mesh position={[0, 1.85, 0]}><boxGeometry args={[0.7, 0.1, 0.6]} />{glow}</mesh></Extra>
    <Extra on={has('training')} position={[-x + 1.1, y, z + 0.6]}><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 1]} /><meshStandardMaterial color="#555" /></mesh><mesh position={[0, 1.1, 0]}><boxGeometry args={[0.7, 0.42, 0.04]} />{glow}</mesh></Extra>
    <Extra on={has('support')} position={[x - 0.4, y + 1.6, z]}><mesh><torusGeometry args={[0.22, 0.05, 12, 32]} />{glow}</mesh></Extra>
  </group>;
}

function Dimensions() {
  const s = useBuilder(); const i = layoutInfo(s); const w = useRef<THREE.Mesh>(null!), h = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { const on = builder.current.dims; w.current.scale.x = damp(w.current.scale.x, on ? 1 : 0.0001, 4, dt); h.current.scale.y = damp(h.current.scale.y, on ? 1 : 0.0001, 4, dt); });
  const z = i.wallZ + (s.layout === 'curved' ? 1.5 : 0.2), mat = <meshBasicMaterial color="#5b9dff" toneMapped={false} />;
  const ft = (m: number) => `${(m / 0.3048).toFixed(1)} ft`;
  return <group>
    <mesh ref={w} position={[0, i.base - 0.3, z]}><boxGeometry args={[i.W, 0.025, 0.025]} />{mat}</mesh>
    <mesh ref={h} position={[i.W / 2 + 0.35, i.base + i.H / 2, z]}><boxGeometry args={[0.025, i.H, 0.025]} />{mat}</mesh>
    {s.dims && <>
      <Html position={[0, i.base - 0.55, z]} center zIndexRange={[4, 0]} className="dim-label">{ft(i.W)}</Html>
      <Html position={[i.W / 2 + 0.9, i.base + i.H / 2, z]} center zIndexRange={[4, 0]} className="dim-label">{ft(i.H)}</Html>
      <Figure position={[i.W / 2 + 1.2, STAGE_TOP, i.wallZ + 0.8]} color="#5b9dff" />
      <Html position={[i.W / 2 + 1.2, STAGE_TOP + 2.05, i.wallZ + 0.8]} center zIndexRange={[4, 0]} className="dim-label">5′9″</Html>
    </>}
  </group>;
}

/** Empty grid cells shown as outlines while editing; click to fill them back in. */
function Ghosts() {
  const s = useBuilder(); const ref = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => new THREE.PlaneGeometry(CAB * 0.92, CAB * 0.92).translate(0, 0, 0.02), []);
  const m = useMemo(() => new THREE.Matrix4(), []), col = useMemo(() => new THREE.Color(), []);
  const holes = s.step === 2 ? s.holes : [];
  useEffect(() => {
    const all = targets(builder.current, true); let n = 0; const ids: number[] = [];
    for (const h of holes) { const [c, r] = h.split(':').map(Number) as [number, number]; const t = all[slotOf(c, r)]; if (!t) continue;
      m.makeRotationY(t.ry); m.setPosition(t.p); ref.current.setMatrixAt(n, m); ref.current.setColorAt(n, col.set(s.hover === `g${slotOf(c, r)}` ? '#5b9dff' : '#1d3a73')); ids.push(slotOf(c, r)); n++; }
    ref.current.count = n; ref.current.userData['ids'] = ids; ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [holes, s.cols, s.rows, s.layout, s.mount, s.room, s.hover, m, col]);
  const idOf = (i?: number) => (i === undefined ? -1 : (ref.current.userData['ids'] as number[])[i] ?? -1);
  return <instancedMesh ref={ref} args={[geo, undefined, 288]} frustumCulled={false}
    onPointerMove={ev => { ev.stopPropagation(); const id = idOf(ev.instanceId); if (id >= 0 && builder.current.hover !== `g${id}`) setBuilder({ hover: `g${id}` }); document.body.style.cursor = 'copy'; }}
    onPointerOut={() => { setBuilder({ hover: '' }); document.body.style.cursor = ''; }}
    onClick={ev => { if (ev.delta > 6) return; ev.stopPropagation(); const id = idOf(ev.instanceId); if (id >= 0) setCell(id % GRID_W, Math.floor(id / GRID_W), true); }}>
    <meshBasicMaterial transparent opacity={0.45} toneMapped={false} depthWrite={false} />
  </instancedMesh>;
}

/** +/- controls on every edge of the wall, plus a corner drag handle (size step). */
function Handles() {
  const s = useBuilder(); const i = layoutInfo(s);
  if (s.step !== 2 || !s.introDone) return null;
  const drag = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation(); const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, c0 = builder.current.cols, r0 = builder.current.rows, step = 26;
    const move = (ev: PointerEvent) => {
      const cols = THREE.MathUtils.clamp(c0 + Math.round(((ev.clientX - sx) / step) * 2), sizeLimits.minCols, sizeLimits.maxCols);
      const rows = THREE.MathUtils.clamp(r0 + Math.round((sy - ev.clientY) / step), sizeLimits.minRows, sizeLimits.maxRows);
      if (cols !== builder.current.cols || rows !== builder.current.rows) setBuilder({ cols, rows });
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  };
  const z = i.wallZ + (s.layout === 'curved' ? 0.6 : 0.1), half = s.layout === 'curved' ? i.W * 0.45 : i.W / 2;
  const Edge = ({ pos, label, onAdd, onRemove, vertical }: { pos: [number, number, number]; label: string; onAdd: () => void; onRemove: () => void; vertical?: boolean }) =>
    <Html position={pos} center zIndexRange={[4, 0]}><div className={`edge-ctl ${vertical ? 'v' : ''}`} onPointerDown={e => e.stopPropagation()}>
      <button type="button" aria-label={`Add ${label}`} onClick={onAdd}>+</button><button type="button" aria-label={`Remove ${label}`} onClick={onRemove}>−</button></div></Html>;
  return <>
    <Edge pos={[half + 0.45, i.base + i.H / 2, z]} vertical label="column on the right" onAdd={() => addCol('right')} onRemove={() => removeCol('right')} />
    <Edge pos={[-half - 0.45, i.base + i.H / 2, z]} vertical label="column on the left" onAdd={() => addCol('left')} onRemove={() => removeCol('left')} />
    <Edge pos={[0, i.base + i.H + 0.35, z]} label="row on top" onAdd={() => addRow('top')} onRemove={() => removeRow('top')} />
    <Edge pos={[0, i.base - 0.35, z]} label="row on the bottom" onAdd={() => addRow('bottom')} onRemove={() => removeRow('bottom')} />
    <Html position={[half + 0.1, i.base + i.H + 0.1, z]} center zIndexRange={[4, 0]}><button type="button" className="wall-handle c" aria-label="Drag to resize" onPointerDown={drag} /></Html>
  </>;
}

/* ---------------- lighting & sky ---------------- */
const LIGHT: Record<string, { bg: string; amb: number; hemi: number; sun: number; fog: number }> = {
  house: { bg: '#15171c', amb: 0.9, hemi: 0.6, sun: 0.4, fog: 0.02 }, dim: { bg: '#0b0c10', amb: 0.35, hemi: 0.25, sun: 0.1, fog: 0.025 },
  worship: { bg: '#040507', amb: 0.12, hemi: 0.08, sun: 0, fog: 0.03 }, daylight: { bg: '#1b1e25', amb: 0.8, hemi: 0.8, sun: 1.6, fog: 0.015 },
  midday: { bg: '#7fb2ec', amb: 0.9, hemi: 1.1, sun: 2.4, fog: 0.006 }, sunset: { bg: '#d9805a', amb: 0.45, hemi: 0.6, sun: 1.2, fog: 0.01 },
  night: { bg: '#05070f', amb: 0.12, hemi: 0.1, sun: 0, fog: 0.012 },
};
function Lighting() {
  const { scene } = useThree(); const amb = useRef<THREE.AmbientLight>(null!), hemi = useRef<THREE.HemisphereLight>(null!), sun = useRef<THREE.DirectionalLight>(null!);
  const bg = useMemo(() => new THREE.Color('#000'), []), tmp = useMemo(() => new THREE.Color(), []);
  useEffect(() => { scene.background = bg; scene.fog = new THREE.FogExp2(bg, 0.02); }, [scene, bg]);
  useFrame((_, dt) => {
    const b = builder.current, L = LIGHT[b.lighting] ?? LIGHT['worship']!, intro = !b.introDone;
    tmp.set(intro ? '#000' : L.bg); bg.lerp(tmp, 1 - Math.exp(-2 * dt)); (scene.fog as THREE.FogExp2).color.copy(bg); (scene.fog as THREE.FogExp2).density = damp((scene.fog as THREE.FogExp2).density, L.fog, 2, dt);
    amb.current.intensity = damp(amb.current.intensity, intro ? 0 : L.amb, 2, dt); hemi.current.intensity = damp(hemi.current.intensity, intro ? 0 : L.hemi, 2, dt); sun.current.intensity = damp(sun.current.intensity, intro ? 0 : L.sun, 2, dt);
    sun.current.color.set(b.lighting === 'sunset' ? '#ffb27a' : '#fff4e0'); sun.current.position.set(b.lighting === 'sunset' ? -30 : b.venue === 'outdoor' ? 10 : 20, b.lighting === 'sunset' ? 5 : 30, b.venue === 'outdoor' ? -20 : 5);
  });
  return <><ambientLight ref={amb} intensity={0} /><hemisphereLight ref={hemi} args={['#9fb8ff', '#101015', 0]} /><directionalLight ref={sun} intensity={0} /></>;
}

/* ---------------- camera ---------------- */
export function cameraPose(id: string, s: BuilderState): { pos: THREE.Vector3; tgt: THREE.Vector3 } {
  const i = layoutInfo(s); const C = new THREE.Vector3(0, i.base + i.H / 2, i.wallZ); const fit = Math.max(i.W, i.H * 1.8);
  const mid = (i.seatStart + i.seatEnd) / 2;
  switch (id) {
    case 'center': return { pos: new THREE.Vector3(0, 2.1, Math.max(mid, i.wallZ + fit * 1.1)), tgt: C };
    case 'stage': return { pos: new THREE.Vector3(-2.6, STAGE_TOP + 1.7, i.wallZ + 4.5), tgt: C.clone().add(new THREE.Vector3(0.6, 0, 0)) };
    case 'aerial': return { pos: new THREE.Vector3(0, 9 * i.k + i.H, i.seatEnd + 2), tgt: C.clone().setY(i.base) };
    case 'side': return { pos: new THREE.Vector3(i.halfW - 1.5, 3.2, i.wallZ + 5 + fit * 0.3), tgt: C };
    case 'distance': return { pos: new THREE.Vector3(0, C.y, i.wallZ + s.viewingFt * 0.3048), tgt: C };
    case 'intro': return { pos: new THREE.Vector3(0, i.base + 1.5, i.wallZ + 2.4), tgt: new THREE.Vector3(0, i.base + 1.5, i.wallZ) };
    default: return { pos: new THREE.Vector3(0, 3.6, Math.max(i.seatEnd + 1.5, i.wallZ + fit * 1.4)), tgt: C };
  }
}

function CameraRig({ controls }: { controls: React.RefObject<any> }) {
  const { camera } = useThree();
  const tw = useRef({ from: new THREE.Vector3(), to: new THREE.Vector3(), ft: new THREE.Vector3(), tt: new THREE.Vector3(), t0: 0, dur: 1.6, active: false });
  const lastKey = useRef(''); const lastInput = useRef(performance.now()); const shake = useRef(0); const introPulled = useRef(false);
  const start = (id: string, dur: number) => {
    const p = cameraPose(id, builder.current); const t = tw.current; const c = controls.current;
    t.from.copy(camera.position); t.ft.copy(c ? c.target : p.tgt); t.to.copy(p.pos); t.tt.copy(p.tgt); t.t0 = performance.now(); t.dur = dur; t.active = true;
  };
  useEffect(() => {
    const p = cameraPose('intro', builder.current); camera.position.copy(p.pos); controls.current?.target.copy(p.tgt);
    const mark = () => { lastInput.current = performance.now(); };
    window.addEventListener('pointerdown', mark); window.addEventListener('wheel', mark, { passive: true });
    return () => { window.removeEventListener('pointerdown', mark); window.removeEventListener('wheel', mark); };
  }, [camera, controls]);
  useFrame(() => {
    const b = builder.current, c = controls.current; if (!c) return;
    if (!b.introDone && !introPulled.current) { if (performance.now() - (tw.current.t0 || 0) > 0 && !tw.current.active && performance.now() > 1300 + (window as any).__builderT0) { introPulled.current = true; start('back', 2.2); } }
    if (b.introDone) introPulled.current = true;
    const id = b.step === 1 ? 'distance' : b.camera;
    const key = b.introDone ? `${id}|${b.cameraNonce}|${id === 'distance' ? b.viewingFt : ''}|${b.cols}x${b.rows}|${b.room}|${b.layout}|${b.mount}|${b.venue}` : '';
    if (key && key !== lastKey.current) { const quick = id === 'distance' && lastKey.current.startsWith('distance'); start(id, quick ? 0.6 : 1.6); lastKey.current = key; lastInput.current = performance.now(); }
    const t = tw.current;
    if (t.active) {
      const p = Math.min(1, (performance.now() - t.t0) / (t.dur * 1000)); const e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
      camera.position.lerpVectors(t.from, t.to, e); camera.position.y += Math.sin(p * Math.PI) * 0.8 * (t.dur > 1 ? 1 : 0);
      c.target.lerpVectors(t.ft, t.tt, e); if (p >= 1) t.active = false;
    }
    const sh = Math.max(0, 1 - (performance.now() - b.shakeAt) / 250); if (sh > 0) { shake.current = sh; camera.position.x += (Math.random() - 0.5) * 0.04 * sh; camera.position.y += (Math.random() - 0.5) * 0.04 * sh; }
    c.autoRotate = b.step === 8 || (!t.active && performance.now() - lastInput.current > 7000 && b.introDone);
    c.autoRotateSpeed = b.step === 8 ? 0.8 : 0.25;
    c.enabled = !t.active && b.introDone && !b.playing;
    c.update();
  });
  return null;
}

function Parallax({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ pointer }, dt) => { g.current.rotation.y = damp(g.current.rotation.y, pointer.x * 0.015, 3, dt); g.current.rotation.x = damp(g.current.rotation.x, -pointer.y * 0.008, 3, dt); });
  return <group ref={g}>{children}</group>;
}

/** Shifts the picture left on desktop so the wall is centered in the space beside the side panel. */
function PanelOffset({ mobile }: { mobile: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => { const cam = camera as THREE.PerspectiveCamera; const off = mobile ? 0 : 400; if (off) cam.setViewOffset(size.width + off, size.height, off, 0, size.width, size.height); else cam.clearViewOffset(); cam.updateProjectionMatrix(); }, [camera, size, mobile]);
  return null;
}
function ReadyMark() { useEffect(() => { setBuilder({ ready: true }); }, []); return null; }

export default function BuilderScene({ mobile }: { mobile: boolean }) {
  const s = useBuilder(); const controls = useRef<any>(null);
  const [envOn, setEnvOn] = useState(false);
  useEffect(() => { (window as any).__builderT0 = performance.now(); const t = setTimeout(() => setEnvOn(true), 1400); return () => clearTimeout(t); }, []);
  const i = layoutInfo(s);
  return <Canvas dpr={[1, mobile ? 1.25 : 1.5]} camera={{ fov: mobile ? 55 : 42, near: 0.1, far: 300 }} gl={{ antialias: !mobile, powerPreference: 'high-performance' }}>
    <ReadyMark />
    <PanelOffset mobile={mobile} />
    <Lighting />
    <Parallax>
      <Wall lowPower={mobile} />
      <Indoor active={s.venue === 'indoor' && (s.introDone || envOn)} mobile={mobile} />
      <Outdoor active={s.venue === 'outdoor' && (s.introDone || envOn)} />
      <Dissolve />
      <Rigging />
      <Extras />
      <Dimensions />
      <Handles />
    </Parallax>
    <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={2} maxDistance={Math.max(40, i.W * 3)} maxPolarAngle={Math.PI * 0.49} />
    <CameraRig controls={controls} />
    {!mobile && <EffectComposer multisampling={0}><Bloom mipmapBlur intensity={0.35 + (s.brightness / 1200) * 0.9} luminanceThreshold={0.75} luminanceSmoothing={0.2} /></EffectComposer>}
  </Canvas>;
}

export { contents };
