// 정다면체 2차시 — 장면과 도형. 공통 엔진(core.js)을 그대로 쓴다.
// 흐름: 지난 시간 격자로 세기 → 정다각형 떠올리기 → 정다면체 조건 예측·확인(직육면체 · 삼각쌍뿔) → 뜻
//       → 한 꼭짓점에 모인 면 → 다섯 정다면체를 층으로 세기 → 정다면체 표 → 쌍뿔 가족 → 도전

// ================= 도형 만들기 =================
var PHI = (1 + Math.sqrt(5)) / 2;
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function rotTo(V, a, b) {   // 방향 a가 b가 되도록 돌리기 (로드리게스)
  a = norm(a); b = norm(b);
  var k = cross(a, b), s = Math.hypot(k[0], k[1], k[2]), c = dot(a, b);
  if (s < 1e-9) return c > 0 ? V : V.map(function (v) { return [v[0], -v[1], -v[2]]; });
  k = [k[0] / s, k[1] / s, k[2] / s];
  return V.map(function (v) {
    var kv = cross(k, v), kd = dot(k, v);
    return [0, 1, 2].map(function (i) { return v[i] * c + kv[i] * s + k[i] * kd * (1 - c); });
  });
}
function hull(V) {   // 볼록다면체의 면 찾기 (꼭짓점이 많지 않으니 모든 세 점을 본다)
  var n = V.length, seen = {}, F = [], eps = 1e-6;
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) for (var k = j + 1; k < n; k++) {
    var nv = cross(vsub(V[j], V[i]), vsub(V[k], V[i])), l = Math.hypot(nv[0], nv[1], nv[2]);
    if (l < 1e-9) continue;
    nv = [nv[0] / l, nv[1] / l, nv[2] / l];
    var d = dot(nv, V[i]), pos = 0, neg = 0, on = [];
    for (var p = 0; p < n; p++) { var s = dot(nv, V[p]) - d; if (s > eps) pos++; else if (s < -eps) neg++; else on.push(p); }
    if (pos && neg) continue;
    var key = on.join(','); if (seen[key]) continue; seen[key] = 1;
    var cen = [0, 0, 0]; on.forEach(function (q) { cen[0] += V[q][0] / on.length; cen[1] += V[q][1] / on.length; cen[2] += V[q][2] / on.length; });
    var u = norm(vsub(V[on[0]], cen)), w = cross(nv, u);
    on.sort(function (a, b) { var A = vsub(V[a], cen), B = vsub(V[b], cen); return Math.atan2(dot(A, w), dot(A, u)) - Math.atan2(dot(B, w), dot(B, u)); });
    F.push(on);
  }
  return F;
}
function snapLevels(V) {   // 같은 높이에 있는 점은 높이를 똑같이 (층 나누기를 위해)
  var ys = V.map(function (v) { return v[1]; }).sort(function (a, b) { return a - b; }), lv = [];
  ys.forEach(function (y) { if (!lv.length || y - lv[lv.length - 1] > 1e-4) lv.push(y); });
  return V.map(function (v) { var y = lv.reduce(function (b, c) { return Math.abs(c - v[1]) < Math.abs(b - v[1]) ? c : b; }); return [v[0], y, v[2]]; });
}
function polyFrom(V, up, size) {
  if (up === 'face') { var F0 = hull(V)[0], c0 = [0, 0, 0]; F0.forEach(function (k) { c0[0] += V[k][0]; c0[1] += V[k][1]; c0[2] += V[k][2]; }); up = c0; }   // 면 하나가 위를 보게
  if (up) V = rotTo(V, up, [0, 1, 0]);
  var r = 0; V.forEach(function (v) { r = Math.max(r, Math.hypot(v[0], v[1], v[2])); });
  V = snapLevels(V.map(function (v) { return [v[0] / r * size, v[1] / r * size, v[2] / r * size]; }));
  var M = finish(convex(V, hull(V)));
  M.c = [0, 0, 0]; M.R = size * 1.02; return prep(M);
}
function bipyr(n) {   // 면이 모두 정삼각형인 쌍뿔
  var rr = 1 / (2 * Math.sin(Math.PI / n)), h = Math.sqrt(Math.max(0.01, 1 - rr * rr)), V = [[0, h, 0], [0, -h, 0]];
  for (var i = 0; i < n; i++) { var a = i * 2 * Math.PI / n; V.push([rr * Math.cos(a), 0, rr * Math.sin(a)]); }
  return V;
}
var SOLID_DEF = {
  tetra: { name: '정사면체', face: '정삼각형', q: 3, reg: true, V: function () { return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]; }, up: [1, 1, 1] },
  cube: { name: '정육면체', face: '정사각형', q: 3, reg: true, V: function () { var V = []; [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { V.push([x, y, z]); }); }); }); return V; } },
  octa: { name: '정팔면체', face: '정삼각형', q: 4, reg: true, V: function () { return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; } },
  dodeca: { name: '정십이면체', face: '정오각형', q: 3, reg: true, up: 'face', V: function () {
    var V = [], a = 1 / PHI; [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { V.push([x, y, z]); }); }); });
    [-1, 1].forEach(function (s) { [-1, 1].forEach(function (t) { V.push([0, s * a, t * PHI], [s * a, t * PHI, 0], [s * PHI, 0, t * a]); }); }); return V; } },
  icosa: { name: '정이십면체', face: '정삼각형', q: 5, reg: true, up: [0, 1, PHI], V: function () {
    var V = []; [-1, 1].forEach(function (s) { [-1, 1].forEach(function (t) { V.push([0, s, t * PHI], [s, t * PHI, 0], [s * PHI, 0, t]); }); }); return V; } },
  bi3: { name: '삼각쌍뿔', face: '정삼각형', V: function () { return bipyr(3); } },
  bi5: { name: '오각쌍뿔', face: '정삼각형', V: function () { return bipyr(5); } },
  cuboid: { name: '직육면체', face: '직사각형', V: function () { var V = []; [-1.5, 1.5].forEach(function (x) { [-0.8, 0.8].forEach(function (y) { [-1, 1].forEach(function (z) { V.push([x, y, z]); }); }); }); return V; } }
};
var REG5 = ['tetra', 'cube', 'octa', 'dodeca', 'icosa'];
var SOLID_CACHE = {};
function solidOf(key) { if (!SOLID_CACHE[key]) { var D = SOLID_DEF[key]; SOLID_CACHE[key] = polyFrom(D.V(), D.up, 1.15); } return SOLID_CACHE[key]; }

// ================= 층 나누기 (층이 3개, 4개여도) =================
// 단계: 1층 → 2층 → 1·2층 사이 → 3층 → 2·3층 사이 → … (아래에서 위로 쌓기)
function levelsOf(M, lf) {   // lf: 선 먼저 (1층 → 층 사이 선 → 2층 → …)
  var ck = lf ? '_LVf' : '_LV';
  if (M[ck]) return M[ck];
  var ys = []; M.V.forEach(function (v) { if (ys.indexOf(v[1]) < 0) ys.push(v[1]); }); ys.sort(function (a, b) { return a - b; });
  var K = ys.length, lvl = M.V.map(function (v) { return ys.indexOf(v[1]) + 1; });
  var stepL = lf ? function (k) { return 2 * k - 1; } : function (k) { return k === 1 ? 1 : 2 * k - 2; };   // k층
  var stepB = lf ? function (k) { return 2 * k; } : function (k) { return 2 * k + 1; };   // k·(k+1)층 사이
  var vL = lvl.map(stepL);
  var eL = M.E.map(function (e) { var a = lvl[e.a], b = lvl[e.b]; return a === b ? stepL(a) : stepB(Math.min(a, b)); });
  var fL = M.F.map(function (f, i) {
    var ls = f.map(function (v) { return lvl[v]; });
    if (ls.every(function (x) { return x === ls[0]; })) return stepL(ls[0]);
    return Math.max.apply(null, M.FE[i].map(function (ei) { return eL[ei]; }));   // 모서리가 다 생겨야 면이 닫힌다
  });
  var max = lf ? stepL(K) : stepB(K - 1), steps = [], col = {};
  for (var s = 1; s <= max; s++) {
    var isB = lf ? s % 2 === 0 : s >= 3 && s % 2 === 1, k = lf ? (isB ? s / 2 : (s + 1) / 2) : isB ? (s - 1) / 2 : (s === 1 ? 1 : s / 2 + 1);
    var nV = vL.filter(function (x) { return x === s; }).length, nE = eL.filter(function (x) { return x === s; }).length, nF = fL.filter(function (x) { return x === s; }).length;
    var shape = isB ? '' : nV === 1 ? '점' : nE === 0 ? '점 ' + nV + '개' : NAMES[nV] ? NAMES[nV] + '형' : nV + '각형';
    steps.push({ s: s, between: isB, name: isB ? k + '·' + (k + 1) + '층 사이' : k + '층', shape: shape, v: nV, e: nE, f: nF, cls: isB ? 'l2' : (k % 2 ? 'l1' : 'l3') });
    col[s] = isB ? '232, 89, 12' : (k % 2 ? '28, 126, 214' : '112, 72, 232');
  }
  // 층 사이를 엇갈려 잇는지 (지그재그): 사이 모서리 수가 두 층의 점 수보다 많으면
  var lvCount = []; for (var k2 = 1; k2 <= K; k2++) lvCount[k2] = lvl.filter(function (x) { return x === k2; }).length;
  steps.forEach(function (st) { if (st.between) { var k3 = lf ? st.s / 2 : (st.s - 1) / 2, a = lvCount[k3], b = lvCount[k3 + 1]; st.zig = a > 1 && b > 1 && st.e > Math.max(a, b); } });
  return (M[ck] = { vL: vL, eL: eL, fL: fL, col: col, max: max, steps: steps, K: K, ys: ys, lvl: lvl });
}

