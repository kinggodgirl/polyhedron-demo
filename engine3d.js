// three.js 엔진 (시범) — 2D 엔진과 같은 장면을 three.js로 그린다.
// 교과서 겨냥도처럼: 평행 투영 카메라 + 굵은 검은 모서리 + 보이지 않는 모서리는 점선.
// index.html이 체크박스를 켜면 import()로 불러온다. 렌더러는 하나만 두고, 그릴 무대(stage)로 캔버스를 옮겨 다닌다.
import * as THREE from 'three';
import { LineSegments2 } from './vendor/lines/LineSegments2.js';
import { LineSegmentsGeometry } from './vendor/lines/LineSegmentsGeometry.js';
import { LineMaterial } from './vendor/lines/LineMaterial.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.domElement.className = 'gl3d';
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
camera.position.set(0, 0, 10);
scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-0.35, 0.6, 0.72).multiplyScalar(10);   // 2D 엔진의 빛 방향과 같게 (화면 기준)
scene.add(sun);
const root = new THREE.Group(); root.matrixAutoUpdate = false; scene.add(root);
const boxG = new THREE.Group(); boxG.matrixAutoUpdate = false; root.add(boxG);

const ballMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), ballMat, 96);
balls.count = 0; balls.frustumCulled = false; root.add(balls);

const cache = new WeakMap();
const srgb = (c, k = 1) => new THREE.Color().setRGB(c[0] / 255 * k, c[1] / 255 * k, c[2] / 255 * k, THREE.SRGBColorSpace);
const cssColor = (s) => new THREE.Color(s);

function lineMat(opts) {
  const m = new LineMaterial(Object.assign({ color: 0x000000, linewidth: 3, worldUnits: false }, opts));
  return m;
}
function build(M) {
  // 면: 꼭짓점 색으로 칠한다 (M.tint면 주황, 아니면 파랑 계열은 그릴 때 색을 바꾸므로 여기서는 흰색 + 칸별 표시만)
  const pos = [], nor = [], tint = [];
  M.F.forEach((f, i) => {
    const vn = M.VN && M.VN[i];
    for (let k = 1; k < f.length - 1; k++) {
      [0, k, k + 1].forEach((j) => {
        const v = M.V[f[j]]; pos.push(v[0], v[1], v[2]);
        const n = vn ? vn[j] : M.N[i]; nor.push(n[0], n[1], n[2]);
        tint.push(M.tint && M.tint[i] ? 1 : 0);
      });
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(tint.length * 3).fill(1), 3));
  const front = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const back = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const vis = new LineSegments2(new LineSegmentsGeometry(), lineMat({}));
  const hid = new LineSegments2(new LineSegmentsGeometry(), lineMat({ dashed: true, depthTest: false }));
  const rim = new LineSegments2(new LineSegmentsGeometry(), lineMat({ dashed: true, depthTest: false }));
  hid.renderOrder = 5; rim.renderOrder = 6; vis.renderOrder = 4;
  const rimE = M.E.filter((e) => e.f.length < 2);
  if (rimE.length) { rim.geometry.setPositions(segs(M, rimE)); rim.computeLineDistances(); }
  const obj = { g, tint, front, back, vis, hid, rim, hasRim: rimE.length > 0, key: '', colorKey: '' };
  [front, back, vis, hid, rim].forEach((o) => { o.frustumCulled = false; });
  cache.set(M, obj);
  return obj;
}
function segs(M, list) { const a = []; list.forEach((e) => { const p = M.V[e.a], q = M.V[e.b]; a.push(p[0], p[1], p[2], q[0], q[1], q[2]); }); return a; }
function mat4From3(m) { return new THREE.Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1); }

