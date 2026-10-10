import * as THREE from 'three';

/** Uniforms shared by every LED surface so the whole wall stays in sync. */
export const ledShared = {
  uTime: { value: 0 },
  uPower: { value: 0 },
  uPulse: { value: 0 },
  uPulsePos: { value: -1 },
};

const vertexShader = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const fragmentShader = /* glsl */ `
uniform float uTime, uPower, uPulse, uPulsePos, uCells, uFlash;
uniform vec2 uOffset, uScale, uBase, uSpan;
varying vec2 vUv;
void main(){
  vec2 local = uOffset + vUv * uScale;      // 0..1 across one cabinet
  vec2 g = uBase + local * uSpan;           // 0..1 across the whole wall
  vec2 cuv = local * uCells;
  vec2 id = floor(cuv); vec2 f = fract(cuv);
  float w1 = sin(g.x*7.0 - uTime*1.3 + sin(g.y*5.0 + uTime*0.6)*1.6);
  float w2 = sin(g.y*9.0 + uTime*0.9 + g.x*3.0 - uTime*0.4);
  vec3 base = mix(vec3(0.01,0.05,0.35), vec3(0.15,0.55,1.4), 0.5+0.5*w1);
  base += vec3(0.6,0.8,1.2) * pow(max(0.0,w2), 12.0) * 0.8;
  base *= 0.85 + 0.15*sin(uTime*6.0 + id.x*12.9898 + id.y*78.233);
  float on = smoothstep(g.x - 0.08, g.x, uPower*1.12 - 0.04);
  vec3 dots = vec3(
    (1.0-smoothstep(0.07,0.15,length(f-vec2(0.28,0.5)))),
    (1.0-smoothstep(0.07,0.15,length(f-vec2(0.50,0.5)))),
    (1.0-smoothstep(0.07,0.15,length(f-vec2(0.72,0.5)))));
  vec3 cluster = dots * base * 3.0;
  float px = fwidth(cuv.x);
  float detail = 1.0 - smoothstep(0.12, 0.45, px);
  vec3 col = mix(base*0.75, cluster, detail);
  col += vec3(0.25,0.55,1.6) * exp(-pow((g.x-uPulsePos)*7.0, 2.0)) * uPulse;
  col *= on;
  col += vec3(0.3,0.6,1.5) * uFlash;
  col += vec3(0.012,0.014,0.02);
  gl_FragColor = vec4(col, 1.0);
}`;

type V2 = { value: THREE.Vector2 };
export function makeLedMaterial(o: { offset: [number, number]; scale: [number, number]; base: V2; span: V2; cells: { value: number }; flash?: { value: number }; instanced?: boolean }) {
  return new THREE.ShaderMaterial({
    vertexShader: o.instanced ? `attribute vec4 instanceUv; attribute float instanceFlash; varying vec4 vInstanceUv; varying float vInstanceFlash; varying vec2 vUv;
      void main(){ vUv=uv; vInstanceUv=instanceUv; vInstanceFlash=instanceFlash; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }` : vertexShader,
    fragmentShader: o.instanced ? fragmentShader.replace('varying vec2 vUv;', 'varying vec2 vUv; varying vec4 vInstanceUv; varying float vInstanceFlash;').replace('uBase + local * uSpan', 'vInstanceUv.xy + local * vInstanceUv.zw').replace(' * uFlash;', ' * vInstanceFlash;') : fragmentShader,
    toneMapped: false,
    uniforms: {
      ...ledShared,
      uOffset: { value: new THREE.Vector2(...o.offset) },
      uScale: { value: new THREE.Vector2(...o.scale) },
      uBase: o.base, uSpan: o.span, uCells: o.cells,
      uFlash: o.flash ?? { value: 0 },
    },
  });
}
