// 회전체 3차시 — 장면과 도형. 공통 엔진(core.js)을 그대로 쓴다.
// 흐름: 각기둥의 옆면을 늘리면? (층마다 다각형 → 층마다 원) → 평면도형을 돌려서 만들기 → 뜻과 용어(회전축 · 모선)
//       → 어떤 회전체가 생길까(예측) → 거꾸로(회전체 → 평면도형) → 단면 두 가지 → 정리 → 도전

var LESSON3_PAGE = '교과서 P. 215 ~ 217';   // ← 교과서 쪽수가 다르면 여기만 고치면 돼요

// ================= 돌리는 평면도형 (r, y): r은 회전축에서 떨어진 거리, 반시계 방향 =================
function arcPts(cx, cy, r, a0, a1, n) { var p = []; for (var k = 0; k <= n; k++) { var a = a0 + (a1 - a0) * k / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
var PROF = {
  rect: { shape: '직사각형', solid: '원기둥', pts: [[0, -0.95], [0.9, -0.95], [0.9, 0.95], [0, 0.95]], mo: [1] },
  tri: { shape: '직각삼각형', solid: '원뿔', pts: [[0, -0.95], [1, -0.95], [0, 0.95]], mo: [1] },
  trap: { shape: '직각사다리꼴', solid: '원뿔대', pts: [[0, -0.85], [1.05, -0.85], [0.5, 0.85], [0, 0.85]], mo: [1] },
  semi: { shape: '반원', solid: '구', pts: arcPts(0, 0, 1.05, -Math.PI / 2, Math.PI / 2, 40), mo: [] },
  quarter: { shape: '사분원', solid: '반구', pts: [[0, -0.5]].concat(arcPts(0, -0.5, 1.15, 0, Math.PI / 2, 30)), mo: [] },
  hole: { shape: '축에서 떨어진 직사각형', solid: '가운데가 뚫린 원기둥', pts: [[0.45, -0.85], [1.05, -0.85], [1.05, 0.85], [0.45, 0.85]], mo: [1, 3] },
  kite: { shape: '축에 한 변이 붙은 삼각형', solid: '원뿔 두 개를 붙인 모양', pts: [[0, -1.05], [0.85, 0], [0, 1.05]], mo: [0, 1] },
  donut: { shape: '축에서 떨어진 원', solid: '도넛 모양 (원환체)', pts: arcPts(0.72, 0, 0.38, -Math.PI, Math.PI, 36).slice(0, 36), mo: [] },
  cup: { shape: 'ㄴ자 모양', solid: '컵 모양', pts: [[0, -0.95], [1, -0.95], [1, 0.95], [0.78, 0.95], [0.78, -0.7], [0, -0.7]], mo: [1, 3] },
  capsule: { shape: '직사각형 + 사분원', solid: '원기둥 위에 반구', pts: [[0, -1.05], [0.72, -1.05], [0.72, 0.3]].concat(arcPts(0, 0.3, 0.72, 0, Math.PI / 2, 20).slice(1)), mo: [1] },
  semiR: { shape: '반원 (지름이 축)', solid: '구', pts: arcPts(0, 0, 1.05, -Math.PI / 2, Math.PI / 2, 40), mo: [] }
};
Object.keys(PROF).forEach(function (k) { var P = PROF[k], R = 0; P.pts.forEach(function (p) { R = Math.max(R, Math.hypot(p[0], p[1])); }); P.R = R * 1.04; P.key = k; });

// 평면도형을 회전축(y축) 둘레로 a0부터 theta만큼 돌린 입체. full이면 닫힌 회전체, 아니면 돌린 자리의 단면(처음 · 끝)을 함께 그린다
// tintEdge(i): 도형의 i번째 변이 만드는 면을 따로 칠할지 (단면 표시용)
function sweepMesh(pts, theta, a0, seg, R, tintEdge) {
  var full = theta >= 2 * Math.PI - 1e-6, n = pts.length;
  var steps = full ? seg : Math.max(1, Math.ceil(seg * theta / (2 * Math.PI)));
  var V = [], idx = [], F = [], tint = [];
  pts.forEach(function (p, i) {
    idx.push([]);
    if (p[0] < 1e-6) { var id = V.length; V.push([0, p[1], 0]); for (var j = 0; j <= steps; j++) idx[i].push(id); return; }
    for (var j2 = 0; j2 <= steps; j2++) {
      if (full && j2 === steps) { idx[i].push(idx[i][0]); continue; }
      var a = a0 + theta * j2 / steps; idx[i].push(V.length); V.push([p[0] * Math.cos(a), p[1], -p[0] * Math.sin(a)]);
    }
  });
  if (theta > 1e-6) for (var i = 0; i < n; i++) {
    var i2 = (i + 1) % n, tt = tintEdge ? !!tintEdge(i) : false;
    for (var j = 0; j < steps; j++) {
      var f = [];
      [idx[i][j], idx[i2][j], idx[i2][j + 1], idx[i][j + 1]].forEach(function (k) { if (f[f.length - 1] !== k && f[0] !== k) f.push(k); });
      if (f.length >= 3) { F.push(f); tint.push(tt); }
    }
  }
  if (!full) {   // 처음과 끝 자리의 평면도형
    F.push(pts.map(function (p, i) { return idx[i][0]; }).reverse()); tint.push(true);
    if (theta > 1e-6) { F.push(pts.map(function (p, i) { return idx[i][steps]; })); tint.push(true); }
  }
  // 바깥을 향하도록 방향 맞추기 (부피의 부호)
  var vol = 0;
  F.forEach(function (f) { for (var k = 1; k + 1 < f.length; k++) { var A = V[f[0]], B = V[f[k]], C = V[f[k + 1]]; vol += A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0]); } });
  if (vol < 0) F = F.map(function (f) { return f.slice().reverse(); });
  var M = finish({ V: V, F: F });
  M.open = !full; M.tint = tint; M.c = [0, 0, 0]; M.R = R; M.VF = null; prep(M);
  return M;
}
var MESH_CACHE = {};
function meshOf(key, theta, a0, seg, extra, tintEdge, pts) {
  theta = theta > 2 * Math.PI - 0.01 ? 2 * Math.PI : Math.round(theta * 1000) / 1000; a0 = Math.round((a0 || 0) * 1000) / 1000;   // 캐시 열쇠와 실제 각을 똑같이
  var ck = key + '|' + theta.toFixed(3) + '|' + (a0 || 0).toFixed(3) + '|' + (seg || 64) + '|' + (extra || '');
  if (!MESH_CACHE[ck]) {
    var ks = Object.keys(MESH_CACHE); if (ks.length > 300) MESH_CACHE = {};
    MESH_CACHE[ck] = sweepMesh(pts || PROF[key].pts, theta, a0 || 0, seg || 64, PROF[key].R, tintEdge);
  }
  return MESH_CACHE[ck];
}
// 평면도형을 y ≤ h 쪽만 남기기 (수평으로 자르기)
function clipBelow(pts, h) {
  var out = [], n = pts.length;
  for (var i = 0; i < n; i++) {
    var A = pts[i], B = pts[(i + 1) % n], ina = A[1] <= h + 1e-9, inb = B[1] <= h + 1e-9;
    if (ina) out.push(A);
    if (ina !== inb) { var t = (h - A[1]) / (B[1] - A[1]); out.push([A[0] + (B[0] - A[0]) * t, h]); }
  }
  return out;
}
// 평면도형과 수평선 y = h가 만나는 구간 [r1, r2] 들
function crossAt(pts, h) {
  var xs = [], n = pts.length;
  for (var i = 0; i < n; i++) { var A = pts[i], B = pts[(i + 1) % n]; if ((A[1] > h) !== (B[1] > h)) { var t = (h - A[1]) / (B[1] - A[1]); xs.push(A[0] + (B[0] - A[0]) * t); } }
  xs.sort(function (a, b) { return a - b; });
  var iv = []; for (var k = 0; k + 1 < xs.length; k += 2) iv.push([xs[k], xs[k + 1]]);
  return iv;
}