let current = null;
// spec: { M, mat(3×3), frac, lw, col, c, R, T(4×4 배열, 상자 변환), balls:[[x,y,z]…], r, glass }
export function draw(cv, spec) {
  const box = cv._box; if (!box) return false;
  const W = cv._w, H = cv._h, d = cv._d;
  if (renderer.domElement.parentNode !== box) box.insertBefore(renderer.domElement, cv);
  renderer.domElement.style.display = '';
  if (renderer.getPixelRatio() !== d) renderer.setPixelRatio(d);
  const sz = renderer.getSize(new THREE.Vector2());
  if (sz.x !== W || sz.y !== H) renderer.setSize(W, H, false);
  const M = spec.M, c = spec.c || M.c, R = spec.R || M.R, col = spec.col;
  const sc = Math.min(W, H) * spec.frac / R;
  camera.left = -W / 2 / sc; camera.right = W / 2 / sc; camera.top = H / 2 / sc; camera.bottom = -H / 2 / sc; camera.updateProjectionMatrix();
  const Rv = mat4From3(spec.mat);
  root.matrix.copy(Rv).multiply(new THREE.Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
  boxG.matrix.copy(spec.T ? new THREE.Matrix4().fromArray(spec.T).transpose() : new THREE.Matrix4());
  root.matrixWorldNeedsUpdate = true;

  const o = cache.get(M) || build(M);
  if (current && current !== o) [current.front, current.back, current.vis, current.hid, current.rim].forEach((x) => boxG.remove(x));
  if (current !== o) { [o.front, o.back, o.vis, o.hid, o.rim].forEach((x) => boxG.add(x)); current = o; }

  // 색 (테마가 바뀌어도 맞게)
  const ck = col.base.join() + col.alt.join() + col.fg + (spec.glass ? 'g' : '');
  if (o.colorKey !== ck) {
    const a = o.g.attributes.color, cb = srgb(col.base), ca = srgb(col.alt);
    for (let i = 0; i < o.tint.length; i++) { const cc = o.tint[i] ? ca : cb; a.setXYZ(i, cc.r, cc.g, cc.b); }
    a.needsUpdate = true;
    o.back.material.color.setScalar(M.box ? 0.45 : 0.72);
    [o.front.material, o.back.material].forEach((m) => { m.transparent = !!spec.glass; m.opacity = spec.glass ? 0.28 : 1; m.depthWrite = !spec.glass; });
    o.front.renderOrder = o.back.renderOrder = spec.glass ? 3 : 0;
    o.vis.material.color = cssColor(col.fg); o.hid.material.color = cssColor(col.fg); o.rim.material.color = cssColor(col.bad);
    ballMat.color = srgb(col.alt);
    o.colorKey = ck;
  }
  o.back.visible = !!(M.open || spec.glass);

  // 모서리: 볼록한 닫힌 입체는 "양쪽 면이 모두 뒤를 향하면 숨은 선(점선)", 열린 입체는 모두 실선(앞벽에 가리면 안 보임)
  const nm = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(Rv).multiply(boxG.matrix));
  const v = new THREE.Vector3();
  const front = M.N.map((n) => v.set(n[0], n[1], n[2]).applyMatrix3(nm).z > 0);
  const visE = [], hidE = [];
  M.E.forEach((e) => {
    if (!e.sharp) return;
    if (M.open) { visE.push(e); return; }
    (e.f.some((g) => front[g]) ? visE : hidE).push(e);
  });
  const key = visE.length + ':' + hidE.map((e) => e.a + '-' + e.b).join(',');
  if (key !== o.key) {
    o.vis.geometry.dispose(); o.vis.geometry = new LineSegmentsGeometry(); if (visE.length) o.vis.geometry.setPositions(segs(M, visE));
    o.hid.geometry.dispose(); o.hid.geometry = new LineSegmentsGeometry(); if (hidE.length) { o.hid.geometry.setPositions(segs(M, hidE)); o.hid.computeLineDistances(); }
    o.vis.visible = visE.length > 0; o.hid.visible = hidE.length > 0;
    o.key = key;
  }
  const px = 1 / sc;   // 화면 1px = 모델 단위 px
  o.vis.material.linewidth = spec.lw; o.hid.material.linewidth = spec.lw * 0.8; o.rim.material.linewidth = spec.lw * 1.7;
  o.hid.material.dashSize = 7 * px; o.hid.material.gapSize = 6 * px;
  o.rim.material.dashSize = 10 * px; o.rim.material.gapSize = 7 * px;
  o.rim.visible = o.hasRim && !!M.box && spec.rim !== false;
  [o.vis, o.hid, o.rim].forEach((l) => l.material.resolution.set(W, H));

  // 공
  const B = spec.balls || [];
  balls.count = Math.min(B.length, 96);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < balls.count; i++) { const b = B[i]; m4.makeScale(spec.r * 0.96, spec.r * 0.96, spec.r * 0.96)   // 벽에 닿은 공이 벽 밖으로 비치지 않게 살짝 작게
      .setPosition(b[0], b[1], b[2]); balls.setMatrixAt(i, m4); }
  balls.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
  return true;
}
export function hide() { renderer.domElement.style.display = 'none'; }
export const REVISION = THREE.REVISION;