// ================= 꼭짓점 하나에 모인 면 보기 =================
function projector(cv, M, mat, frac) {
  var W = cv._w, H = cv._h, sc = Math.min(W, H) * frac / M.R, rot = rotFn(mat);
  return function (p) { var r = rot(p[0] - M.c[0], p[1] - M.c[1], p[2] - M.c[2]); return { x: W / 2 + r[0] * sc, y: H / 2 - r[1] * sc, z: r[2] }; };
}
function drawVertexFaces(cv, M, mat, frac, vi, col) {   // vi 꼭짓점에 모인 면을 칠하고 번호를 붙인다
  var ids = vi >= 0 ? M.VF[vi].slice() : [];
  if (ids.length) {   // 꼭짓점 둘레를 따라 번호 순서 정하기
    var P = projector(cv, M, mat, frac), c = P(M.V[vi]);
    ids.sort(function (a, b) {
      function ang(fi) { var x = 0, y = 0; M.F[fi].forEach(function (v) { var q = P(M.V[v]); x += q.x; y += q.y; }); return Math.atan2(y / M.F[fi].length - c.y, x / M.F[fi].length - c.x); }
      return ang(a) - ang(b);
    });
  }
  drawCount(cv, M, mat, 0, frac, 'face', ids, col);
  if (vi < 0) return;
  var ctx = cv.getContext('2d'), q = projector(cv, M, mat, frac)(M.V[vi]);
  ctx.beginPath(); ctx.arc(q.x, q.y, 11, 0, Math.PI * 2); ctx.fillStyle = col.vertex; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col.panel; ctx.stroke();
}
function topVertex(M, mat) {   // 화면에서 가장 위에 보이는 꼭짓점
  var rot = rotFn(mat), best = 0, by = -1e9;
  M.V.forEach(function (v, i) { var r = rot(v[0] - M.c[0], v[1] - M.c[1], v[2] - M.c[2]); if (r[2] > -0.2 && r[1] > by) { by = r[1]; best = i; } });
  return best;
}
// 꼭짓점을 눌러 고르는 무대 (S.onTap) — scenes가 함께 쓴다
function VertexPicker(S, getM, frac) {
  var P = { vi: -1 };
  S.onTap = function (x, y) { var M = getM(); if (!M) return; var id = pickAt(S.cv, M, S.mat, 0, frac, 'vertex', x, y); if (id >= 0) { P.vi = id; S.spin = false; if (P.onPick) P.onPick(id); } };
  P.reset = function () { P.vi = -1; };
  P.ensure = function () { var M = getM(); if (P.vi < 0 && M) P.vi = topVertex(M, S.mat); return P.vi; };
  return P;
}

// ================= 장면들 =================
function sceneCover2(main) {
  var box = el('div', 'cover');
  box.innerHTML = '<div class="cover-txt"><div class="unit">Ⅶ. 입체도형의 성질</div><h1>02. 정다면체 <span>2차시</span></h1><div class="page">' + LESSON2_PAGE + '</div><div class="cover-hint">→ 키나 [다음]을 눌러 시작해요</div></div><div class="cover-stage"></div>';
  main.appendChild(box);
  var S = Stage(box.querySelector('.cover-stage')), tag = S.add('tag'), st = { k: 0, t: 0 };
  S.el.querySelector('.stage-ctrls').hidden = true; S.el.querySelector('.hint').hidden = true;
  function show() { tag.textContent = SOLID_DEF[REG5[st.k]].name; }
  show(); S.reset(0.42);
  return { frame: function (dt, col) { st.t += dt; if (st.t > 3200) { st.t = 0; st.k = (st.k + 1) % 5; show(); } if (S.tick(dt)) render(S.cv, solidOf(REG5[st.k]), S.mat, 0, 0.42, 3, col); } };
}
function sceneGoal2(main) {
  main.appendChild(el('div', 'goal', '<div class="goal-lab">학습목표</div><p class="goal-txt"><b>정다면체</b>의 뜻을 알고,<br>정다면체의 <b>구성 요소의 개수</b>를 셀 수 있다.</p><ol class="goal-map"><li>지난 시간 떠올리기 <small>층으로 세기</small></li><li>정다면체의 뜻 <small>주요개념</small></li><li>다섯 가지 정다면체 <small>층으로 세기</small></li><li>쌍뿔 비교 · 도전 <small>마무리</small></li></ol>'));
  return {};
}