// ================= 그리기 도우미 =================
function projOf(cv, R, mat, frac) {
  var W = cv._w, H = cv._h, sc = Math.min(W, H) * frac / R, rot = rotFn(mat);
  return function (p) { var r = rot(p[0], p[1], p[2]); return { x: W / 2 + r[0] * sc, y: H / 2 - r[1] * sc, z: r[2] }; };
}
function polyline(ctx, P, pts3, close) { ctx.beginPath(); pts3.forEach(function (p, j) { var q = P(p); j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); if (close) ctx.closePath(); }
function drawAxis(cv, R, mat, frac, col, label) {
  var ctx = cv.getContext('2d'), P = projOf(cv, R, mat, frac), a = P([0, -R * 1.18, 0]), b = P([0, R * 1.18, 0]);
  ctx.save(); ctx.setLineDash([12, 7]); ctx.lineWidth = 3; ctx.strokeStyle = col.bad; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  if (label) { var fs = Math.max(15, Math.min(cv._w, cv._h) * 0.038); ctx.font = fs + 'px ' + css('--display'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = col.panel; ctx.strokeText('회전축', b.x + 10, b.y + 6); ctx.fillStyle = col.bad; ctx.fillText('회전축', b.x + 10, b.y + 6); }
  ctx.restore();
}
function at3(p, a) { return [p[0] * Math.cos(a), p[1], -p[0] * Math.sin(a)]; }
// 돌아가는 평면도형(테두리)과 모선
function drawGen(cv, prof, a, R, mat, frac, col, showMo) {
  var ctx = cv.getContext('2d'), P = projOf(cv, R, mat, frac);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  polyline(ctx, P, prof.pts.map(function (p) { return at3(p, a); }), true);
  ctx.globalAlpha = 0.25; ctx.fillStyle = col.glass; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 3.5; ctx.strokeStyle = col.glass; ctx.stroke();
  if (showMo) prof.mo.forEach(function (i) {
    var A = at3(prof.pts[i], a), B = at3(prof.pts[(i + 1) % prof.pts.length], a);
    polyline(ctx, P, [A, B]); ctx.lineWidth = 7; ctx.strokeStyle = 'rgb(112, 72, 232)'; ctx.stroke();
  });
  ctx.restore();
}
function label(cv, txt, x, y, color, col) {
  var ctx = cv.getContext('2d'), fs = Math.max(15, Math.min(cv._w, cv._h) * 0.04);
  ctx.save(); ctx.font = fs + 'px ' + css('--display'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = col.panel; ctx.strokeText(txt, x, y); ctx.fillStyle = color; ctx.fillText(txt, x, y); ctx.restore();
}
// 작은 그림: 평면도형 + 회전축 (SVG)
function shapeSVG(prof, w, h, mirror) {
  var R = prof.R, s = Math.min(w, h) / (2.4 * R), cx = w / 2 - (mirror ? 0 : R * s * 0.45), cy = h / 2;
  function pt(p, m) { return ((m ? -p[0] : p[0]) * s + cx).toFixed(1) + ',' + (cy - p[1] * s).toFixed(1); }
  var body = '<polygon points="' + prof.pts.map(function (p) { return pt(p); }).join(' ') + '" fill="var(--edge)" fill-opacity=".22" stroke="var(--edge)" stroke-width="2.5" stroke-linejoin="round"/>';
  if (mirror) body += '<polygon points="' + prof.pts.map(function (p) { return pt(p, 1); }).join(' ') + '" fill="var(--edge)" fill-opacity=".22" stroke="var(--edge)" stroke-width="2.5" stroke-linejoin="round"/>';
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><line x1="' + cx + '" y1="4" x2="' + cx + '" y2="' + (h - 4) + '" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/>' + body + '</svg>';
}
// 2D 단면 그림 (패널 안 작은 캔버스)
function paintSection(cv, col, kind, prof, h) {
  if (!fit(cv)) return;
  var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
  var R = prof.R, s = Math.min(W, H) * 0.42 / R, ox = W / 2, oy = H / 2;
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = col.glass; ctx.fillStyle = 'rgba(28, 126, 214, .25)';
  if (kind === 'perp') {
    var iv = crossAt(prof.pts, h);
    if (!iv.length) { ctx.fillStyle = col.fg; ctx.font = '16px ' + css('--display'); ctx.textAlign = 'center'; ctx.fillText('자른 면이 없어요', ox, oy); return; }
    iv.forEach(function (q) {
      ctx.beginPath(); ctx.arc(ox, oy, Math.max(1.5, q[1] * s), 0, Math.PI * 2); ctx.closePath();
      if (q[0] > 1e-6) { ctx.moveTo(ox + q[0] * s, oy); ctx.arc(ox, oy, q[0] * s, 0, Math.PI * 2, true); ctx.closePath(); }
      ctx.fill('evenodd'); ctx.stroke();
      if (q[0] > 1e-6) { ctx.beginPath(); ctx.arc(ox, oy, q[0] * s, 0, Math.PI * 2); ctx.stroke(); }
    });
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fillStyle = col.bad; ctx.fill();
  } else {
    [1, -1].forEach(function (m) { ctx.beginPath(); prof.pts.forEach(function (p, j) { var x = ox + m * p[0] * s, y = oy - p[1] * s; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    ctx.setLineDash([8, 6]); ctx.strokeStyle = col.bad; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ox, oy - R * s * 1.1); ctx.lineTo(ox, oy + R * s * 1.1); ctx.stroke(); ctx.setLineDash([]);
  }
}
function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

// ================= 장면들 =================
// 회전체는 2D 엔진으로만 그린다 (단면 색칠 · 회전축 · 모선을 같은 캔버스에 겹쳐 그리기 위해)
function Stage3(holder) { var S = Stage(holder); S.cv._box = null; return S; }
function sceneCover3(main) {
  var box = el('div', 'cover');
  box.innerHTML = '<div class="cover-txt"><div class="unit">Ⅶ. 입체도형의 성질</div><h1>03. 회전체 <span>3차시</span></h1><div class="page">' + LESSON3_PAGE + '</div><div class="cover-hint">→ 키나 [다음]을 눌러 시작해요</div></div><div class="cover-stage"></div>';
  main.appendChild(box);
  var S = Stage3(box.querySelector('.cover-stage')), tag = S.add('tag'), KS = ['rect', 'tri', 'trap', 'semi'], st = { k: 0, t: 0 };
  S.el.querySelector('.stage-ctrls').hidden = true; S.el.querySelector('.hint').hidden = true;
  S.reset(0.35); S.spin = false;
  return { frame: function (dt, col) {
    st.t += dt; if (st.t > 4200) { st.t = 0; st.k = (st.k + 1) % KS.length; }
    var P = PROF[KS[st.k]], th = 2 * Math.PI * ease(Math.min(1, st.t / 2600));
    tag.textContent = th >= 2 * Math.PI - 1e-6 ? P.solid : P.shape + ' 돌리는 중…';
    if (S.tick(dt)) { render(S.cv, meshOf(P.key, th, 0, 64), S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, false); if (th < 2 * Math.PI - 1e-6) drawGen(S.cv, P, th, P.R, S.mat, 0.4, col, false); }
  } };
}
function sceneGoal3(main) {
  main.appendChild(el('div', 'goal', '<div class="goal-lab">학습목표</div><p class="goal-txt"><b>회전체</b>의 뜻을 알고,<br>회전체를 자른 <b>단면의 성질</b>을 설명할 수 있다.</p><ol class="goal-map"><li>다면체에서 회전체로 <small>층마다 원</small></li><li>돌려서 만들기 · 뜻 <small>회전축 · 모선</small></li><li>예측하기 · 거꾸로 생각하기 <small>평면도형 ↔ 회전체</small></li><li>단면의 성질 <small>수직으로 · 축을 품게</small></li><li>도전 <small>단면으로 회전체 맞히기</small></li></ol>'));
  return {};
}

// ---- 도입: 각기둥의 옆면을 늘려 보자 (층마다 다각형 → 층마다 원) ----
function sceneMoreSides(main) {
  main.appendChild(el('div', 'scene-head', '<h2>지난 시간 떠올리기 — 옆면을 자꾸 늘리면?</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { kind: 'rect', n: 4, h: 0.2, showLayer: true };
  var KIND = [['rect', '각기둥'], ['tri', '각뿔'], ['trap', '각뿔대']], NS = [3, 4, 6, 8, 12, 24, 64];
  panel.appendChild(el('p', 'lead', '지난 시간에는 입체도형을 <b>층</b>으로 나눠 봤어요. 옆면의 개수를 늘리면 층의 모양은 어떻게 될까요?'));
  var r1 = el('div', 'row'), kb = {}; KIND.forEach(function (k) { var b = el('button', 'pick mini', k[1]); b.onclick = function () { st.kind = k[0]; upd(); }; r1.appendChild(b); kb[k[0]] = b; }); panel.appendChild(r1);
  var r2 = el('div', 'row'), nb = {}; r2.appendChild(el('span', 'note', '옆면')); NS.forEach(function (n) { var b = el('button', 'pick mini', n === 64 ? '아주 많이' : n + '개'); b.onclick = function () { st.n = n; upd(); }; r2.appendChild(b); nb[n] = b; }); panel.appendChild(r2);
  var r3 = el('div', 'row'), rng = el('input'); rng.type = 'range'; rng.min = -90; rng.max = 90; rng.value = 20; r3.appendChild(el('span', 'note', '층의 높이')); r3.appendChild(rng); panel.appendChild(r3);
  rng.oninput = function () { st.h = rng.value / 100; upd(); };
  var out = el('p', 'callout'); panel.appendChild(out);
  var NM = { rect: ['각기둥', '원기둥'], tri: ['각뿔', '원뿔'], trap: ['각뿔대', '원뿔대'] };
  function upd() {
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.kind); }); NS.forEach(function (n) { nb[n].classList.toggle('sel', n === st.n); });
    var circ = st.n === 64, nm = circ ? NM[st.kind][1] : (NAMES[st.n] || st.n + '각') + NM[st.kind][0].slice(1);
    tag.textContent = nm;
    big.innerHTML = '<span class="layer-badge l1">층의 모양 · ' + (circ ? '원' : (NAMES[st.n] ? NAMES[st.n] + '형' : st.n + '각형')) + '</span>';
    out.innerHTML = circ ? '옆면이 아주 많아지면 층마다 <b>원</b>이 돼요. 이런 입체도형은 다면체가 아니에요. 오늘은 <b>층마다 원인 입체도형</b>을 만나요.' : '층마다 <b>' + (NAMES[st.n] ? NAMES[st.n] + '형' : st.n + '각형') + '</b>이에요. 옆면을 더 늘리면?';
  }
  upd(); S.reset(0.42);
  return {
    frame: function (dt, col) {
      if (!S.tick(dt)) return;
      var P = PROF[st.kind], M = meshOf(st.kind, 2 * Math.PI, Math.PI / st.n * (st.n === 4 ? 1 : 0.5), st.n);
      render(S.cv, M, S.mat, 0, 0.42, 3, col);
      var iv = crossAt(P.pts, st.h); if (!iv.length) return;
      var r = iv[iv.length - 1][1], ring = [], a0 = Math.PI / st.n * (st.n === 4 ? 1 : 0.5);
      for (var j = 0; j <= st.n; j++) { var a = a0 + 2 * Math.PI * j / st.n; ring.push([r * Math.cos(a), st.h, -r * Math.sin(a)]); }
      var ctx = S.cv.getContext('2d'), Pj = projOf(S.cv, P.R, S.mat, 0.42);
      polyline(ctx, Pj, ring, true); ctx.fillStyle = 'rgba(28, 126, 214, .28)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgb(28, 126, 214)'; ctx.stroke();
    },
    primary: function () { var i = NS.indexOf(st.n); st.n = NS[(i + 1) % NS.length]; upd(); }
  };
}

// ---- 평면도형을 돌려서 만들기 ----
function sceneSpin(main) {
  main.appendChild(el('div', 'scene-head', '<h2>평면도형을 한 직선을 축으로 돌려 보면?</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var KS = ['rect', 'tri', 'trap', 'semi'], st = { k: 'rect', th: 0, play: 0, from: 0 };
  panel.appendChild(el('p', 'lead', '빨간 점선을 축으로 평면도형을 <b>한 바퀴</b> 돌려요. 돌리기 전에 어떤 입체도형이 생길지 먼저 말해 보세요.'));
  var r1 = el('div', 'shapes'), kb = {};
  KS.forEach(function (k) { var b = el('button', 'pick shp', shapeSVG(PROF[k], 64, 56) + '<span>' + PROF[k].shape + '</span>'); b.onclick = function () { st.k = k; st.th = 0; st.play = 0; upd(); }; r1.appendChild(b); kb[k] = b; });
  panel.appendChild(r1);
  var r2 = el('div', 'row'), bPlay = el('button', 'primary', '▶ 한 바퀴 돌리기'), rng = el('input'); rng.type = 'range'; rng.min = 0; rng.max = 360; rng.value = 0;
  r2.appendChild(bPlay); r2.appendChild(rng); panel.appendChild(r2);
  var deg = el('p', 'note'); panel.appendChild(deg);
  var out = el('div', 'callout'); panel.appendChild(out);
  bPlay.onclick = function () { st.from = st.th >= 2 * Math.PI - 1e-6 ? 0 : st.th; st.play = performance.now(); };
  rng.oninput = function () { st.play = 0; st.th = rng.value / 180 * Math.PI; upd(); };
  function upd() {
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.k); });
    var P = PROF[st.k], done = st.th >= 2 * Math.PI - 1e-6, dg = Math.round(st.th * 180 / Math.PI);
    rng.value = dg; deg.textContent = '돌린 각: ' + dg + '°';
    tag.textContent = done ? P.solid : P.shape;
    big.innerHTML = '';
    out.innerHTML = done ? P.shape + '을(를) 한 바퀴 돌리면 <b>' + P.solid + '</b>이(가) 생겨요.' : '돌리는 동안 평면도형이 지나간 자리가 입체도형이 돼요.';
  }
  upd(); S.reset(0.35); S.spin = false;
  return {
    frame: function (dt, col) {
      if (st.play) { var x = Math.min(1, (performance.now() - st.play) / 3200); st.th = st.from + (2 * Math.PI - st.from) * ease(x); if (x >= 1) { st.play = 0; st.th = 2 * Math.PI; } upd(); }
      if (!S.tick(dt)) return;
      var P = PROF[st.k]; render(S.cv, meshOf(st.k, st.th, 0, 64), S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, true);
      if (st.th < 2 * Math.PI - 1e-6) drawGen(S.cv, P, st.th, P.R, S.mat, 0.4, col, false);
    },
    primary: function () { bPlay.onclick(); }
  };
}

// ---- 회전체의 뜻과 용어 ----
function sceneDefine3(main) {
  main.appendChild(el('div', 'scene-head', '<h2>회전체의 뜻 — 회전축과 모선</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { open: {}, k: 'rect', show: 'mo', a: 0 };
  var PARTS = [['a', '한 직선'], ['b', '회전체'], ['c', '회전축'], ['d', '모선']];
  var sent = el('div', 'sent big2'); panel.appendChild(sent);
  var r1 = el('div', 'row'), kb = {};
  ['rect', 'tri', 'trap', 'semi'].forEach(function (k) { var b = el('button', 'pick mini', PROF[k].solid); b.onclick = function () { st.k = k; upd(); }; r1.appendChild(b); kb[k] = b; });
  panel.appendChild(r1);
  var r2 = el('div', 'row'), bMo = el('button', '', '모선 보기'), bReset = el('button', '', '빈칸 다시 가리기'); r2.appendChild(bMo); r2.appendChild(bReset); panel.appendChild(r2);
  var out = el('p', 'callout'); panel.appendChild(out);
  function chip(id) { var on = st.open[id], txt = PARTS.filter(function (p) { return p[0] === id; })[0][1]; return '<button class="chip poly' + (on ? ' on' : '') + '" data-id="' + id + '">' + (on ? txt : '？？？') + '</button>'; }
  function upd() {
    sent.innerHTML = '평면도형을 ' + chip('a') + '을 축으로 하여 한 바퀴 돌릴 때 생기는 입체도형을 ' + chip('b') + '라고 해요.<br>이때 축으로 쓴 직선을 ' + chip('c') + ', 회전체에서 옆면을 만드는 선분을 ' + chip('d') + '이라고 해요.';
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.k); });
    bMo.classList.toggle('sel', st.show === 'mo');
    tag.textContent = PROF[st.k].solid;
    out.innerHTML = st.k === 'semi' ? '구는 반원의 <b>호(곡선)</b>가 돌아서 곡면이 생겨요. 옆면을 만드는 <b>선분</b>이 없어요.' : st.k === 'trap' ? '<b>원뿔대</b>: 원뿔을 회전축에 수직인 평면으로 잘랐을 때 생기는 두 입체도형 중 원뿔이 아닌 쪽이에요.' : '보라색 선분(모선)이 한 바퀴 돌면서 <b>옆면</b>을 만들어요.';
  }
  sent.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; st.open[b.dataset.id] = !st.open[b.dataset.id]; upd(); });
  bMo.onclick = function () { st.show = st.show === 'mo' ? '' : 'mo'; upd(); };
  bReset.onclick = function () { st.open = {}; upd(); };
  upd(); S.reset(0.35);
  return {
    frame: function (dt, col) {
      st.a = (st.a + dt * 0.0012) % (2 * Math.PI);
      if (!S.tick(dt)) return;
      var P = PROF[st.k]; render(S.cv, meshOf(st.k, 2 * Math.PI, 0, 64), S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, true);
      if (st.show === 'mo') drawGen(S.cv, P, st.a, P.R, S.mat, 0.4, col, true);
    },
    primary: function () { var nx = PARTS.filter(function (p) { return !st.open[p[0]]; })[0]; if (nx) { st.open[nx[0]] = true; upd(); } }
  };
}

// ---- 예측하기: 어떤 회전체가 생길까? ----
var PREDICT = ['trap', 'hole', 'kite', 'quarter', 'cup', 'donut', 'capsule'];
function scenePredict(main) {
  main.appendChild(el('div', 'scene-head', '<h2>어떤 회전체가 생길까? — 예측하고 돌려 보기</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: PREDICT[0], th: 0, play: 0, seen: {} };
  panel.appendChild(el('p', 'lead', '평면도형을 고르고 <b>겨냥도를 먼저 그려 본 뒤</b> 돌려 보세요. 축에서 떨어진 도형은 어떻게 될까요?'));
  var r1 = el('div', 'shapes'), kb = {};
  PREDICT.forEach(function (k, i) { var b = el('button', 'pick shp', shapeSVG(PROF[k], 64, 56) + '<span>' + (i + 1) + '</span>'); b.title = PROF[k].shape; b.onclick = function () { st.k = k; st.th = 0; st.play = 0; upd(); }; r1.appendChild(b); kb[k] = b; });
  panel.appendChild(r1);
  var r2 = el('div', 'row'), bPlay = el('button', 'primary', '▶ 돌려 보기'), bNext = el('button', '', '다음 도형 →'); r2.appendChild(bPlay); r2.appendChild(bNext); panel.appendChild(r2);
  var out = el('div', 'callout'); panel.appendChild(out);
  bPlay.onclick = function () { st.th = 0; st.play = performance.now(); };
  bNext.onclick = function () { var i = PREDICT.indexOf(st.k); st.k = PREDICT[(i + 1) % PREDICT.length]; st.th = 0; st.play = 0; upd(); };
  function upd() {
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.k); kb[k].classList.toggle('done', !!st.seen[k]); });
    var P = PROF[st.k], done = st.th >= 2 * Math.PI - 1e-6;
    if (done) st.seen[st.k] = 1;
    tag.textContent = done ? P.solid : P.shape;
    big.innerHTML = '';
    out.innerHTML = done ? '<b>' + P.shape + '</b> → <b>' + P.solid + '</b>' + (P.key === 'hole' || P.key === 'donut' ? '<br>축에서 떨어져 있으면 가운데에 <b>구멍</b>이 생겨요.' : P.key === 'kite' ? '<br>지난 시간의 <b>쌍뿔</b>처럼 점 · 원 · 점, 3층이에요.' : '') : '어떤 입체도형이 생길지 먼저 말해 보세요.';
  }
  upd(); S.reset(0.35); S.spin = false;
  return {
    frame: function (dt, col) {
      if (st.play) { var x = Math.min(1, (performance.now() - st.play) / 2600); st.th = 2 * Math.PI * ease(x); if (x >= 1) { st.play = 0; st.th = 2 * Math.PI; } upd(); }
      if (!S.tick(dt)) return;
      var P = PROF[st.k]; render(S.cv, meshOf(st.k, st.th, 0, 64), S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, true);
      if (st.th < 2 * Math.PI - 1e-6) drawGen(S.cv, P, st.th, P.R, S.mat, 0.4, col, false);
    },
    primary: function () { if (st.th >= 2 * Math.PI - 1e-6) bNext.onclick(); else bPlay.onclick(); }
  };
}

// ---- 거꾸로: 회전체를 보고 돌리기 전 평면도형 찾기 ----
var REVERSE = ['trap', 'cup', 'hole', 'kite', 'quarter', 'capsule'];
function sceneReverse(main) {
  main.appendChild(el('div', 'scene-head', '<h2>거꾸로 생각하기 — 어떤 평면도형을 돌렸을까?</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: REVERSE[0], step: 0, t: 1, play: 0 };
  panel.appendChild(el('p', 'lead', '회전체를 보고, 돌리기 전 평면도형을 <b>회전축 오른쪽에</b> 그려 보세요. 그다음 회전축을 품은 평면으로 반을 잘라 확인해요.'));
  var r1 = el('div', 'row'), kb = {};
  REVERSE.forEach(function (k) { var b = el('button', 'pick mini', PROF[k].solid); b.onclick = function () { st.k = k; st.step = 0; upd(); }; r1.appendChild(b); kb[k] = b; });
  panel.appendChild(r1);
  var r2 = el('div', 'row'), bStep = el('button', 'primary', ''); r2.appendChild(bStep); panel.appendChild(r2);
  var pic = el('div', 'shape-pic'); panel.appendChild(pic);
  var out = el('div', 'callout'); panel.appendChild(out);
  var STEPS = ['반으로 잘라 보기', '돌린 평면도형 보기', '처음으로 ↺'];
  bStep.onclick = function () { st.step = (st.step + 1) % 3; if (st.step === 1) { st.t = 0; st.play = performance.now(); } upd(); };
  function upd() {
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.k); });
    var P = PROF[st.k]; bStep.textContent = STEPS[st.step]; tag.textContent = P.solid; big.innerHTML = '';
    pic.innerHTML = st.step === 2 ? shapeSVG(P, 150, 130) + '<span>' + P.shape + '</span>' : '';
    out.innerHTML = st.step === 0 ? '어떤 평면도형을 돌렸을까요?' : st.step === 1 ? '자른 면은 회전축을 사이에 두고 <b>양쪽이 똑같아요</b>. 그중 <b>한쪽</b>이 돌린 평면도형이에요.' : '<b>' + P.shape + '</b>을(를) 돌렸어요. 자른 면의 <b>오른쪽 절반</b>이에요.';
  }
  upd(); S.reset(0.3);
  return {
    frame: function (dt, col) {
      if (st.play) { var x = Math.min(1, (performance.now() - st.play) / 1200); st.t = ease(x); if (x >= 1) st.play = 0; }
      if (!S.tick(dt)) return;
      var P = PROF[st.k], m = S.mat, ax = Math.atan2(-m[2], m[0]);   // 화면과 나란하고 회전축을 품은 면으로 자르기
      var mid = ax + Math.PI / 2, zMid = m[6] * Math.cos(mid) - m[8] * Math.sin(mid), aS = Math.round((zMid > 0 ? ax + Math.PI : ax) * 20) / 20;   // 뒤쪽 절반을 남긴다
      if (st.step === 0) render(S.cv, meshOf(st.k, 2 * Math.PI, 0, 64), S.mat, 0, 0.4, 3, col);
      else {
        render(S.cv, meshOf(st.k, 2 * Math.PI - Math.PI * Math.round(st.t * 40) / 40, aS, 64), S.mat, 0, 0.4, 3, col);
        if (st.step === 2) { var right = Math.cos(aS) * m[0] - Math.sin(aS) * m[2] > 0 ? aS : aS + Math.PI; drawGen(S.cv, P, right, P.R, S.mat, 0.4, col, false); }
      }
      drawAxis(S.cv, P.R, S.mat, 0.4, col, true);
    },
    primary: function () { bStep.onclick(); }
  };
}