// ---- 층으로 세기 (정다면체용, 층이 여러 개) ----
function sceneLevels(cfg) {
  return function (main) {
    main.appendChild(el('div', 'scene-head', '<h2>' + cfg.title + '</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), big = S.add('big'), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: cfg.shapes[0], step: 1, animT0: performance.now(), rev: {} };
    var krow = el('div', 'row'), kBtns = {};
    cfg.shapes.forEach(function (k) { var b = el('button', 'pick mini', SOLID_DEF[k].name); b.onclick = function () { load(k); }; krow.appendChild(b); kBtns[k] = b; });
    panel.appendChild(krow);
    if (cfg.lead) panel.appendChild(el('p', 'lead', cfg.lead));
    var lrow = el('div', 'row'), bStep = el('button', 'primary', ''), bAll = el('button', '', '모두 쌓기');
    bStep.onclick = function () { var LV = levelsOf(solidOf(st.k), cfg.lf); st.step = st.step < LV.max ? st.step + 1 : 1; if (st.step === 1) st.rev = {}; st.animT0 = performance.now(); upd(); };
    bAll.onclick = function () { st.step = levelsOf(solidOf(st.k), cfg.lf).max; st.animT0 = 0; upd(); };
    lrow.appendChild(bStep); lrow.appendChild(bAll); panel.appendChild(lrow);
    var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
    var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
    var rrow = el('div', 'row'), bRev = el('button', '', '쌓은 칸 모두 열기'); rrow.appendChild(bRev); panel.appendChild(rrow);
    if (cfg.foot) panel.appendChild(el('p', 'note', cfg.foot));
    function load(k) { st.k = k; st.step = 1; st.rev = {}; st.animT0 = performance.now(); Object.keys(kBtns).forEach(function (x) { kBtns[x].classList.toggle('sel', x === k); }); tag.textContent = SOLID_DEF[k].name; S.reset(0.38); upd(); }
    function upd() {
      var LV = levelsOf(solidOf(st.k), cfg.lf), cur = LV.steps[st.step - 1];
      bStep.textContent = st.step < LV.max ? '다음 쌓기 → (' + LV.steps[st.step].name + ')' : '처음부터 ↺';
      big.innerHTML = '<span class="layer-badge ' + cur.cls + '">' + cur.name + (cur.shape ? ' · ' + cur.shape : '') + '</span>';
      var h = '<table class="ctab layers"><tr><th></th><th class="c-vertex">꼭짓점</th><th class="c-edge">모서리</th><th class="c-face">면</th></tr>', sum = { v: [], e: [], f: [] }, allOpen = true;
      LV.steps.forEach(function (S2) {
        if (S2.s > st.step) return;
        h += '<tr' + (S2.s === st.step ? ' class="cur"' : '') + '><th><span class="layer-badge ' + S2.cls + '">' + S2.name + '</span>' + (S2.shape ? ' <small>' + S2.shape + '</small>' : '') + (S2.zig ? ' <small class="zig">엇갈림</small>' : '') + '</th>' +
          ['v', 'e', 'f'].map(function (m) { var k = S2.s + m, on = st.rev[k]; if (!on) allOpen = false; sum[m].push(S2[m]); return '<td data-k="' + k + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? S2[m] : '?') + '</td>'; }).join('') + '</tr>';
      });
      var done = st.step >= LV.max && allOpen;
      h += '<tr class="sumrow"><th>합계</th>' + ['v', 'e', 'f'].map(function (m) { var t = sum[m].reduce(function (a, b) { return a + b; }, 0); return '<td>' + (done ? '<b>' + t + '</b>' : '·') + '</td>'; }).join('') + '</tr>';
      tbl.innerHTML = h + '</table>';
      var zig = LV.steps.filter(function (x) { return x.zig && x.s <= st.step; })[0];
      note.hidden = !zig;
      if (zig) note.innerHTML = '<b>' + zig.name + '</b>: 두 층의 점이 <b>엇갈려</b> 있어서 지그재그로 이어져요. 그래서 모서리가 ' + (zig.e / 2) + '개가 아니라 <b>' + zig.e + '개</b>예요.';
    }
    tbl.addEventListener('click', function (e) { var td = e.target.closest('td[data-k]'); if (!td) return; st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
    bRev.onclick = function () { var LV = levelsOf(solidOf(st.k), cfg.lf), ks = []; LV.steps.forEach(function (x) { if (x.s <= st.step) ['v', 'e', 'f'].forEach(function (m) { ks.push(x.s + m); }); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); upd(); };
    load(st.k);
    return {
      frame: function (dt, col) { if (S.tick(dt)) { var M = solidOf(st.k); drawLayersG(S.cv, M, levelsOf(M, cfg.lf), st.step, st.animT0, S.mat, 0, 0.4, col, false); } },
      primary: function () { bStep.onclick(); }
    };
  };
}

// ================= 차곡차곡 쌓아 만들기: 면을 접어 올려 다음 층을 만든다 =================
// 면을 "고리"로 나눈다: 바닥 면(0) → 바닥과 점을 나누는 면(1) → 그 면들과 점을 나누는 면(2) → …
// 고리마다 면은 이미 있는 면에 경첩(모서리)으로 붙어 있고, 평평하게 펼친 상태(t = 0)에서 제자리(t = 1)로 접혀 올라온다.
function rodr(u, th) {
  var c = Math.cos(th), s = Math.sin(th), q = 1 - c, x = u[0], y = u[1], z = u[2];
  return [q * x * x + c, q * x * y - s * z, q * x * z + s * y, q * x * y + s * z, q * y * y + c, q * y * z - s * x, q * x * z - s * y, q * y * z + s * x, q * z * z + c];
}
function mvec(m, p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]]; }
var T_ID = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
function tAbout(u, th, p) { var m = rodr(u, th), mp = mvec(m, p); return { m: m, t: [p[0] - mp[0], p[1] - mp[1], p[2] - mp[2]] }; }
function tThen(A, B) { var bt = mvec(A.m, B.t); return { m: matMul(A.m, B.m), t: [bt[0] + A.t[0], bt[1] + A.t[1], bt[2] + A.t[2]] }; }   // B 다음 A
function tApply(T, p) { var q = mvec(T.m, p); return [q[0] + T.t[0], q[1] + T.t[1], q[2] + T.t[2]]; }
function angY(p) { var a = Math.atan2(p[2], p[0]); return (a + 2 * Math.PI) % (2 * Math.PI); }

function buildOf(M) {
  if (M._BD) return M._BD;
  var LV = levelsOf(M), lvl = LV.lvl, nF = M.F.length;
  var cen = M.F.map(function (f) { var c = [0, 0, 0]; f.forEach(function (v) { c[0] += M.V[v][0] / f.length; c[1] += M.V[v][1] / f.length; c[2] += M.V[v][2] / f.length; }); return c; });
  var ring = M.F.map(function (f) { return f.every(function (v) { return lvl[v] === 1; }) ? 0 : -1; });
  var has0 = ring.indexOf(0) >= 0, r = 0;
  if (!has0) { M.F.forEach(function (f, i) { if (f.some(function (v) { return lvl[v] === 1; })) ring[i] = 1; }); r = 1; }
  for (;;) {
    var vs = {}, any = false;
    M.F.forEach(function (f, i) { if (ring[i] === r) f.forEach(function (v) { vs[v] = 1; }); });
    M.F.forEach(function (f, i) { if (ring[i] < 0 && f.some(function (v) { return vs[v]; })) { ring[i] = r + 1; any = true; } });
    if (!any) break; r++;
  }
  var R = r;
  // 경첩 정하기: 앞 고리의 면에 붙이고, 없으면 같은 고리에서 먼저 붙은 면에 붙인다 (돌아가는 방향을 한쪽으로 맞춤)
  var par = M.F.map(function () { return -1; }), hEdge = M.F.map(function () { return -1; }), done = M.F.map(function (f, i) { return ring[i] === 0; });
  function nbrs(i) { var out = []; M.FE[i].forEach(function (ei) { M.E[ei].f.forEach(function (g) { if (g !== i) out.push({ g: g, e: ei }); }); }); return out; }
  function pick(i, cands) {
    var a0 = angY(cen[i]), best = null, bd = 1e9;
    cands.forEach(function (c) { var d = (a0 - angY(cen[c.g]) + 4 * Math.PI) % (2 * Math.PI); if (d < 1e-6) d = 2 * Math.PI - 1e-3; if (d < bd) { bd = d; best = c; } });
    return best;
  }
  for (var k = 1; k <= R; k++) {
    var mine = M.F.map(function (f, i) { return i; }).filter(function (i) { return ring[i] === k; }).sort(function (a, b) { return angY(cen[a]) - angY(cen[b]); });
    mine.forEach(function (i) { var c = pick(i, nbrs(i).filter(function (x) { return ring[x.g] === k - 1 && ring[x.g] >= 0 && done[x.g]; })); if (c) { par[i] = c.g; hEdge[i] = c.e; } });
    mine.forEach(function (i) { if (par[i] >= 0) done[i] = true; });
    if (!mine.some(function (i) { return done[i]; })) done[mine[0]] = true;   // 바닥이 점이면 첫 면이 뿌리
    for (var guard = 0; guard < nF; guard++) {
      var left = mine.filter(function (i) { return !done[i]; }); if (!left.length) break;
      left.forEach(function (i) { var c = pick(i, nbrs(i).filter(function (x) { return ring[x.g] === k && done[x.g]; })); if (c) { par[i] = c.g; hEdge[i] = c.e; done[i] = true; } });
    }
  }
  // 접는 각: 경첩을 축으로 돌려 부모 면과 한 평면이 되게 (뿌리 면은 바닥 점을 중심으로 바닥에 눕힌다)
  var hinge = M.F.map(function (f, i) {
    if (ring[i] === 0) return null;
    if (par[i] < 0) {
      var p0 = M.V[f.filter(function (v) { return lvl[v] === 1; })[0]], nc = M.N[i], down = [0, -1, 0], ax = cross(nc, down), l = Math.hypot(ax[0], ax[1], ax[2]);
      return { u: l < 1e-9 ? [1, 0, 0] : [ax[0] / l, ax[1] / l, ax[2] / l], p: p0, th: Math.acos(Math.max(-1, Math.min(1, dot(nc, down)))) };
    }
    var E = M.E[hEdge[i]], a = M.V[E.a], u = norm(vsub(M.V[E.b], a)), n1 = M.N[i], n2 = M.N[par[i]];
    return { u: u, p: a, th: Math.atan2(dot(u, cross(n1, n2)), dot(n1, n2)) };
  });
  // 어느 고리에서 처음 생기나
  var vRing = M.V.map(function () { return 99; }), eRing = M.E.map(function () { return 99; });
  M.F.forEach(function (f, i) { f.forEach(function (v) { vRing[v] = Math.min(vRing[v], ring[i]); }); M.FE[i].forEach(function (ei) { eRing[ei] = Math.min(eRing[ei], ring[i]); }); });
  if (!has0) M.V.forEach(function (v, i) { if (lvl[i] === 1) vRing[i] = 0; });
  var isLevel = M.E.map(function (e) { return lvl[e.a] === lvl[e.b]; });
  function layerEdge(ei, kr) { var e = M.E[ei]; return isLevel[ei] && eRing[ei] === kr && vRing[e.a] === kr && vRing[e.b] === kr; }
  function layerRows(kr) {
    var levs = []; M.V.forEach(function (v, i) { if (vRing[i] === kr && levs.indexOf(lvl[i]) < 0) levs.push(lvl[i]); }); levs.sort(function (a, b) { return a - b; });
    return levs.map(function (L) {
      var nV = 0, nE = 0; M.V.forEach(function (v, i) { if (vRing[i] === kr && lvl[i] === L) nV++; });
      M.E.forEach(function (e, ei) { if (layerEdge(ei, kr) && lvl[e.a] === L) nE++; });
      var nFf = kr === 0 ? ring.filter(function (x) { return x === 0; }).length : 0;
      return { lev: L, name: L + '층', shape: nV === 1 ? '점' : nE === 0 ? '점 ' + nV + '개' : (NAMES[nV] ? NAMES[nV] + '형' : nV + '각형'), v: nV, e: nE, f: nFf, cls: L % 2 ? 'l1' : 'l3' };
    });
  }
  var steps = [], top = 1;
  steps.push({ kind: 'layer', ring: 0, rows: layerRows(0) });
  for (k = 1; k <= R; k++) {
    var nf = ring.filter(function (x) { return x === k; }).length, ne = 0;
    M.E.forEach(function (e, ei) { if (eRing[ei] === k && !layerEdge(ei, k)) ne++; });
    var lay = layerRows(k), to = lay.map(function (x) { return x.lev; });
    var nm = to.length ? top + '층 → ' + to.join('·') + '층' : '뚜껑 닫기';
    steps.push({ kind: 'fold', ring: k, rows: [{ name: nm, shape: '면 ' + nf + '개 접기', v: 0, e: ne, f: nf, cls: 'l2' }] });
    if (lay.length) { steps.push({ kind: 'layer', ring: k, rows: lay }); top = to[to.length - 1]; }
  }
  return (M._BD = { layerEdge: layerEdge, ring: ring, par: par, hinge: hinge, R: R, steps: steps, vRing: vRing, eRing: eRing, isLevel: isLevel, lvl: lvl, has0: has0 });
}

function drawBuild(cv, M, BD, si, t, mat, view, col, ghost) {
  var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d;
  ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
  if (typeof G3 !== 'undefined' && G3 && cv._box) G3.hide();
  var st = BD.steps[si], foldR = st.kind === 'fold' ? st.ring : -1, shownR = st.ring;
  var memo = {};
  function T(i) {
    if (memo[i]) return memo[i];
    var h = BD.hinge[i], res;
    if (!h || BD.ring[i] !== foldR) res = h && BD.par[i] >= 0 && BD.ring[BD.par[i]] === foldR ? T(BD.par[i]) : T_ID;
    else { var loc = tAbout(h.u, (1 - t) * h.th, h.p); res = BD.par[i] >= 0 ? tThen(T(BD.par[i]), loc) : loc; }
    return (memo[i] = res);
  }
  var rot = rotFn(mat), faces = [], rmax = M.R;
  M.F.forEach(function (f, i) {
    if (BD.ring[i] > shownR) return;
    var Ti = T(i), P3 = f.map(function (v) { return tApply(Ti, M.V[v]); });
    P3.forEach(function (p) { rmax = Math.max(rmax, Math.hypot(p[0], p[1], p[2])); });
    var nV = rot.apply(null, mvec(Ti.m, M.N[i]));
    faces.push({ i: i, P: P3.map(function (p) { return rot(p[0], p[1], p[2]); }), n: nV, moving: BD.ring[i] === foldR });
  });
  view.target = 0.42 * M.R / rmax;
  if (!view.frac) view.frac = view.target;
  view.frac += (view.target - view.frac) * 0.12;
  var sc = Math.min(W, H) * view.frac / M.R, ox = W / 2, oy = H / 2 + Math.min(W, H) * 0.04;
  function scr(r) { return { x: ox + r[0] * sc, y: oy - r[1] * sc, z: r[2] }; }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ghost) M.E.forEach(function (e, ei) {   // 완성 모양 겹쳐 보기
    var a = scr(rot.apply(null, M.V[e.a])), b = scr(rot.apply(null, M.V[e.b]));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.setLineDash([5, 6]); ctx.strokeStyle = col.muted; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  });
  faces.forEach(function (F) { F.S = F.P.map(scr); F.z = F.P.reduce(function (s, p) { return s + p[2]; }, 0) / F.P.length; F.front = F.n[2] > 0; });
  faces.sort(function (a, b) { return (a.front - b.front) || (a.z - b.z); });
  faces.forEach(function (F) {
    var lam = Math.abs(F.n[0] * LIGHT[0] + F.n[1] * LIGHT[1] + F.n[2] * LIGHT[2]), k = 0.7 + 0.3 * lam;
    var base = F.moving ? [236, 120, 60] : [140, 172, 210];
    ctx.beginPath(); F.S.forEach(function (p, j) { j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath();
    ctx.fillStyle = 'rgb(' + base.map(function (x) { return Math.round(x * k); }).join(',') + ')';
    var solid = F.front || F.moving;   // 접히는 면은 뒷면이 보여도 실선으로
    ctx.globalAlpha = F.moving ? (F.front ? 0.8 : 0.6) : F.front ? 0.62 : 0.28; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = F.moving ? 'rgb(232, 89, 12)' : col.fg; ctx.lineWidth = F.moving ? 3.2 : 2.4;
    ctx.setLineDash(solid ? [] : [6, 6]); ctx.globalAlpha = solid ? 1 : 0.55; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  });
  // 층의 점 (제자리에 온 점만). 지금 생긴 층은 크게, 층 색으로
  var nowLayer = st.kind === 'layer' ? st.ring : -1, pop = st.kind === 'layer' ? t : 1;
  var LC = function (L) { return L % 2 ? 'rgb(28, 126, 214)' : 'rgb(112, 72, 232)'; };
  if (nowLayer >= 0) M.E.forEach(function (e, ei) {
    if (!BD.layerEdge(ei, nowLayer)) return;
    var a = scr(rot.apply(null, M.V[e.a])), b = scr(rot.apply(null, M.V[e.b]));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * pop, a.y + (b.y - a.y) * pop); ctx.strokeStyle = LC(BD.lvl[e.a]); ctx.lineWidth = 5.5; ctx.stroke();
  });
  M.V.forEach(function (v, i) {
    var vr = BD.vRing[i]; if (vr > shownR || (st.kind === 'fold' && vr >= foldR)) return;
    var q = scr(rot.apply(null, v)), isNew = vr === nowLayer, rad = isNew ? 5 + 5 * pop : 4.5;
    ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fillStyle = isNew ? LC(BD.lvl[i]) : col.fg; ctx.globalAlpha = q.z > -0.05 || isNew ? 1 : 0.45; ctx.fill(); ctx.globalAlpha = 1;
    if (isNew) { ctx.lineWidth = 2.5; ctx.strokeStyle = col.panel || '#fff'; ctx.stroke(); }
  });
}

function sceneBuild(main) {
  main.appendChild(el('div', 'scene-head', '<h2>접어서 쌓기 — 면을 접어 올리면 다음 층이 생겨요</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), big = S.add('big'), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'dodeca', si: 0, t: 1, play: 0, ghost: false, rev: {} }, view = {};
  var krow = el('div', 'row'), kBtns = {};
  REG5.forEach(function (k) { var b = el('button', 'pick mini', SOLID_DEF[k].name); b.onclick = function () { load(k); }; krow.appendChild(b); kBtns[k] = b; });
  panel.appendChild(krow);
  panel.appendChild(el('p', 'lead', '<b>1층</b>을 놓고 → 면을 <b>접어 올리면</b> → <b>다음 층</b>이 생겨요. 접는 도중에 멈추고 "어디서 만날까?" 물어보세요.'));
  var lrow = el('div', 'row'), bStep = el('button', 'primary', ''), bBack = el('button', '', '← 한 단계'), bGhost = el('button', '', '완성 모양 겹쳐 보기');
  lrow.appendChild(bBack); lrow.appendChild(bStep); lrow.appendChild(bGhost); panel.appendChild(lrow);
  var srow = el('div', 'row foldrow'), bPlay = el('button', '', '▶ 접기'), rng = el('input'); rng.type = 'range'; rng.min = 0; rng.max = 1000; rng.value = 1000;
  srow.appendChild(bPlay); srow.appendChild(rng); panel.appendChild(srow);
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var rrow = el('div', 'row'), bRev = el('button', '', '쌓은 칸 모두 열기'); rrow.appendChild(bRev); panel.appendChild(rrow);
  function BD() { return buildOf(solidOf(st.k)); }
  function enter(si) { st.si = si; st.t = 0; st.play = performance.now(); upd(); }
  bStep.onclick = function () { var n = BD().steps.length; if (st.si < n - 1) enter(st.si + 1); else { st.rev = {}; enter(0); } };
  bBack.onclick = function () { if (st.si > 0) { st.si--; st.t = 1; st.play = 0; upd(); } };
  bGhost.onclick = function () { st.ghost = !st.ghost; bGhost.classList.toggle('sel', st.ghost); };
  bPlay.onclick = function () { st.t = 0; st.play = performance.now(); };
  rng.oninput = function () { st.play = 0; st.t = rng.value / 1000; };
  function load(k) { st.k = k; st.rev = {}; view.frac = 0; Object.keys(kBtns).forEach(function (x) { kBtns[x].classList.toggle('sel', x === k); }); tag.textContent = SOLID_DEF[k].name; S.reset(0.5); enter(0); }
  function upd() {
    var B = BD(), cur = B.steps[st.si], last = st.si === B.steps.length - 1;
    bStep.textContent = last ? '처음부터 ↺' : '다음 → ' + (B.steps[st.si + 1].kind === 'fold' ? '접어 올리기' : B.steps[st.si + 1].rows.map(function (r) { return r.name; }).join('·'));
    bBack.disabled = st.si === 0;
    srow.style.visibility = cur.kind === 'fold' ? 'visible' : 'hidden';
    big.innerHTML = cur.rows.map(function (r) { return '<span class="layer-badge ' + r.cls + '">' + r.name + ' · ' + r.shape + '</span>'; }).join(' ');
    var h = '<table class="ctab layers"><tr><th></th><th class="c-vertex">꼭짓점</th><th class="c-edge">모서리</th><th class="c-face">면</th></tr>', sum = { v: 0, e: 0, f: 0 }, allOpen = true;
    B.steps.forEach(function (S2, j) {
      if (j > st.si) return;
      S2.rows.forEach(function (r, ri) {
        h += '<tr' + (j === st.si ? ' class="cur"' : '') + '><th><span class="layer-badge ' + r.cls + '">' + r.name + '</span> <small>' + r.shape + '</small></th>' +
          ['v', 'e', 'f'].map(function (m) { var key = j + '-' + ri + m, on = st.rev[key]; if (!on) allOpen = false; sum[m] += r[m]; return '<td data-k="' + key + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? r[m] : '?') + '</td>'; }).join('') + '</tr>';
      });
    });
    var done = st.si === B.steps.length - 1 && allOpen;
    h += '<tr class="sumrow"><th>합계</th>' + ['v', 'e', 'f'].map(function (m) { return '<td>' + (done ? '<b>' + sum[m] + '</b>' : '·') + '</td>'; }).join('') + '</tr>';
    tbl.innerHTML = h + '</table>';
  }
  tbl.addEventListener('click', function (e) { var td = e.target.closest('td[data-k]'); if (!td) return; st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
  bRev.onclick = function () { var B = BD(), ks = []; B.steps.forEach(function (S2, j) { if (j <= st.si) S2.rows.forEach(function (r, ri) { ['v', 'e', 'f'].forEach(function (m) { ks.push(j + '-' + ri + m); }); }); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); upd(); };
  load(st.k);
  return {
    frame: function (dt, col) {
      if (st.play) { var cur = BD().steps[st.si], dur = cur.kind === 'fold' ? 2800 : 700, x = Math.min(1, (performance.now() - st.play) / dur); st.t = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; if (x >= 1) st.play = 0; rng.value = Math.round(st.t * 1000); }
      if (S.tick(dt)) { var M = solidOf(st.k); drawBuild(S.cv, M, buildOf(M), st.si, st.t, S.mat, view, col, st.ghost); }
    },
    primary: function () { bStep.onclick(); }
  };
}

// ---- 정다각형 떠올리기 ----
var POLY4 = [
  { name: '정삼각형', pts: function () { return regular(3, 1); }, side: 1, ang: 1 },
  { name: '정사각형', pts: function () { return regular(4, 1); }, side: 1, ang: 1 },
  { name: '직사각형', pts: function () { return [[-1.25, -0.7], [1.25, -0.7], [1.25, 0.7], [-1.25, 0.7]]; }, side: 0, ang: 1 },
  { name: '마름모', pts: function () { return [[0, -1.1], [0.7, 0], [0, 1.1], [-0.7, 0]]; }, side: 1, ang: 0 }
];
function scenePolygons(main) {
  main.appendChild(el('div', 'scene-head', '<h2>초등학교에서 배운 정다각형, 기억나요?</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var box = el('div', 'stage'); box.innerHTML = '<canvas></canvas>'; two.appendChild(box);
  var cv = box.querySelector('canvas');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { rev: {} };
  panel.appendChild(el('p', 'lead', '어떤 것이 정다각형일까요? 무엇을 보고 알 수 있나요?'));
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
  var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
  var ROWS = [['side', '변의 길이가 모두 같다'], ['ang', '각의 크기가 모두 같다'], ['reg', '정다각형인가?']];
  function draw() {
    var h = '<table class="ctab big"><tr><th></th>' + POLY4.map(function (p) { return '<th>' + p.name + '</th>'; }).join('') + '</tr>';
    ROWS.forEach(function (r) {
      h += '<tr><th>' + r[1] + '</th>' + POLY4.map(function (p, i) { var k = i + r[0], on = st.rev[k], v = r[0] === 'reg' ? (p.side && p.ang) : p[r[0]]; return '<td data-k="' + k + '" class="' + (on ? 'rev ' + (v ? 'okc' : 'noc') : 'q') + '">' + (on ? (v ? '○' : '✕') : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>';
    note.hidden = !(st.rev['2side'] && st.rev['3ang']);
    note.innerHTML = '정다각형이 되려면 <b>변</b>도 같고 <b>각</b>도 같아야 해요. 직사각형은 각만, 마름모는 변만 같아요.<br>그렇다면 <b>정다면체</b>는 무엇이 같아야 할까요?';
  }
  tbl.addEventListener('click', function (e) { var td = e.target.closest('td[data-k]'); if (!td) return; st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; draw(); });
  bAll.onclick = function () { var ks = []; POLY4.forEach(function (p, i) { ROWS.forEach(function (r) { ks.push(i + r[0]); }); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); draw(); };
  draw();
  function paint(col) {
    var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    var cw = W / 2, ch = H / 2, s = Math.min(cw, ch) * 0.3;
    ctx.font = Math.max(18, Math.min(W, H) * 0.045) + 'px ' + css('--display'); ctx.textAlign = 'center';
    POLY4.forEach(function (p, i) {
      var ox = (i % 2 + 0.5) * cw, oy = (Math.floor(i / 2) + 0.45) * ch, pts = p.pts();
      ctx.beginPath(); pts.forEach(function (q, j) { var x = ox + q[0] * s, y = oy - q[1] * s; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
      ctx.fillStyle = 'rgba(' + col.base.join(',') + ',.55)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col.fg; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = col.fg; ctx.fillText(p.name, ox, oy + s * 1.55);
    });
  }
  return { frame: function (dt, col) { if (fit(cv)) paint(col); }, primary: function () { var ks = []; POLY4.forEach(function (p, i) { ROWS.forEach(function (r) { ks.push(i + r[0]); }); }); var k = ks.filter(function (x) { return !st.rev[x]; })[0]; if (k) { st.rev[k] = 1; draw(); } } };
}

// ---- 정다면체 조건: 예측하고 이름표 붙은 모형으로 확인 ----
var CHECK = [
  { k: 'tetra', yes: true, c1: 1, c2: 1 }, { k: 'cube', yes: true, c1: 1, c2: 1 }, { k: 'octa', yes: true, c1: 1, c2: 1 },
  { k: 'cuboid', yes: false, c1: 0, c2: 1, like: '직사각형', why: '꼭짓점마다 면이 3개씩 모이지만, 면이 모두 합동인 정다각형은 아니에요.' },
  { k: 'bi3', yes: false, c1: 1, c2: 0, like: '마름모', why: '면은 모두 정삼각형인데, 꼭짓점에 따라 면이 <b>3개</b> 모이기도 하고 <b>4개</b> 모이기도 해요.' }
];
function sceneConditions(main) {
  main.appendChild(el('div', 'scene-head', '<h2>정다면체가 되려면? — 예측하고 확인하기</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag'), stamp = S.add('stamp');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { i: 0, rev: {}, chip: {} };
  var VP = VertexPicker(S, function () { return solidOf(CHECK[st.i].k); }, 0.42);
  VP.onPick = function () { upd(); };
  var krow = el('div', 'row');
  var kBtns = CHECK.map(function (c, i) { var b = el('button', 'pick mini', SOLID_DEF[c.k].name + (c.yes ? ' ○' : ' ✕')); b.onclick = function () { st.i = i; VP.reset(); S.reset(0.42); upd(); }; krow.appendChild(b); return b; });
  panel.appendChild(el('p', 'lead', '○는 정다면체, ✕는 정다면체가 아니에요. 꼭짓점을 눌러 거기 모인 면을 세어 보세요.'));
  panel.appendChild(krow);
  var chips = el('div', 'conds'); panel.appendChild(chips);
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
  var COND = [['c1', '모든 면이 합동인 정다각형', '변처럼'], ['c2', '모든 꼭짓점에 모인 면의 개수가 같다', '각처럼']];
  function upd() {
    var C = CHECK[st.i], M = solidOf(C.k), vi = VP.ensure();
    kBtns.forEach(function (b, i) { b.classList.toggle('sel', i === st.i); });
    tag.innerHTML = SOLID_DEF[C.k].name + (vi >= 0 ? ' <small class="vcount">이 꼭짓점: 면 ' + M.VF[vi].length + '개</small>' : '');
    stamp.className = 'stamp ' + (C.yes ? 'yes' : 'no'); stamp.textContent = C.yes ? '정다면체 ○' : '정다면체가 아니에요 ✕';
    chips.innerHTML = '<p class="hint1">정다면체의 조건 (정다각형의 <b>변</b>과 <b>각</b>을 떠올려 보세요)</p>' + COND.map(function (c, j) { var on = st.chip[c[0]]; return '<button class="chip ' + (on ? 'on solid' : '') + '" data-c="' + c[0] + '">' + (j + 1) + '. ' + (on ? c[1] : '？？？ <small>(' + c[2] + ')</small>') + '</button>'; }).join('');
    var h = '<table class="ctab"><tr><th></th><th>조건 1</th><th>조건 2</th></tr>';
    CHECK.forEach(function (c, i) {
      h += '<tr' + (i === st.i ? ' class="cur"' : '') + '><th>' + SOLID_DEF[c.k].name + '</th>' + ['c1', 'c2'].map(function (m) { var k = i + m, on = st.rev[k]; return '<td data-k="' + k + '" class="' + (on ? 'rev ' + (c[m] ? 'okc' : 'noc') : 'q') + '">' + (on ? (c[m] ? '○' : '✕') : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>';
    note.hidden = !(C.why && st.rev[st.i + 'c1'] && st.rev[st.i + 'c2']);
    if (C.why) note.innerHTML = C.why + '<br>정다각형에서 <b>' + C.like + '</b>가 안 되는 것과 같은 까닭이에요.';
  }
  chips.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; st.chip[b.dataset.c] = !st.chip[b.dataset.c]; upd(); });
  tbl.addEventListener('click', function (e) { var td = e.target.closest('td[data-k]'); if (!td) return; st.i = Number(td.dataset.k[0]); VP.reset(); st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
  upd(); S.reset(0.42);
  return {
    frame: function (dt, col) { if (S.tick(dt)) drawVertexFaces(S.cv, solidOf(CHECK[st.i].k), S.mat, 0.42, VP.vi, col); },
    primary: function () { if (!st.chip.c1) st.chip.c1 = true; else if (!st.chip.c2) st.chip.c2 = true; else if (st.i < CHECK.length - 1) { st.i++; VP.reset(); } upd(); }
  };
}

// ---- 정다면체의 뜻 ----
function sceneDefine2(main) {
  main.appendChild(el('div', 'scene-head', '<h2>정다면체의 뜻</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { open: {}, k: 0, t: 0 };
  var PARTS = [['a', '합동인 정다각형'], ['b', '꼭짓점'], ['c', '면의 개수']];
  var sent = el('div', 'sent big2'); panel.appendChild(sent);
  var row = el('div', 'row'), bReset = el('button', '', '빈칸 다시 가리기'); row.appendChild(bReset); panel.appendChild(row);
  panel.appendChild(el('p', 'callout', '정다면체는 <b>정사면체 · 정육면체 · 정팔면체 · 정십이면체 · 정이십면체</b>, 이 <b>다섯 가지뿐</b>이에요. 왜 다섯 가지뿐인지는 도전 문제에서!'));
  function chip(id) { var on = st.open[id], txt = PARTS.filter(function (p) { return p[0] === id; })[0][1]; return '<button class="chip poly' + (on ? ' on' : '') + '" data-id="' + id + '">' + (on ? txt : '？？？') + '</button>'; }
  function draw() { sent.innerHTML = '각 면이 모두 ' + chip('a') + '이고,<br>각 ' + chip('b') + '에 모인 ' + chip('c') + '가 같은 다면체를 <b class="c-edge">정다면체</b>라고 해요.'; }
  sent.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; st.open[b.dataset.id] = !st.open[b.dataset.id]; draw(); });
  bReset.onclick = function () { st.open = {}; draw(); };
  draw(); tag.textContent = SOLID_DEF[REG5[0]].name; S.reset(0.42);
  return {
    frame: function (dt, col) { st.t += dt; if (st.t > 3000) { st.t = 0; st.k = (st.k + 1) % 5; tag.textContent = SOLID_DEF[REG5[st.k]].name; } if (S.tick(dt)) render(S.cv, solidOf(REG5[st.k]), S.mat, 0, 0.42, 3, col); },
    primary: function () { var nx = PARTS.filter(function (p) { return !st.open[p[0]]; })[0]; if (nx) { st.open[nx[0]] = true; draw(); } }
  };
}

// ---- 한 꼭짓점에 모인 면 (지오픽스와 함께) ----
function sceneVertex(main) {
  main.appendChild(el('div', 'scene-head', '<h2>한 꼭짓점에 모인 면 — 지오픽스로 만들어 보며</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'tetra', rev: {} };
  var VP = VertexPicker(S, function () { return solidOf(st.k); }, 0.42);
  VP.onPick = function () { upd(); };
  var krow = el('div', 'row'), kBtns = {};
  REG5.forEach(function (k) { var b = el('button', 'pick mini', SOLID_DEF[k].name); b.onclick = function () { st.k = k; VP.reset(); S.reset(0.42); upd(); }; krow.appendChild(b); kBtns[k] = b; });
  panel.appendChild(krow);
  panel.appendChild(el('p', 'lead', '꼭짓점을 눌러 보세요. 어느 꼭짓점을 눌러도 모인 면의 개수가 같아요.'));
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
  function upd() {
    Object.keys(kBtns).forEach(function (x) { kBtns[x].classList.toggle('sel', x === st.k); });
    var M = solidOf(st.k), vi = VP.ensure();
    tag.innerHTML = SOLID_DEF[st.k].name + ' <small class="vcount">이 꼭짓점: 면 ' + M.VF[vi].length + '개</small>';
    var h = '<table class="ctab big"><tr><th></th><th>면의 모양</th><th>한 꼭짓점에<br>모인 면의 개수</th></tr>';
    REG5.forEach(function (k) {
      var D = SOLID_DEF[k];
      h += '<tr data-row="' + k + '"' + (k === st.k ? ' class="cur"' : '') + '><th class="rowpick">' + D.name + '</th>' + [['f', D.face], ['q', D.q]].map(function (x) { var key = k + x[0], on = st.rev[key]; return '<td data-k="' + key + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? x[1] : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>';
  }
  tbl.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-row]'), td = e.target.closest('td[data-k]');
    if (tr && tr.dataset.row !== st.k) { st.k = tr.dataset.row; VP.reset(); S.reset(0.42); }
    if (td) st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1;
    upd();
  });
  bAll.onclick = function () { var ks = []; REG5.forEach(function (k) { ks.push(k + 'f', k + 'q'); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); upd(); };
  upd(); S.reset(0.42);
  return {
    frame: function (dt, col) { if (S.tick(dt)) drawVertexFaces(S.cv, solidOf(st.k), S.mat, 0.42, VP.vi, col); },
    primary: function () { var k = st.k; if (!st.rev[k + 'f']) st.rev[k + 'f'] = 1; else if (!st.rev[k + 'q']) st.rev[k + 'q'] = 1; else { var i = REG5.indexOf(k); if (i < 4) { st.k = REG5[i + 1]; VP.reset(); S.reset(0.42); } } upd(); }
  };
}

// ---- 정다면체 표 (교과서 표) ----
function sceneTable2(main) {
  main.appendChild(el('div', 'scene-head', '<h2>다섯 가지 정다면체 정리하기</h2>'));
  var two = el('div', 'two t7'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'tetra', rev: {} };
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
  panel.appendChild(el('p', 'note', '도형 이름을 누르면 왼쪽에 나와요. 개수 칸을 열면 층으로 센 식도 함께 보여요.'));
  var COLS = [['face', '면의 모양'], ['q', '한 꼭짓점에\n모인 면'], ['f', '면'], ['e', '모서리'], ['v', '꼭짓점']];
  function val(k, c) {
    var D = SOLID_DEF[k]; if (c === 'face') return D.face; if (c === 'q') return D.q;
    var LV = levelsOf(solidOf(k)), parts = LV.steps.map(function (s) { return s[c]; }).filter(function (x) { return x > 0; });
    return '<b>' + parts.reduce(function (a, b) { return a + b; }, 0) + '</b><small class="brk">' + parts.join('+') + '</small>';
  }
  function upd() {
    tag.textContent = SOLID_DEF[st.k].name;
    var h = '<table class="ctab analyze"><tr><th></th>' + COLS.map(function (c) { return '<th class="' + ({ f: 'c-face', e: 'c-edge', v: 'c-vertex' }[c[0]] || '') + '">' + c[1].replace('\n', '<br>') + '</th>'; }).join('') + '</tr>';
    REG5.forEach(function (k) {
      h += '<tr data-row="' + k + '"' + (k === st.k ? ' class="cur"' : '') + '><th class="rowpick">' + SOLID_DEF[k].name + '</th>' + COLS.map(function (c) { var key = k + c[0], on = st.rev[key]; return '<td data-k="' + key + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? val(k, c[0]) : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>';
  }
  tbl.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-row]'), td = e.target.closest('td[data-k]'); if (tr) { st.k = tr.dataset.row; S.reset(0.42); } if (td) st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
  bAll.onclick = function () { var ks = []; REG5.forEach(function (k) { COLS.forEach(function (c) { ks.push(k + c[0]); }); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); upd(); };
  upd(); S.reset(0.42);
  return {
    frame: function (dt, col) { if (S.tick(dt)) render(S.cv, solidOf(st.k), S.mat, 0, 0.42, 3, col); },
    primary: function () { var ks = []; REG5.forEach(function (k) { COLS.forEach(function (c) { ks.push(k + c[0]); }); }); var k = ks.filter(function (x) { return !st.rev[x]; })[0]; if (k) { st.k = k.replace(/(face|q|f|e|v)$/, ''); st.rev[k] = 1; upd(); } }
  };
}

// ---- 쌍뿔 가족: 점 – n각형 – 점 ----
function sceneBipyr(main) {
  main.appendChild(el('div', 'scene-head', '<h2>쌍뿔 가족 비교하기 — 점 · n각형 · 점</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var KEYS = { 3: 'bi3', 4: 'octa', 5: 'bi5' }, st = { n: 3, where: 'top', rev: {} };
  function M() { return solidOf(KEYS[st.n]); }
  function vtx() { var m = M(), ys = m.V.map(function (v) { return v[1]; }), top = ys.indexOf(Math.max.apply(null, ys)); if (st.where === 'top') return top; var rot = rotFn(S.mat), best = -1, bz = -1e9; m.V.forEach(function (v, i) { if (Math.abs(v[1]) < 1e-6) { var z = rot(v[0], v[1], v[2])[2]; if (z > bz) { bz = z; best = i; } } }); return best; }
  var nrow = el('div', 'row', '<span class="lab">가운데</span>'), nBtns = {};
  [3, 4, 5].forEach(function (n) { var b = el('button', 'pick mini', NAMES[n] + '형'); b.onclick = function () { st.n = n; S.reset(0.3); upd(); }; nrow.appendChild(b); nBtns[n] = b; });
  panel.appendChild(nrow);
  var wrow = el('div', 'row', '<span class="lab">꼭짓점</span>'), wBtns = {};
  [['top', '꼭대기 점'], ['mid', '가운데 점']].forEach(function (x) { var b = el('button', 'pick mini', x[1]); b.onclick = function () { st.where = x[0]; upd(); }; wrow.appendChild(b); wBtns[x[0]] = b; });
  panel.appendChild(wrow);
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
  function upd() {
    Object.keys(nBtns).forEach(function (n) { nBtns[n].classList.toggle('sel', Number(n) === st.n); });
    Object.keys(wBtns).forEach(function (w) { wBtns[w].classList.toggle('sel', w === st.where); });
    tag.textContent = SOLID_DEF[KEYS[st.n]].name;
    var h = '<table class="ctab big"><tr><th>가운데</th><th>꼭대기 점에<br>모인 면</th><th>가운데 점에<br>모인 면</th><th>정다면체?</th></tr>';
    [3, 4, 5].forEach(function (n) {
      h += '<tr' + (n === st.n ? ' class="cur"' : '') + '><th>' + NAMES[n] + '형</th>' + [['t', n], ['m', 4], ['r', n === 4 ? '○' : '✕']].map(function (x) { var k = n + x[0], on = st.rev[k]; return '<td data-k="' + k + '" class="' + (on ? 'rev' + (x[0] === 'r' ? (n === 4 ? ' okc' : ' noc') : '') : 'q') + '">' + (on ? x[1] : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>';
    note.hidden = !(st.rev['3m'] && st.rev['5m']);
    note.innerHTML = '가운데 점에는 언제나 면이 <b>4개</b>(위 2개 + 아래 2개), 꼭대기 점에는 <b><i>n</i>개</b>가 모여요.<br>둘이 같아지는 것은 <i>n</i> = 4일 때뿐 → <b>정팔면체</b>!';
  }
  tbl.addEventListener('click', function (e) { var td = e.target.closest('td[data-k]'); if (!td) return; st.n = Number(td.dataset.k[0]); st.where = td.dataset.k[1] === 'm' ? 'mid' : 'top'; st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
  upd(); S.reset(0.3);
  return {
    frame: function (dt, col) { if (S.tick(dt)) drawVertexFaces(S.cv, M(), S.mat, 0.42, vtx(), col); },
    primary: function () { var order = []; [3, 4, 5].forEach(function (n) { order.push(n + 't', n + 'm', n + 'r'); }); var k = order.filter(function (x) { return !st.rev[x]; })[0]; if (k) { st.n = Number(k[0]); st.where = k[1] === 'm' ? 'mid' : 'top'; st.rev[k] = 1; upd(); } }
  };
}

// ---- 도전: 정다각형을 한 점에 모으기 (왜 다섯 가지뿐일까?) ----
function fanMesh(m, k) {   // 한 변이 1인 정m각형 k개를 한 점에 모은 모양
  var alpha = (m - 2) * Math.PI / m, total = alpha * k, V = [], F = [];
  function addPoly(e1, e2, off) {   // 꼭짓점(원점)에서 e1, e2 방향으로 두 변이 나가는 정다각형
    var beta = 2 * Math.PI / m, p = [0, 0], idx = [], dir = 0;
    for (var j = 0; j < m; j++) {
      idx.push(V.length); V.push([p[0] * e1[0] + p[1] * e2[0], p[0] * e1[1] + p[1] * e2[1] + off, p[0] * e1[2] + p[1] * e2[2]]);
      p = [p[0] + Math.cos(dir), p[1] + Math.sin(dir)]; dir += beta;
    }
    F.push(idx);
  }
  if (total < 2 * Math.PI - 1e-6) {   // 뾰족한 꼭짓점 (원뿔처럼)
    var sinT = Math.sin(alpha / 2) / Math.sin(Math.PI / k), th = Math.asin(Math.min(1, sinT));
    var U = []; for (var i = 0; i < k; i++) { var a = i * 2 * Math.PI / k; U.push([Math.sin(th) * Math.cos(a), -Math.cos(th), Math.sin(th) * Math.sin(a)]); }
    for (var i2 = 0; i2 < k; i2++) { var u = U[i2], w = U[(i2 + 1) % k], c = dot(u, w), e2 = norm([w[0] - c * u[0], w[1] - c * u[1], w[2] - c * u[2]]); addPoly(u, e2, 0); }
  } else {   // 평평하거나 (360°) 겹침 (360° 넘음): 바닥에 차례로 펼치기
    for (var i3 = 0; i3 < k; i3++) { var a1 = i3 * alpha; addPoly([Math.cos(a1), 0, Math.sin(a1)], [Math.cos(a1 + Math.PI / 2), 0, Math.sin(a1 + Math.PI / 2)], i3 * 0.004); }
  }
  // 겹치는 점 합치기 (모서리를 공유하게)
  var map = [], U2 = [];
  V.forEach(function (v) { var f = -1; for (var q = 0; q < U2.length; q++) if (Math.hypot(U2[q][0] - v[0], U2[q][1] - v[1], U2[q][2] - v[2]) < 1e-3) { f = q; break; } if (f < 0) { f = U2.length; U2.push(v); } map.push(f); });
  var Mo = finish({ V: U2, F: F.map(function (f) { return f.map(function (x) { return map[x]; }); }), open: true });
  var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; U2.forEach(function (v) { for (var t = 0; t < 3; t++) { lo[t] = Math.min(lo[t], v[t]); hi[t] = Math.max(hi[t], v[t]); } });
  Mo.c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; Mo.R = Math.max(1.2, Math.hypot(hi[0] - lo[0], hi[2] - lo[2]) / 2 * 1.05);
  return { M: Mo, sum: Math.round(total * 180 / Math.PI), state: total < 2 * Math.PI - 1e-6 ? 'ok' : Math.abs(total - 2 * Math.PI) < 1e-6 ? 'flat' : 'over' };
}
function sceneFan(main) {
  main.appendChild(el('div', 'scene-head', '<h2>도전: 정다각형을 한 점에 모아 보기 — 정다면체는 왜 다섯 가지뿐일까?</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag'), stamp = S.add('stamp');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { m: 3, k: 3, seen: {} }, cache = {};
  function cur() { var key = st.m + '_' + st.k; return cache[key] || (cache[key] = fanMesh(st.m, st.k)); }
  var mrow = el('div', 'row', '<span class="lab">면 모양</span>'), mBtns = {};
  [3, 4, 5, 6].forEach(function (m) { var b = el('button', 'pick mini', '정' + NAMES[m] + '형'); b.onclick = function () { st.m = m; st.k = 3; upd(); }; mrow.appendChild(b); mBtns[m] = b; });
  var krow = el('div', 'row', '<span class="lab">모으는 개수</span>'), kBtns = {};
  [3, 4, 5, 6].forEach(function (k) { var b = el('button', 'pick mini', k + '개'); b.onclick = function () { st.k = k; upd(); }; krow.appendChild(b); kBtns[k] = b; });
  panel.appendChild(el('p', 'lead', '지오픽스처럼 정다각형을 한 점에 모아 보세요. 뾰족한 꼭짓점이 생길까요?'));
  panel.appendChild(mrow); panel.appendChild(krow);
  var info = el('p', 'hint1'); panel.appendChild(info);
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
  var NAMEOF = { '3_3': '정사면체', '3_4': '정팔면체', '3_5': '정이십면체', '4_3': '정육면체', '5_3': '정십이면체' };
  function upd() {
    var F = cur(), ang = (st.m - 2) * 180 / st.m;
    st.seen[st.m + '_' + st.k] = F.state;
    Object.keys(mBtns).forEach(function (m) { mBtns[m].classList.toggle('sel', Number(m) === st.m); });
    Object.keys(kBtns).forEach(function (k) { kBtns[k].classList.toggle('sel', Number(k) === st.k); });
    tag.textContent = '정' + NAMES[st.m] + '형 ' + st.k + '개';
    stamp.className = 'stamp ' + (F.state === 'ok' ? 'yes' : 'no');
    stamp.textContent = F.state === 'ok' ? '꼭짓점이 생겨요 ○' : F.state === 'flat' ? '평평해져요 ✕' : '겹쳐요 ✕';
    info.innerHTML = '한 각 ' + ang + '° × ' + st.k + '개 = <b>' + F.sum + '°</b> ' + (F.state === 'ok' ? '&lt; 360°' : F.state === 'flat' ? '= 360°' : '&gt; 360°') + (F.state === 'ok' && NAMEOF[st.m + '_' + st.k] ? ' → <b>' + NAMEOF[st.m + '_' + st.k] + '</b>의 꼭짓점' : '');
    var h = '<table class="ctab"><tr><th></th>' + [3, 4, 5, 6].map(function (k) { return '<th>' + k + '개</th>'; }).join('') + '</tr>';
    [3, 4, 5, 6].forEach(function (m) { h += '<tr><th>정' + NAMES[m] + '형</th>' + [3, 4, 5, 6].map(function (k) { var s = st.seen[m + '_' + k]; return '<td class="' + (s ? (s === 'ok' ? 'okc' : 'noc') : 'nb') + '">' + (s ? (s === 'ok' ? '○' : '✕') : '·') + '</td>'; }).join('') + '</tr>'; });
    tbl.innerHTML = h + '</table>';
    var oks = Object.keys(st.seen).filter(function (k) { return st.seen[k] === 'ok'; }).length;
    note.hidden = oks < 5;
    note.innerHTML = '꼭짓점이 생기려면 한 점에 모인 각의 합이 <b>360°보다 작아야</b> 해요. 그런 경우는 ○ 다섯 칸뿐 → 정다면체는 <b>다섯 가지뿐</b>!';
  }
  upd(); S.reset(0.22);
  return {
    frame: function (dt, col) { if (S.tick(dt)) render(S.cv, cur().M, S.mat, 0, 0.42, 3, col); },
    primary: function () { if (st.k < 6) st.k++; else if (st.m < 6) { st.m++; st.k = 3; } upd(); }
  };
}

// ---- 도전: 면 × 변 ÷ 2 로 검산하기 ----
function sceneCheck(main) {
  main.appendChild(el('div', 'scene-head', '<h2>도전: 다른 방법으로 세어 보기 — 면 × 변 ÷ 2</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'tetra', rev: {} }, SIDE = { '정삼각형': 3, '정사각형': 4, '정오각형': 5 };
  var VP = VertexPicker(S, function () { return solidOf(st.k); }, 0.42); VP.onPick = function () { upd(); };
  panel.appendChild(el('p', 'lead', '면마다 변을 세면 모서리를 몇 번씩 센 걸까요? 꼭짓점은요? 층으로 센 답과 같은지 확인해요.'));
  var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
  var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
  function upd() {
    tag.textContent = SOLID_DEF[st.k].name;
    var h = '<table class="ctab analyze"><tr><th></th><th class="c-edge">모서리 = 면 × 변 ÷ 2</th><th class="c-vertex">꼭짓점 = 면 × 변 ÷ (모인 면)</th></tr>';
    REG5.forEach(function (k) {
      var D = SOLID_DEF[k], M = solidOf(k), F = M.F.length, s = SIDE[D.face];
      h += '<tr data-row="' + k + '"' + (k === st.k ? ' class="cur"' : '') + '><th class="rowpick">' + D.name + '</th>' +
        [['e', F + ' × ' + s + ' ÷ 2 = <b>' + (F * s / 2) + '</b>'], ['v', F + ' × ' + s + ' ÷ ' + D.q + ' = <b>' + (F * s / D.q) + '</b>']].map(function (x) { var key = k + x[0], on = st.rev[key]; return '<td data-k="' + key + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? x[1] : '?') + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = h + '</table>';
  }
  tbl.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-row]'), td = e.target.closest('td[data-k]'); if (tr && tr.dataset.row !== st.k) { st.k = tr.dataset.row; VP.reset(); S.reset(0.42); } if (td) st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
  bAll.onclick = function () { var ks = []; REG5.forEach(function (k) { ks.push(k + 'e', k + 'v'); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); upd(); };
  upd(); S.reset(0.42);
  return { frame: function (dt, col) { if (S.tick(dt)) drawVertexFaces(S.cv, solidOf(st.k), S.mat, 0.42, VP.vi, col); } };
}

// ---- 도전: 원과 등분점으로 겨냥도 그리기 ----
function sceneCircles(main) {
  main.appendChild(el('div', 'scene-head', '<h2>도전: 원과 등분점으로 겨냥도 그리기</h2>'));
  var two = el('div', 'two'); main.appendChild(two);
  var S = Stage(two), tag = S.add('tag');
  var panel = el('div', 'panel'); two.appendChild(panel);
  var st = { k: 'octa', step: 1, animT0: performance.now() };
  var krow = el('div', 'row'), kBtns = {};
  ['cube', 'octa', 'icosa', 'dodeca'].forEach(function (k) { var b = el('button', 'pick mini', SOLID_DEF[k].name); b.onclick = function () { st.k = k; st.step = 1; st.animT0 = performance.now(); upd(); }; krow.appendChild(b); kBtns[k] = b; });
  panel.appendChild(krow);
  var lrow = el('div', 'row'), bStep = el('button', 'primary', ''); bStep.onclick = function () { var LV = levelsOf(solidOf(st.k)); st.step = st.step < LV.max ? st.step + 1 : 1; st.animT0 = performance.now(); upd(); };
  lrow.appendChild(bStep); panel.appendChild(lrow);
  var tips = el('div', 'drawtips'); panel.appendChild(tips);
  panel.appendChild(el('p', 'note', '고정 축을 켜고 <b>밑면 평행</b>을 누르면 교과서 겨냥도처럼 보여요. 연한 원은 층마다 그리는 안내 원이에요.'));
  function upd() {
    Object.keys(kBtns).forEach(function (x) { kBtns[x].classList.toggle('sel', x === st.k); });
    var LV = levelsOf(solidOf(st.k));
    tag.textContent = SOLID_DEF[st.k].name;
    bStep.textContent = st.step < LV.max ? '다음 → (' + LV.steps[st.step].name + ')' : '처음부터 ↺';
    tips.innerHTML = LV.steps.map(function (s) {
      var t = s.between ? (s.zig ? '아래 층 점과 위 층 점을 <b>지그재그</b>로 이어요.' : '아래 층 점과 위 층 점을 이어요.') : (s.v === 1 ? '<b>점 하나</b>를 찍어요 (원의 중심 위나 아래).' : '원을 그리고 <b>' + s.v + '등분점</b>을 찍어요' + (s.e ? ', 이웃한 점끼리 이어요.' : '.'));
      return '<p class="' + (s.s === st.step ? 'on' : s.s < st.step ? 'done' : '') + '"><b>' + s.name + '</b>: ' + t + '</p>';
    }).join('');
  }
  function guides(col) {   // 층마다 안내 원
    var M = solidOf(st.k), LV = levelsOf(M), P = projector(S.cv, M, S.mat, 0.42), ctx = S.cv.getContext('2d');
    LV.ys.forEach(function (y, i) {
      var s = LV.steps.filter(function (x) { return !x.between; })[i]; if (!s || s.s > st.step || s.v < 3) return;
      var v = M.V.filter(function (p) { return p[1] === y; })[0], r = Math.hypot(v[0], v[2]);
      ctx.beginPath(); for (var t = 0; t <= 64; t++) { var a = t / 64 * Math.PI * 2, q = P([r * Math.cos(a), y, r * Math.sin(a)]); t ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      ctx.setLineDash([4, 5]); ctx.strokeStyle = col.edge; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
  }
  upd(); S.reset(0.32);
  return {
    frame: function (dt, col) { if (S.tick(dt)) { var M = solidOf(st.k); drawLayersG(S.cv, M, levelsOf(M), st.step, st.animT0, S.mat, 0, 0.42, col, true); guides(col); } },
    primary: function () { bStep.onclick(); }
  };
}

// ================= 장면 순서 =================
var LESSON2_PAGE = '교과서 P. 213 ~ 214';   // ← 교과서 쪽수가 다르면 여기만 고치면 돼요
var SECS = ['도입', '정다면체의 뜻', '다섯 가지 정다면체', '쌍뿔 비교', '도전'];
var SCENES = [
  { sec: 0, title: '표지', mount: sceneCover2 },
  { sec: 0, title: '학습목표', mount: sceneGoal2, ws: '학습목표' },
  { sec: 0, title: '지난 시간: 층으로 세기', mount: sceneLevels({ title: '지난 시간 떠올리기 — 층마다 세어 볼까요?', shapes: ['tetra', 'cube'], lead: '정사면체는 <b>삼각뿔</b>, 정육면체는 <b>사각기둥</b>이에요. 지난 시간처럼 층마다 세어 보세요.', foot: '그런데 이 두 입체의 이름에는 왜 <b>"정"</b>이 붙었을까요?' }), ws: '떠올려 봅시다' },
  { sec: 1, title: '정다각형 떠올리기', mount: scenePolygons, ws: '떠올려 봅시다' },
  { sec: 1, title: '정다면체의 조건 예측 · 확인', mount: sceneConditions, ws: '주요개념' },
  { sec: 1, title: '정다면체의 뜻', mount: sceneDefine2, ws: '주요개념' },
  { sec: 2, title: '한 꼭짓점에 모인 면', mount: sceneVertex, ws: '생각익히기' },
  { sec: 2, title: '선을 이어 쌓기', mount: sceneLevels({ title: '선을 이어 쌓기 — 1층에서 선을 올리면 다음 층이 생겨요', shapes: REG5, lf: true, lead: '<b>1층</b>을 놓고 → <b>층 사이 선</b>을 위로 그으면 → 선 끝에 <b>다음 층</b>이 생겨요. 정이십면체는 점 · 오각형 · 오각형 · 점으로 쌓여요.' }), ws: '생각익히기' },
  { sec: 2, title: '접어서 쌓기', mount: sceneBuild, ws: '생각익히기' },
  { sec: 2, title: '정다면체 정리하기', mount: sceneTable2, ws: '정리' },
  { sec: 3, title: '쌍뿔 가족 비교', mount: sceneBipyr, ws: '생각 넓히기' },
  { sec: 4, title: '도전: 정다각형 모으기', mount: sceneFan, ws: '도전문제' },
  { sec: 4, title: '도전: 면 × 변 ÷ 2', mount: sceneCheck, ws: '도전문제' },
  { sec: 4, title: '도전: 원과 등분점', mount: sceneCircles, ws: '도전문제' }
];
startLesson(SECS, SCENES);