// ---- 단면 1: 회전축에 수직인 평면으로 자르기 ----
var CUTS = ['rect', 'tri', 'trap', 'semi', 'hole', 'kite'];
function scenePerp(main) {
  main.appendChild(el('div', 'scene-head', '<h2>회전축에 수직인 평면으로 자르면? — 층마다 원</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'tri', h: 0.1, cut: true };
  var r1 = el('div', 'row'), kb = {};
  CUTS.forEach(function (k) { var b = el('button', 'pick mini', PROF[k].solid); b.onclick = function () { st.k = k; upd(); }; r1.appendChild(b); kb[k] = b; });
  panel.appendChild(r1);
  var r2 = el('div', 'row'), rng = el('input'); rng.type = 'range'; rng.min = -100; rng.max = 100; rng.value = 10; r2.appendChild(el('span', 'note', '자르는 높이')); r2.appendChild(rng); panel.appendChild(r2);
  var r3 = el('div', 'row'), bCut = el('button', 'sel', '위쪽 떼어 내기'); r3.appendChild(bCut); panel.appendChild(r3);
  var sec = el('div', 'secbox', '<div class="seclab">자른 면</div><canvas></canvas>'); panel.appendChild(sec);
  var cv2 = sec.querySelector('canvas');
  var out = el('div', 'callout'); panel.appendChild(out);
  rng.oninput = function () { st.h = rng.value / 100 * PROF[st.k].R / 1.04; upd(); };
  bCut.onclick = function () { st.cut = !st.cut; bCut.classList.toggle('sel', st.cut); };
  function upd() {
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.k); });
    var P = PROF[st.k], iv = crossAt(P.pts, st.h), ring = iv.some(function (q) { return q[0] > 1e-6; });
    tag.textContent = P.solid;
    big.innerHTML = iv.length ? '<span class="layer-badge l1">' + (ring ? '가운데가 빈 원' : '원') + '</span>' : '';
    out.innerHTML = '높이를 바꿔도 자른 면은 언제나 <b>원</b>이에요' + (ring ? ' (구멍이 있으면 가운데가 빈 원).' : '.') + '<br>회전체는 <b>층마다 원</b>이에요. 원의 중심은 모두 <b>회전축 위</b>에 있어요.';
  }
  upd(); S.reset(0.42);
  return {
    frame: function (dt, col) {
      if (!S.tick(dt)) return;
      var P = PROF[st.k], h = Math.round(st.h * 100) / 100;
      var cp = clipBelow(P.pts, h), M = st.cut && cp.length >= 3 ? meshOf(st.k, 2 * Math.PI, 0, 64, 'cut' + h, function (i) { return Math.abs(cp[i][1] - h) < 1e-9 && Math.abs(cp[(i + 1) % cp.length][1] - h) < 1e-9; }, cp) : meshOf(st.k, 2 * Math.PI, 0, 64);
      render(S.cv, M, S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, false);
      var ctx = S.cv.getContext('2d'), Pj = projOf(S.cv, P.R, S.mat, 0.4), s = P.R * 1.25, sq = [[-s, h, -s], [s, h, -s], [s, h, s], [-s, h, s]];
      polyline(ctx, Pj, sq, true); ctx.globalAlpha = st.cut ? 0.1 : 0.22; ctx.fillStyle = col.glass; ctx.fill(); ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.strokeStyle = col.glass; ctx.stroke(); ctx.globalAlpha = 1;
      paintSection(cv2, col, 'perp', P, h);
    }
  };
}

// ---- 단면 2: 회전축을 품은 평면으로 자르기 ----
function sceneAxisCut(main) {
  main.appendChild(el('div', 'scene-head', '<h2>회전축을 품은 평면으로 자르면? — 선대칭도형</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'trap', phi: 0 };
  var r1 = el('div', 'row'), kb = {};
  CUTS.forEach(function (k) { var b = el('button', 'pick mini', PROF[k].solid); b.onclick = function () { st.k = k; upd(); }; r1.appendChild(b); kb[k] = b; });
  panel.appendChild(r1);
  var r2 = el('div', 'row'), rng = el('input'); rng.type = 'range'; rng.min = 0; rng.max = 180; rng.value = 0; r2.appendChild(el('span', 'note', '자르는 방향')); r2.appendChild(rng); panel.appendChild(r2);
  rng.oninput = function () { st.phi = rng.value / 180 * Math.PI; };
  var sec = el('div', 'secbox', '<div class="seclab">자른 면</div><canvas></canvas>'); panel.appendChild(sec);
  var cv2 = sec.querySelector('canvas');
  var out = el('div', 'callout'); panel.appendChild(out);
  var SECN = { rect: '직사각형', tri: '이등변삼각형', trap: '사다리꼴', semi: '원', hole: '직사각형 2개', kite: '마름모' };
  function upd() {
    Object.keys(kb).forEach(function (k) { kb[k].classList.toggle('sel', k === st.k); });
    var P = PROF[st.k]; tag.textContent = P.solid; big.innerHTML = '<span class="layer-badge l3">' + SECN[st.k] + '</span>';
    out.innerHTML = '회전축이 <b>대칭축</b>인 <b>선대칭도형</b>이에요. 방향을 바꿔 잘라도 자른 면은 모두 <b>합동</b>이에요.';
  }
  upd(); S.reset(0.42);
  return {
    frame: function (dt, col) {
      if (!S.tick(dt)) return;
      var P = PROF[st.k], a0 = Math.round(st.phi * 30) / 30, m = S.mat, mid = a0 + Math.PI / 2;
      var aS = m[6] * Math.cos(mid) - m[8] * Math.sin(mid) > 0 ? a0 + Math.PI : a0;   // 보는 사람에게서 먼 쪽 절반을 남겨 자른 면이 보이게
      render(S.cv, meshOf(st.k, Math.PI, aS, 64), S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, true);
      var ctx = S.cv.getContext('2d'), Pj = projOf(S.cv, P.R, S.mat, 0.4), s = P.R * 1.2, c = Math.cos(a0), n = -Math.sin(a0);
      polyline(ctx, Pj, [[-s * c, -s, -s * n], [s * c, -s, s * n], [s * c, s, s * n], [-s * c, s, -s * n]], true);
      ctx.globalAlpha = 0.12; ctx.fillStyle = col.glass; ctx.fill(); ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.strokeStyle = col.glass; ctx.stroke(); ctx.globalAlpha = 1;
      paintSection(cv2, col, 'axis', P, 0);
    },
    primary: function () { st.phi = (st.phi + Math.PI / 6) % Math.PI; rng.value = Math.round(st.phi * 180 / Math.PI); }
  };
}

// ---- 정리 표 ----
function sceneTable3(main) {
  main.appendChild(el('div', 'scene-head', '<h2>회전체의 단면 정리하기</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage3(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var KS = ['rect', 'tri', 'trap', 'semi'], st = { k: 'rect', rev: {} };
  var ROWS = { rect: ['직사각형', '원', '직사각형'], tri: ['직각삼각형', '원', '이등변삼각형'], trap: ['직각사다리꼴', '원', '사다리꼴'], semi: ['반원', '원', '원'] };
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
  var note = el('p', 'callout', '회전축에 <b>수직</b>으로 자르면 언제나 <b>원</b>, 회전축을 <b>품게</b> 자르면 회전축이 대칭축인 <b>선대칭도형</b>이에요. 구는 어느 방향으로 잘라도 원이에요.'); note.hidden = true; panel.appendChild(note);
  function draw() {
    var h = '<table class="ctab big"><tr><th>회전체</th><th>돌린 도형</th><th>수직 단면</th><th>축을 품은 단면</th></tr>', all = true;
    KS.forEach(function (k) {
      h += '<tr' + (k === st.k ? ' class="cur"' : '') + '><th data-sel="' + k + '">' + PROF[k].solid + '</th>' + ROWS[k].map(function (v, i) { var key = k + i, on = st.rev[key]; if (!on) all = false; return '<td data-k="' + key + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? v : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>'; note.hidden = !all; tag.textContent = PROF[st.k].solid;
  }
  tbl.addEventListener('click', function (e) { var th = e.target.closest('th[data-sel]'); if (th) { st.k = th.dataset.sel; draw(); return; } var td = e.target.closest('td[data-k]'); if (!td) return; st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; st.k = td.dataset.k.replace(/\d$/, ''); draw(); });
  bAll.onclick = function () { var ks = []; KS.forEach(function (k) { [0, 1, 2].forEach(function (i) { ks.push(k + i); }); }); var on = ks.every(function (x) { return st.rev[x]; }); ks.forEach(function (x) { st.rev[x] = on ? 0 : 1; }); draw(); };
  draw(); S.reset(0.42);
  return {
    frame: function (dt, col) { if (S.tick(dt)) { var P = PROF[st.k]; render(S.cv, meshOf(st.k, 2 * Math.PI, 0, 64), S.mat, 0, 0.4, 3, col); drawAxis(S.cv, P.R, S.mat, 0.4, col, false); } },
    primary: function () { var ks = []; KS.forEach(function (k) { [0, 1, 2].forEach(function (i) { ks.push(k + i); }); }); var k = ks.filter(function (x) { return !st.rev[x]; })[0]; if (k) { st.rev[k] = 1; st.k = k.replace(/\d$/, ''); draw(); } }
  };
}

// ---- 도전: 단면 두 개를 보고 회전체 맞히기 ----
var QUIZ = [
  { k: 'hole', opts: ['원기둥', '가운데가 뚫린 원기둥', '원뿔대', '도넛 모양 (원환체)'] },
  { k: 'kite', opts: ['원뿔', '구', '원뿔 두 개를 붙인 모양', '원뿔대'] },
  { k: 'donut', opts: ['구', '가운데가 뚫린 원기둥', '도넛 모양 (원환체)', '원기둥 위에 반구'] },
  { k: 'capsule', opts: ['원기둥 위에 반구', '반구', '원뿔', '컵 모양'] }
];
function sceneQuiz3(main) {
  main.appendChild(el('div', 'scene-head', '<h2>도전: 자른 면 두 개로 회전체 맞히기</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var left = el('div', 'panel quiz-left'); two.appendChild(left);
  left.innerHTML = '<div class="qsec"><div class="seclab">회전축에 수직으로 자른 면</div><canvas></canvas></div><div class="qsec"><div class="seclab">회전축을 품게 자른 면</div><canvas></canvas></div>';
  var cvs = left.querySelectorAll('.qsec canvas');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var solidBox = el('div', 'qsolid'); solidBox.hidden = true;
  var st = { q: 0, pick: -1, S: null };
  var qrow = el('div', 'row'), qb = []; QUIZ.forEach(function (q, i) { var b = el('button', 'pick mini', '문제 ' + (i + 1)); b.onclick = function () { st.q = i; st.pick = -1; upd(); }; qrow.appendChild(b); qb.push(b); }); panel.appendChild(qrow);
  panel.appendChild(el('p', 'lead', '두 단면을 보고 어떤 회전체인지 골라 보세요. 돌린 평면도형도 떠올려 보세요.'));
  var opts = el('div', 'opts'); panel.appendChild(opts);
  var out = el('div', 'callout'); panel.appendChild(out); panel.appendChild(solidBox);
  var S = Stage3(solidBox); S.el.querySelector('.stage-ctrls').hidden = true; S.reset(0.42);
  opts.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; st.pick = Number(b.dataset.i); upd(); });
  function upd() {
    qb.forEach(function (b, i) { b.classList.toggle('sel', i === st.q); });
    var Q = QUIZ[st.q], P = PROF[Q.k], right = st.pick >= 0 && Q.opts[st.pick] === P.solid;
    opts.innerHTML = Q.opts.map(function (o, i) { return '<button class="opt' + (st.pick === i ? (right ? ' ok' : ' no') : '') + '" data-i="' + i + '">' + o + '</button>'; }).join('');
    out.innerHTML = st.pick < 0 ? '수직 단면에 <b>구멍</b>이 있나요? 축을 품은 단면은 몇 조각인가요?' : right ? '정답! <b>' + P.shape + '</b>을(를) 돌린 <b>' + P.solid + '</b>이에요.' + shapeSVG(P, 90, 80) : '다시 생각해 보세요. 축을 품은 단면의 <b>한쪽 절반</b>이 돌린 평면도형이에요.';
    solidBox.hidden = !right;
  }
  upd();
  var midH = { hole: 0, kite: 0, donut: 0, capsule: -0.4 };
  return {
    frame: function (dt, col) {
      var Q = QUIZ[st.q], P = PROF[Q.k];
      paintSection(cvs[0], col, 'perp', P, midH[Q.k]); paintSection(cvs[1], col, 'axis', P, 0);
      if (!solidBox.hidden && S.tick(dt)) render(S.cv, meshOf(Q.k, 2 * Math.PI, 0, 64), S.mat, 0, 0.42, 3, col);
    },
    primary: function () { st.q = (st.q + 1) % QUIZ.length; st.pick = -1; upd(); }
  };
}

// ================= 장면 순서 =================
var SECS = ['도입', '회전체의 뜻', '예측 · 거꾸로', '단면의 성질', '도전'];
var SCENES = [
  { sec: 0, title: '표지', mount: sceneCover3 },
  { sec: 0, title: '학습목표', mount: sceneGoal3, ws: '학습목표' },
  { sec: 0, title: '옆면을 늘리면?', mount: sceneMoreSides, ws: '떠올려 봅시다' },
  { sec: 1, title: '돌려서 만들기', mount: sceneSpin, ws: '주요개념' },
  { sec: 1, title: '회전체의 뜻 · 회전축 · 모선', mount: sceneDefine3, ws: '주요개념' },
  { sec: 2, title: '어떤 회전체가 생길까?', mount: scenePredict, ws: '생각익히기' },
  { sec: 2, title: '거꾸로 생각하기', mount: sceneReverse, ws: '생각익히기' },
  { sec: 3, title: '회전축에 수직으로 자르기', mount: scenePerp, ws: '주요개념' },
  { sec: 3, title: '회전축을 품게 자르기', mount: sceneAxisCut, ws: '주요개념' },
  { sec: 3, title: '단면 정리하기', mount: sceneTable3, ws: '정리' },
  { sec: 4, title: '도전: 단면으로 맞히기', mount: sceneQuiz3, ws: '도전문제' }
];
startLesson(SECS, SCENES);
