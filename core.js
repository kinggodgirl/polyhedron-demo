// 입체도형 수업 웹앱 — 공통 엔진 (도형 만들기 · 무대 · 2D 그리기 · 세기 · 층 쌓기 · 공 넣기 · 장면 넘기기)
// 차시 파일(lesson1.js, lesson2.js …)이 SECS와 SCENES를 정한 뒤 startLesson(SECS, SCENES)을 부른다.
  // ---------- 도형 만들기 (꼭짓점 V, 면 F: 바깥에서 볼 때 반시계 순서) ----------
  function regular(n, r) { var off = n === 4 ? Math.PI / 4 : -Math.PI / 2, p = []; for (var i = 0; i < n; i++) { var a = off + i * 2 * Math.PI / n; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }
  function circle(n, r) { var p = []; for (var i = 0; i < n; i++) { var a = i * 2 * Math.PI / n; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }
  function star(n, r1, r2) { var p = []; for (var i = 0; i < 2 * n; i++) { var a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }
  // 바닥 다각형(x, z)을 위로 세운다. top: 1 기둥, 0 뿔, 그 사이 뿔대. noTop: 뚜껑 없음
  function extrude(poly, h, o) {
    o = o || {}; var s = o.top === undefined ? 1 : o.top, dx = o.dx || 0, dz = o.dz || 0, n = poly.length, ny = 0, i, j;
    for (i = 0; i < n; i++) { j = (i + 1) % n; ny += (poly[i][1] - poly[j][1]) * (poly[i][0] + poly[j][0]); }
    if (ny < 0) poly = poly.slice().reverse();
    var V = poly.map(function (p) { return [p[0], -h / 2, p[1]]; }), F = [], bottom = [];
    for (i = n - 1; i >= 0; i--) bottom.push(i);
    F.push(bottom);
    if (s === 0) { V.push([dx, h / 2, dz]); for (i = 0; i < n; i++) F.push([i, (i + 1) % n, n]); }
    else {
      poly.forEach(function (p) { V.push([p[0] * s + dx, h / 2, p[1] * s + dz]); });
      if (!o.noTop) { var top = []; for (i = 0; i < n; i++) top.push(n + i); F.push(top); }
      for (i = 0; i < n; i++) { j = (i + 1) % n; F.push([i, j, n + j, n + i]); }
    }
    return { V: V, F: F, open: !!o.noTop, box: !!o.noTop };
  }
  // 옆모습 [반지름, 높이]를 아래에서 위로 돌려 만든 회전체
  function lathe(prof, seg) {
    var V = [], ring = [], F = [], i, j;
    prof.forEach(function (p) {
      if (p[0] < 1e-6) { ring.push([V.length]); V.push([0, p[1], 0]); }
      else { var r = []; for (j = 0; j < seg; j++) { var a = j * 2 * Math.PI / seg; r.push(V.length); V.push([p[0] * Math.cos(a), p[1], p[0] * Math.sin(a)]); } ring.push(r); }
    });
    function at(i2, j2) { var r = ring[i2]; return r.length === 1 ? r[0] : r[j2 % seg]; }
    for (i = 0; i < prof.length - 1; i++) for (j = 0; j < seg; j++) {
      var f = [];
      [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)].forEach(function (k) { if (f[f.length - 1] !== k) f.push(k); });
      if (f.length > 1 && f[0] === f[f.length - 1]) f.pop();
      if (f.length >= 3) F.push(f);
    }
    return { V: V, F: F };
  }
  function arc(r, y0, steps, from) { var p = []; for (var k = from; k <= steps; k++) { var t = Math.PI / 2 * k / steps; p.push([r * Math.cos(t), y0 + r * Math.sin(t)]); } return p; }
  function lay(m) { m.V = m.V.map(function (v) { return [v[0], -v[2], v[1]]; }); return m; }   // x축으로 90° 돌려 눕히기
  function newell(V, f) {
    var n = [0, 0, 0];
    for (var k = 0; k < f.length; k++) { var a = V[f[k]], b = V[f[(k + 1) % f.length]]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    var l = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / l, n[1] / l, n[2] / l];
  }
  function convex(V, F) {   // 볼록한 도형: 중심에서 멀어지는 쪽이 바깥
    var c = [0, 0, 0]; V.forEach(function (v) { c[0] += v[0] / V.length; c[1] += v[1] / V.length; c[2] += v[2] / V.length; });
    F = F.map(function (f) {
      var n = newell(V, f), m = [0, 0, 0]; f.forEach(function (k) { m[0] += V[k][0] / f.length; m[1] += V[k][1] / f.length; m[2] += V[k][2] / f.length; });
      return n[0] * (m[0] - c[0]) + n[1] * (m[1] - c[1]) + n[2] * (m[2] - c[2]) < 0 ? f.slice().reverse() : f;
    });
    return { V: V, F: F };
  }
  function finish(m) {
    m.N = m.F.map(function (f) { return newell(m.V, f); });
    var seen = {}; m.E = []; m.FE = m.F.map(function (f, fi) {
      return f.map(function (a, k) {
        var b = f[(k + 1) % f.length], key = Math.min(a, b) + '-' + Math.max(a, b);
        if (seen[key] === undefined) { seen[key] = m.E.length; m.E.push({ a: a, b: b, f: [fi] }); } else m.E[seen[key]].f.push(fi);
        return seen[key];
      });
    });
    // 날카로운 모서리(면이 꺾이는 곳)와 테두리만 선으로 그린다. 곡면의 잔 조각 사이는 그리지 않는다
    m.E.forEach(function (e) { e.sharp = e.f.length < 2 || (function (p, q) { return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; })(m.N[e.f[0]], m.N[e.f[1]]) < 0.9; });
    // 곡면 조각: 이웃 조각과 법선을 평균내어 꼭짓점마다 부드러운 법선을 둔다 (그러데이션으로 칠하기)
    var vf = {}; m.F.forEach(function (f, i) { f.forEach(function (v) { (vf[v] = vf[v] || []).push(i); }); });
    m.smooth = m.F.map(function (f, i) { return m.FE[i].some(function (ei) { return !m.E[ei].sharp; }); });
    m.VN = m.F.map(function (f, i) {
      if (!m.smooth[i]) return null;
      var ni = m.N[i];
      return f.map(function (v) {
        var s = [0, 0, 0];
        vf[v].forEach(function (j) { var nj = m.N[j]; if (nj[0] * ni[0] + nj[1] * ni[1] + nj[2] * ni[2] > 0.8) { s[0] += nj[0]; s[1] += nj[1]; s[2] += nj[2]; } });
        var l = Math.hypot(s[0], s[1], s[2]) || 1; return [s[0] / l, s[1] / l, s[2] / l];
      });
    });
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    m.V.forEach(function (v) { for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); } });
    m.c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    m.R = 0; m.V.forEach(function (v) { m.R = Math.max(m.R, Math.hypot(v[0] - m.c[0], v[1] - m.c[1], v[2] - m.c[2])); });
    return m;
  }
  function plane(n) { var p = regular(n, 1.1); return { V: p.map(function (q) { return [q[0], 0, q[1]]; }), F: [p.map(function (q, i) { return i; })], open: true }; }
  var halfDisc = []; for (var hk = 0; hk <= 28; hk++) halfDisc.push([Math.cos(Math.PI * hk / 28), -Math.sin(Math.PI * hk / 28)]);
  var sphereProf = []; for (var sk = 0; sk <= 22; sk++) { var st0 = -Math.PI / 2 + Math.PI * sk / 22; sphereProf.push([Math.cos(st0), Math.sin(st0)]); }

  var WHY = {
    poly: '모든 면이 다각형이고, 빈틈없이 둘러싸인 입체도형이에요.',
    dent: '움푹 들어간 곳이 있어도 모든 면이 다각형이면 다면체예요.',
    tilt: '기울어져 있어도 모든 면이 다각형이에요.',
    lie: '눕혀 놓아도 같은 도형이에요. 모든 면이 다각형이에요.',
    cut: '윗면, 아랫면, 옆면이 모두 다각형이에요.',
    curve: '옆면이 굽은 면(곡면)이에요.',
    open: '면은 모두 다각형이지만 위가 뚫려 있어서 둘러싸여 있지 않아요.',
    flat: '두께가 없는 평면도형이에요. 입체도형이 아니에요.'
  };
  // [이름, 다면체인가, 까닭, 만들기]
  var SH = {
    cube: ['정육면체', true, WHY.poly, function () { return extrude(regular(4, 1), 1.414); }],
    cuboidFlat: ['납작한 직육면체', true, WHY.poly, function () { return extrude([[-1.3, -0.8], [1.3, -0.8], [1.3, 0.8], [-1.3, 0.8]], 0.6); }],
    triPrism: ['삼각기둥', true, WHY.poly, function () { return extrude(regular(3, 1), 1.5); }],
    pentPrism: ['오각기둥', true, WHY.poly, function () { return extrude(regular(5, 1), 1.4); }],
    hexPrism: ['육각기둥', true, WHY.poly, function () { return extrude(regular(6, 1), 1.2); }],
    sqPyr: ['사각뿔', true, WHY.poly, function () { return extrude(regular(4, 1), 1.6, { top: 0 }); }],
    pentPyr: ['오각뿔', true, WHY.poly, function () { return extrude(regular(5, 1), 1.5, { top: 0 }); }],
    hexPyr: ['육각뿔', true, WHY.poly, function () { return extrude(regular(6, 1), 1.3, { top: 0 }); }],
    sqFrustum: ['사각뿔대', true, WHY.cut, function () { return extrude(regular(4, 1), 1.2, { top: 0.5 }); }],
    triFrustum: ['삼각뿔대', true, WHY.cut, function () { return extrude(regular(3, 1.1), 1.1, { top: 0.45 }); }],
    obliquePrism: ['기울어진 육면체', true, WHY.tilt, function () { return extrude(regular(4, 0.9), 1.5, { dx: 0.7 }); }],
    lPrism: ['ㄴ자 모양 기둥', true, WHY.dent, function () { return lay(extrude([[-1, -1], [-0.3, -1], [-0.3, 0.3], [1, 0.3], [1, 1], [-1, 1]], 0.9)); }],
    stairPrism: ['계단 모양 기둥', true, WHY.dent, function () { return lay(extrude([[-1.2, 0.9], [1.2, 0.9], [1.2, 0.1], [0.4, 0.1], [0.4, -0.7], [-0.4, -0.7], [-0.4, -1.5], [-1.2, -1.5]], 1.2)); }],
    starPrism: ['별 모양 기둥', true, WHY.dent, function () { return extrude(star(5, 1, 0.45), 0.6); }],
    crossPrism: ['십자 모양 기둥', true, WHY.dent, function () { return extrude([[-0.35, -1], [0.35, -1], [0.35, -0.35], [1, -0.35], [1, 0.35], [0.35, 0.35], [0.35, 1], [-0.35, 1], [-0.35, 0.35], [-1, 0.35], [-1, -0.35], [-0.35, -0.35]], 0.7); }],
    house: ['집 모양 오각기둥', true, WHY.poly, function () { return lay(extrude([[-1, 0.9], [1, 0.9], [1, -0.3], [0, -1.2], [-1, -0.3]], 1.6)); }],
    triPrismLying: ['누운 삼각기둥', true, WHY.lie, function () { return lay(extrude(regular(3, 1), 1.9)); }],
    octa: ['팔면체', true, '삼각형 면 8개로 빈틈없이 둘러싸여 있어요.', function () {
      var V = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1.1, 0], [0, -1.1, 0]], F = [];
      for (var i = 0; i < 4; i++) { F.push([i, (i + 1) % 4, 4]); F.push([i, (i + 1) % 4, 5]); }
      return convex(V, F);
    }],
    oddTet: ['삐뚤빼뚤한 삼각뿔', true, '모양이 삐뚤어도 삼각형 면 4개로 둘러싸여 있어요.', function () {
      return convex([[-1, -0.6, -0.5], [1.2, -0.6, -0.3], [0.1, -0.6, 1], [0.5, 1, 0.2]], [[0, 1, 2], [0, 1, 3], [1, 2, 3], [0, 2, 3]]);
    }],
    cylinder: ['원기둥', false, WHY.curve, function () { return extrude(circle(56, 1), 1.8); }],
    cylinderLying: ['누운 원기둥', false, WHY.curve, function () { return lay(extrude(circle(56, 0.8), 2.2)); }],
    cone: ['원뿔', false, '꼭짓점은 있지만 옆면이 굽은 면이에요.', function () { return extrude(circle(56, 1), 1.8, { top: 0 }); }],
    coneFrustum: ['원뿔대', false, '윗면과 아랫면은 평평하지만 옆면이 굽은 면이에요.', function () { return extrude(circle(56, 1), 1.3, { top: 0.5 }); }],
    sphere: ['구', false, '전체가 굽은 면 하나로 되어 있어요.', function () { return lathe(sphereProf, 44); }],
    hemisphere: ['반구', false, '아랫면은 평평하지만 윗부분이 굽은 면이에요.', function () { return lathe([[0, -0.5], [1, -0.5]].concat(arc(1, -0.5, 14, 1)), 44); }],
    capsule: ['원기둥 위에 반구', false, '옆면과 윗부분이 굽은 면이에요.', function () { return lathe([[0, -1], [0.75, -1], [0.75, 0.3]].concat(arc(0.75, 0.3, 12, 1)), 44); }],
    halfCyl: ['반원기둥', false, '평평한 면이 3개 있지만, 굽은 면이 하나 있어요.', function () { return lay(extrude(halfDisc, 1.8)); }],
    openBox: ['뚜껑 없는 상자', false, WHY.open, function () { return extrude(regular(4, 1), 1.1, { noTop: true }); }],
    openTriBox: ['뚜껑 없는 삼각 상자', false, WHY.open, function () { return extrude(regular(3, 1.1), 1.1, { noTop: true }); }],
    plane5: ['평면 오각형', false, WHY.flat, function () { return plane(5); }],
    plane6: ['평면 육각형', false, WHY.flat, function () { return plane(6); }]
  };
  var MESH = {};
  function mesh(key) { if (!MESH[key]) { var m = SH[key][3](); m.open = !!m.open; MESH[key] = finish(m); if (key === 'cube') MESH[key].ballBox = true; } return MESH[key]; }   // 정육면체: 닫힌 상자로 공 넣기·뒤집기 비교
  // ---------- 그리기 ----------
  var LIGHT = (function () { var l = [-0.35, 0.6, 0.72], s = Math.hypot(l[0], l[1], l[2]); return [l[0] / s, l[1] / s, l[2] / s]; })();
  var HALF = (function () { var h = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], s = Math.hypot(h[0], h[1], h[2]); return [h[0] / s, h[1] / s, h[2] / s]; })();
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function fit(cv) {
    var b = cv.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return false;
    if (b.width !== cv._w || b.height !== cv._h) { cv._w = b.width; cv._h = b.height; cv._d = Math.min(3, window.devicePixelRatio || 1); cv.width = Math.round(cv._w * cv._d); cv.height = Math.round(cv._h * cv._d); }
    return true;
  }
  function matFromYP(yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [cy, 0, sy, sy * sp, cp, -cy * sp, -sy * cp, sp, cy * cp];
  }
  function matMul(a, b) {
    return [
      a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
      a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
      a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8]
    ];
  }
  function matRotX(a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
  function matRotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  function matRotAxis(ux, uy, a) {
    var c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [t*ux*ux + c, t*ux*uy, uy*s, t*ux*uy, t*uy*uy + c, -ux*s, -uy*s, ux*s, c];
  }
  function rotFn(yaw, pitch) {
    var m = Array.isArray(yaw) ? yaw : matFromYP(yaw, pitch);
    return function (x, y, z) { return [m[0]*x + m[1]*y + m[2]*z, m[3]*x + m[4]*y + m[5]*z, m[6]*x + m[7]*y + m[8]*z]; };
  }
  function render(cv, M, yaw, pitch, frac, lw, col) {
    var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    if (use3d(cv) && !M.glass && !M.extra) { G3.draw(cv, { M: M, mat: Array.isArray(yaw) ? yaw : matFromYP(yaw, pitch), frac: frac, lw: lw, col: col }); return; }
    if (G3 && cv._box) G3.hide();
    var sc = Math.min(W, H) * frac / M.R, ox = W / 2, oy = H / 2, rot = rotFn(yaw, pitch);
    var P = M.V.map(function (v) { var r = rot(v[0] - M.c[0], v[1] - M.c[1], v[2] - M.c[2]); return { x: ox + r[0] * sc, y: oy - r[1] * sc, z: r[2] }; });
    var NN = M.N.map(function (n) { return rot(n[0], n[1], n[2]); });
    var front = NN.map(function (n) { return n[2] > 0; }), order = [];
    M.F.forEach(function (f, i) { if (M.open || front[i]) { var z = 0; f.forEach(function (k) { z += P[k].z; }); order.push([z / f.length, i]); } });
    order.sort(function (a, b) { return a[0] - b[0]; });   // 먼 면부터 칠한다
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    order.forEach(function (o) {
      var i = o[1], f = M.F[i], n = NN[i], back = !front[i], sg = back ? -1 : 1;
      var base = (M.tint && M.tint[i]) ? col.alt : col.base, mult = back ? (M.box ? 0.42 : 0.72) : 1;   // 상자의 안쪽 벽은 더 어둡게
      function shade(nx, ny, nz, gloss) {
        var lam = Math.max(0, sg * (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])), h = Math.max(0, sg * (nx * HALF[0] + ny * HALF[1] + nz * HALF[2]));
        var k = (0.55 + 0.5 * lam) * mult, sp = gloss ? 0.2 * Math.pow(h, 8) * mult : 0;   // 곡면에만 반짝이는 빛
        return 'rgb(' + base.map(function (c) { return Math.min(255, Math.round(c * k + 255 * sp)); }).join(',') + ')';
      }
      var fill;
      if (M.VN && M.VN[i]) {
        var S = M.VN[i].map(function (vn) { var r = rot(vn[0], vn[1], vn[2]); return Math.max(0, sg * (r[0] * LIGHT[0] + r[1] * LIGHT[1] + r[2] * LIGHT[2])) + 1.2 * Math.pow(Math.max(0, sg * (r[0] * HALF[0] + r[1] * HALF[1] + r[2] * HALF[2])), 8); });
        var lo = 0, hi = 0; S.forEach(function (s, j) { if (s < S[lo]) lo = j; if (s > S[hi]) hi = j; });
        var rl = rot(M.VN[i][lo][0], M.VN[i][lo][1], M.VN[i][lo][2]), rh = rot(M.VN[i][hi][0], M.VN[i][hi][1], M.VN[i][hi][2]);
        var pl = P[f[lo]], ph = P[f[hi]];
        if (lo !== hi && Math.hypot(ph.x - pl.x, ph.y - pl.y) > 0.5) {
          // 밝기가 같은 모서리(lo와 짝 꼭짓점)에 수직인 방향으로 그러데이션을 건다. 그래야 조각 전체가 고르게 이어진다
          var l2 = -1; S.forEach(function (s, j) { if (j !== lo && j !== hi && (l2 < 0 || Math.abs(s - S[lo]) < Math.abs(S[l2] - S[lo]))) l2 = j; });
          var ex = ph.x, ey = ph.y;
          if (l2 >= 0) {
            var q = P[f[l2]], dx = q.x - pl.x, dy = q.y - pl.y, dl = Math.hypot(dx, dy);
            if (dl > 0.5) { dx /= dl; dy /= dl; var wx = ph.x - pl.x, wy = ph.y - pl.y, t = wx * dx + wy * dy; ex = pl.x + wx - t * dx; ey = pl.y + wy - t * dy; }
          }
          if (Math.hypot(ex - pl.x, ey - pl.y) < 0.3) { ex = ph.x; ey = ph.y; }
          fill = ctx.createLinearGradient(pl.x, pl.y, ex, ey);
          fill.addColorStop(0, shade(rl[0], rl[1], rl[2], true)); fill.addColorStop(1, shade(rh[0], rh[1], rh[2], true));
        } else fill = shade(rl[0], rl[1], rl[2], true);
      } else fill = shade(n[0], n[1], n[2], false);
      ctx.beginPath(); f.forEach(function (v, j) { j ? ctx.lineTo(P[v].x, P[v].y) : ctx.moveTo(P[v].x, P[v].y); }); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 1; ctx.stroke();   // 곡면 조각 사이 틈 메우기
      ctx.beginPath();
      if (!(M.noEdge && M.noEdge[i])) M.FE[i].forEach(function (ei) {
        var e = M.E[ei];
        if (e.sharp || (!M.open && e.f.some(function (g) { return !front[g]; }))) { ctx.moveTo(P[e.a].x, P[e.a].y); ctx.lineTo(P[e.b].x, P[e.b].y); }
      });
      ctx.strokeStyle = col.fg; ctx.lineWidth = lw; ctx.stroke();
    });
    function scr(p) { var r = rot(p[0] - M.c[0], p[1] - M.c[1], p[2] - M.c[2]); return [ox + r[0] * sc, oy - r[1] * sc]; }
    (M.glass || []).forEach(function (g) {   // 자르는 칼날(반투명 판)
      ctx.beginPath(); g.forEach(function (p, j) { var q = scr(p); j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath();
      ctx.globalAlpha = 0.3; ctx.fillStyle = col.glass; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = col.glass; ctx.lineWidth = 2; ctx.stroke();
    });
    if (M.extra) {   // 옆 모서리를 늘린 점선
      ctx.setLineDash([6, 6]); ctx.strokeStyle = col.fg; ctx.lineWidth = Math.max(1.5, lw * 0.6); ctx.beginPath();
      M.extra.forEach(function (s) { var a = scr(s[0]), b = scr(s[1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (M.box) {   // 뚫린 곳: 입구 테두리를 빨간 점선으로 강조
      var sx = 0, top = 1e9, cnt = 0;
      ctx.setLineDash([10, 7]); ctx.strokeStyle = col.bad; ctx.lineWidth = lw * 1.7; ctx.beginPath();
      M.E.forEach(function (e) {
        if (e.f.length > 1) return;
        var a = scr(M.V[e.a]), b = scr(M.V[e.b]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        sx += a[0] + b[0]; cnt += 2; top = Math.min(top, a[1], b[1]);
      });
      ctx.stroke(); ctx.setLineDash([]);
      if (cnt && lw >= 3) {
        var fs = Math.max(16, Math.min(W, H) * 0.045), lx = sx / cnt, ly = Math.max(fs + 4, top - 14);
        ctx.font = fs + 'px ' + css('--display'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 5; ctx.strokeStyle = col.panel; ctx.strokeText('뚫린 곳', lx, ly); ctx.fillStyle = col.bad; ctx.fillText('뚫린 곳', lx, ly);
      }
    }
  }
  function colors() { return { base: css('--poly3d').split(',').map(Number), alt: css('--poly3d-alt').split(',').map(Number), glass: css('--edge'), fg: css('--fg'), bad: css('--bad'), panel: css('--panel') }; }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // 볼록한 도형을 평면 n·v = d 로 잘라 n·v <= d 쪽만 남긴다
  function clip(m, n, d) {
    var polys = [], cap = [], eps = 1e-9;
    m.F.forEach(function (f) {
      var pts = f.map(function (k) { return m.V[k]; }), out = [];
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length], da = dot(n, a) - d, db = dot(n, b) - d;
        if (da <= eps) { out.push(a); if (da > -1e-6) cap.push(a); }
        if ((da < -eps && db > eps) || (da > eps && db < -eps)) { var p = lerp(a, b, da / (da - db)); out.push(p); cap.push(p); }
      }
      if (out.length >= 3) polys.push(out);
    });
    var seen = {}, uniq = [];
    cap.forEach(function (p) { var k = p.map(function (x) { return Math.round(x * 1e5); }).join(','); if (!seen[k]) { seen[k] = 1; uniq.push(p); } });
    if (uniq.length >= 3) {
      var c = [0, 0, 0]; uniq.forEach(function (p) { c[0] += p[0] / uniq.length; c[1] += p[1] / uniq.length; c[2] += p[2] / uniq.length; });
      var u = norm(cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), w = cross(n, u);
      uniq.sort(function (p, q) { var a = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], b = [q[0] - c[0], q[1] - c[1], q[2] - c[2]]; return Math.atan2(dot(a, w), dot(a, u)) - Math.atan2(dot(b, w), dot(b, u)); });
      polys.push(uniq);
    }
    var V = [], idx = {};
    var F = polys.map(function (poly) {
      var f = [];
      poly.forEach(function (p) { var k = p.map(function (x) { return Math.round(x * 1e5); }).join(','); if (idx[k] === undefined) { idx[k] = V.length; V.push(p); } if (f[f.length - 1] !== idx[k]) f.push(idx[k]); });
      if (f.length > 1 && f[0] === f[f.length - 1]) f.pop();
      return f;
    }).filter(function (f) { return f.length >= 3; });
    return convex(V, F);
  }
  function merge(parts) {
    var V = [], F = [], tint = [];
    parts.forEach(function (pt) {
      var o = pt.off || [0, 0, 0], base = V.length;
      pt.m.V.forEach(function (v) { V.push([v[0] + o[0], v[1] + o[1], v[2] + o[2]]); });
      pt.m.F.forEach(function (f) { F.push(f.map(function (k) { return k + base; })); tint.push(!!pt.tint); });
    });
    var M = finish({ V: V, F: F, open: false }); M.tint = tint; return M;
  }
  function pyramid(n) { return extrude(regular(n, 1), 1.8, { top: 0 }); }
  function glass(n, c, s) {
    var u = norm(cross(n, [0, 0, 1])), w = cross(n, u);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) { return [c[0] + (u[0] * q[0] + w[0] * q[1]) * s, c[1] + (u[1] * q[0] + w[1] * q[1]) * s, c[2] + (u[2] * q[0] + w[2] * q[1]) * s]; });
  }
  // 뿔대의 옆 모서리를 늘린 점선 (윗꼭짓점 → 늘린 끝)
  function ext(m, n, k) { var L = []; for (var i = 0; i < n; i++) { var b = m.V[i], t = m.V[n + i]; L.push([t, lerp(b, t, k)]); } return L; }
  // ================= 시연툴 공통 =================
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = { 3: '삼각', 4: '사각', 5: '오각', 6: '육각', 7: '칠각', 8: '팔각' };
  var HANJA = { 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십' };
  var _COLS = null;
  function cols() {
    if (_COLS) return _COLS;
    var c = colors();
    c.face = css('--face'); c.edge = css('--edge'); c.vertex = css('--vertex'); c.muted = css('--muted'); c.btnfg = css('--btn-fg');
    _COLS = c;
    return c;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function anim(e, c) { e.classList.remove(c); void e.offsetWidth; e.classList.add(c); }

  // 손가락·마우스로 돌리는 무대 (자유 3D 회전 / 고정 축 2방향 회전)
  function Stage(holder, cls) {
    var box = el('div', 'stage ' + (cls || ''), '<canvas></canvas><div class="hint">끌어서 돌려 보세요</div><div class="stage-ctrls"><label class="stage-lock" title="체크하면 가로(좌우)·세로(상하) 두 방향으로만 깔끔하게 회전합니다"><input type="checkbox"> 고정 축</label><button type="button" class="stage-level" title="밑면을 기준과 평행하게 놓기">밑면 평행</button><button type="button" class="stage-reset" title="각도 초기화" aria-label="각도 초기화">↻</button></div>');
    holder.appendChild(box);
    var S = { el: box, cv: box.querySelector('canvas'), yaw: 0.6, pitch: 0.42, mat: matFromYP(0.6, 0.42), spin: true, defaultPitch: 0.42, lockAxis: false }, drag = null;
    S.cv._box = box;   // three.js 엔진이 이 무대에 그릴 수 있게
    var chk = box.querySelector('.stage-lock input');
    chk.onchange = function () { S.lockAxis = chk.checked; };
    box.querySelector('.stage-level').onclick = function () {
      S.spin = false;
      S.yaw = Math.atan2(S.mat[2], S.mat[0]);
      S.pitch = 0.28;
      S.mat = matFromYP(S.yaw, S.pitch);
    };
    box.querySelector('.stage-reset').onclick = function () { S.reset(S.defaultPitch); };
    box.addEventListener('pointerdown', function (e) { if (e.target.closest('button, input, label')) return; box.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, axis: null, moved: false }; S.spin = false; });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      if (!drag.moved) drag.axis = Math.abs(e.clientX - drag.x) >= Math.abs(e.clientY - drag.y) ? 'y' : 'x';
      drag.moved = true;
      var dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      drag.lx = e.clientX; drag.ly = e.clientY;
      if (S.lockAxis) {
        if (drag.axis === 'y' && Math.abs(dx) > 0.1) S.mat = matMul(S.mat, matRotY(dx * 0.006));
        else if (drag.axis === 'x' && Math.abs(dy) > 0.1) S.mat = matMul(matRotX(dy * 0.006), S.mat);
      } else {
        var dist = Math.hypot(dx, dy);
        if (dist > 0.1) S.mat = matMul(matRotAxis(dy / dist, dx / dist, dist * 0.0052), S.mat);
      }
    });
    box.addEventListener('pointerup', function (e) {   // 끌지 않고 살짝 누르면 onTap (면·모서리·꼭짓점 고르기)
      var tap = drag && !drag.moved; drag = null;
      if (tap && S.onTap) { var r = S.cv.getBoundingClientRect(); S.onTap(e.clientX - r.left, e.clientY - r.top); }
    });
    box.addEventListener('pointercancel', function () { drag = null; });
    S.reset = function (p) { S.yaw = 0.6; S.defaultPitch = p === undefined ? 0.42 : p; S.pitch = S.defaultPitch; S.mat = matFromYP(S.yaw, S.pitch); S.spin = true; };
    S.tick = function (dt) { if (S.spin) { var da = dt * 0.00045; S.yaw += da; S.mat = matMul(S.mat, matRotY(da)); } return fit(S.cv); };
    S.add = function (cls2, html) { var e = el('div', cls2, html); box.appendChild(e); return e; };
    return S;
  }

  // ---- 세기: 면·모서리·꼭짓점을 차례로 불 켜기 ----
  function ang(x, z) { var a = Math.atan2(x, z); return (a + 2 * Math.PI) % (2 * Math.PI); }
  function prep(M) {
    if (M.VF) return M;
    M.VF = M.V.map(function () { return []; });
    M.F.forEach(function (f, i) { f.forEach(function (v) { M.VF[v].push(i); }); });
    return M;
  }
  function orderOf(M, mode) {
    var L;
    if (mode === 'face') {
      L = M.F.map(function (f, i) {
        var c = [0, 0, 0]; f.forEach(function (k) { c[0] += M.V[k][0]; c[2] += M.V[k][2]; });
        var ny = M.N[i][1]; return [ny > 0.5 ? 0 : ny < -0.5 ? 2 : 1, ang(c[0], c[2]), i];
      });
    } else if (mode === 'edge') {
      L = M.E.map(function (e, i) { var a = M.V[e.a], b = M.V[e.b]; return [-Math.round((a[1] + b[1]) * 50), ang(a[0] + b[0], a[2] + b[2]), i]; });
    } else {
      L = M.V.map(function (v, i) { return [-Math.round(v[1] * 100), ang(v[0], v[2]), i]; });
    }
    L.sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
    return L.map(function (x) { return x[2]; });
  }
  function Counter(onDone, onChange) {
    var C = { mode: null, ids: [], t0: 0, done: true, manualOn: false };
    C.start = function (M, mode) { C.manualOn = false; C.mode = mode; C.ids = orderOf(M, mode); C.t0 = performance.now(); C.done = false; C.step = Math.max(160, Math.min(420, 4800 / C.ids.length)); };
    C.manual = function (mode) { C.manualOn = true; C.mode = mode; C.ids = []; C.done = true; };
    C.toggle = function (id) {
      if (!C.manualOn) return;
      var i = C.ids.indexOf(id); if (i >= 0) C.ids.splice(i, 1); else C.ids.push(id);
      if (onChange) onChange(C.mode, C.ids.length);
    };
    C.clear = function () { C.mode = null; C.ids = []; C.done = true; C.manualOn = false; };
    C.shown = function () {
      if (!C.mode) return [];
      if (C.manualOn) return C.ids;
      var k = Math.min(C.ids.length, Math.floor((performance.now() - C.t0) / C.step) + 1);
      if (k >= C.ids.length && !C.done) { C.done = true; if (onDone) onDone(C.mode, C.ids.length); }
      return C.ids.slice(0, k);
    };
    return C;
  }
  // 반투명으로 그려 뒤쪽 면·모서리·꼭짓점도 보이게 한다 (세기용)
  function drawCount(cv, M, yaw, pitch, frac, mode, ids, col) {
    prep(M);
    var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    var sc = Math.min(W, H) * frac / M.R, ox = W / 2, oy = H / 2, rot = rotFn(yaw, pitch);
    var P = M.V.map(function (v) { var r = rot(v[0] - M.c[0], v[1] - M.c[1], v[2] - M.c[2]); return { x: ox + r[0] * sc, y: oy - r[1] * sc, z: r[2] }; });
    var NN = M.N.map(function (n) { return rot(n[0], n[1], n[2]); }), front = NN.map(function (n) { return n[2] > 0; });
    var sel = {}; ids.forEach(function (id, k) { sel[id] = k + 1; });
    var out = use3d(cv) ? { faces: [], segs: [] } : null;
    if (!out && G3 && cv._box) G3.hide();
    var depth = M.F.map(function (f) { var z = 0; f.forEach(function (k) { z += P[k].z; }); return z / f.length; });
    var order = M.F.map(function (f, i) { return i; }).sort(function (a, b) { return (front[a] - front[b]) || (depth[a] - depth[b]); });
    order.forEach(function (i) {
      var f = M.F[i], n = NN[i], isSel = mode === 'face' && sel[i];
      var lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]), k = 0.62 + 0.42 * lam;
      if (out) { out.faces[i] = [isSel ? col.face : 'rgb(' + col.base.join(',') + ')', isSel ? (front[i] ? 0.85 : 0.45) : (front[i] ? 0.7 : 0.16)]; return; }
      ctx.beginPath(); f.forEach(function (v, j) { j ? ctx.lineTo(P[v].x, P[v].y) : ctx.moveTo(P[v].x, P[v].y); }); ctx.closePath();
      ctx.globalAlpha = isSel ? (front[i] ? 0.85 : 0.45) : (front[i] ? 0.6 : 0.16);
      ctx.fillStyle = isSel ? col.face : 'rgb(' + col.base.map(function (c) { return Math.min(255, Math.round(c * k)); }).join(',') + ')';
      ctx.fill(); ctx.globalAlpha = 1;
    });
    ctx.lineCap = 'round';
    M.E.forEach(function (e, ei) {
      var hidden = !e.f.some(function (g) { return front[g]; }), isSel = mode === 'edge' && sel[ei];
      if (out) { out.segs.push({ a: M.V[e.a], b: M.V[e.b], color: isSel ? col.edge : hidden ? col.muted : col.fg, w: isSel ? 7 : hidden ? 2 : 3, dash: hidden && !isSel, alpha: 1 }); return; }
      ctx.beginPath(); ctx.moveTo(P[e.a].x, P[e.a].y); ctx.lineTo(P[e.b].x, P[e.b].y);
      ctx.setLineDash(hidden && !isSel ? [8, 7] : []);
      ctx.strokeStyle = isSel ? col.edge : hidden ? col.muted : col.fg; ctx.lineWidth = isSel ? 7 : hidden ? 2 : 3;
      ctx.stroke(); ctx.setLineDash([]);
    });
    if (out) G3.drawStyled(cv, { M: M, mat: Array.isArray(yaw) ? yaw : matFromYP(yaw, pitch), frac: frac, faces: out.faces, segs: out.segs });
    if (mode === 'vertex') {
      M.V.forEach(function (v, vi) {
        var hidden = !M.VF[vi].some(function (g) { return front[g]; }), isSel = sel[vi];
        ctx.globalAlpha = hidden && !isSel ? 0.55 : 1;
        ctx.beginPath(); ctx.arc(P[vi].x, P[vi].y, isSel ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? col.vertex : col.panel; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = isSel ? col.vertex : col.fg; ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
    var r = Math.max(14, Math.min(W, H) * 0.028), color = mode === 'face' ? col.face : mode === 'edge' ? col.edge : col.vertex;
    ctx.font = (r * 1.15) + 'px ' + css('--display'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ids.forEach(function (id, k) {
      var x, y;
      if (mode === 'face') { x = 0; y = 0; M.F[id].forEach(function (v) { x += P[v].x; y += P[v].y; }); x /= M.F[id].length; y /= M.F[id].length; }
      else if (mode === 'edge') { var e = M.E[id]; x = (P[e.a].x + P[e.b].x) / 2; y = (P[e.a].y + P[e.b].y) / 2; }
      else { x = P[id].x; y = P[id].y - 26; }
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col.btnfg; ctx.fillText(String(k + 1), x, y + 1);
    });
  }
  // 화면의 (x, y)에 있는 면·모서리·꼭짓점 찾기 (drawCount와 같은 투영)
  function pickAt(cv, M, yaw, pitch, frac, mode, x, y) {
    prep(M);
    var W = cv._w, H = cv._h, sc = Math.min(W, H) * frac / M.R, ox = W / 2, oy = H / 2, rot = rotFn(yaw, pitch);
    var P = M.V.map(function (v) { var r = rot(v[0] - M.c[0], v[1] - M.c[1], v[2] - M.c[2]); return { x: ox + r[0] * sc, y: oy - r[1] * sc }; });
    var front = M.N.map(function (n) { return rot(n[0], n[1], n[2])[2] > 0; }), best = -1, bd = 1e9, i;
    if (mode === 'face') {
      for (i = 0; i < M.F.length; i++) {
        if (!front[i]) continue;
        var f = M.F[i], inside = false;
        for (var k = 0, j = f.length - 1; k < f.length; j = k++) { var p = P[f[k]], q = P[f[j]]; if ((p.y > y) !== (q.y > y) && x < (q.x - p.x) * (y - p.y) / (q.y - p.y) + p.x) inside = !inside; }
        if (inside) return i;
      }
    } else if (mode === 'edge') {
      M.E.forEach(function (e, ei) {
        var a = P[e.a], b = P[e.b], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        var dist = Math.hypot(a.x + t * dx - x, a.y + t * dy - y), hidden = !e.f.some(function (g) { return front[g]; }), s = dist + (hidden ? 10 : 0);
        if (dist < 22 && s < bd) { bd = s; best = ei; }
      });
    } else {
      M.V.forEach(function (v, vi) {
        var dist = Math.hypot(P[vi].x - x, P[vi].y - y), hidden = !M.VF[vi].some(function (g) { return front[g]; }), s = dist + (hidden ? 12 : 0);
        if (dist < 28 && s < bd) { bd = s; best = vi; }
      });
    }
    return best;
  }
  function totalOf(M, mode) { return mode === 'face' ? M.F.length : mode === 'edge' ? M.E.length : M.V.length; }
  function solid(kind, n) {   // kind: prism / pyramid / frustum
    var m = kind === 'prism' ? extrude(regular(n, 1), 1.4) : kind === 'pyramid' ? extrude(regular(n, 1), 1.6, { top: 0 }) : extrude(regular(n, 1), 1.2, { top: 0.5 });
    return finish(m);
  }
  var KIND = { prism: '기둥', pyramid: '뿔', frustum: '뿔대' };
  var WORD = { face: '면', edge: '모서리', vertex: '꼭짓점' };

  // 공 물리 엔진 (뚜껑 없는 상자: 누를 때마다 공 추가 + 3D 충돌·넘침)
  var BALLM = (function () { var p = []; for (var k = 0; k <= 5; k++) { var t = -Math.PI / 2 + Math.PI * k / 5; p.push([Math.cos(t), Math.sin(t)]); } return lathe(p, 9); })();
  // 공 물리 (기둥 모양 상자: 뚜껑 없는 상자 · 닫힌 상자) — 상자는 뒤집을 수 있다
  // 계산은 세계 좌표에서 하고, 벽과의 충돌만 상자 좌표로 바꿔서 한다.
  function BallSim(base) {
    var bot = base.F[0].map(function (k) { return base.V[k]; }), n = bot.length;
    var lo = 1e9, hi = -1e9; base.V.forEach(function (v) { lo = Math.min(lo, v[1]); hi = Math.max(hi, v[1]); });
    var cx = 0, cz = 0; bot.forEach(function (v) { cx += v[0] / n; cz += v[2] / n; });
    var cy = (lo + hi) / 2, h = hi - lo, closed = !base.box;
    var planes = [], inR = 1e9;   // 옆벽: 안쪽을 향한 법선 (x, z)와 거리
    for (var i = 0; i < n; i++) {
      var a = bot[i], b = bot[(i + 1) % n], ex = b[0] - a[0], ez = b[2] - a[2], l = Math.hypot(ex, ez);
      var nx = -ez / l, nz = ex / l; if ((cx - a[0]) * nx + (cz - a[2]) * nz < 0) { nx = -nx; nz = -nz; }
      var dd = a[0] * nx + a[2] * nz; planes.push([nx, nz, dd]); inR = Math.min(inR, cx * nx + cz * nz - dd);
    }
    var r = Math.min(h * 0.15, inR * 0.3), liftH = h * 0.8, G = 9.0;
    var balls = [], queue = [], flip = { s: 0, from: 0, to: 0, t: 1 };
    var floorY = lo;
    function ang() { return Math.PI * flip.s; }
    function lift() { return liftH * Math.sin(Math.min(1, flip.s * 1.6) * Math.PI / 2); }
    function toWorld(p) { var t = ang(), c = Math.cos(t), s = Math.sin(t), y = p[1] - cy, z = p[2] - cz; return [p[0], cy + c * y - s * z + lift(), cz + s * y + c * z]; }
    function toLocal(p) { var t = -ang(), c = Math.cos(t), s = Math.sin(t), y = p[1] - cy - lift(), z = p[2] - cz; return [p[0], cy + c * y - s * z, cz + s * y + c * z]; }
    function dirWorld(v) { var t = ang(), c = Math.cos(t), s = Math.sin(t); return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]; }
    function T() { var t = ang(), c = Math.cos(t), s = Math.sin(t), L = lift(); return [1, 0, 0, 0, 0, c, -s, cy - c * cy + s * cz + L, 0, s, c, cz - s * cy - c * cz, 0, 0, 0, 1]; }
    function wallDist(q) { var m = 1e9, k = -1; planes.forEach(function (P, j) { var d = q[0] * P[0] + q[2] * P[1] - P[2]; if (d < m) { m = d; k = j; } }); return [m, k]; }
    function push(b, nW, depth, e) {   // 세계 방향 nW로 depth만큼 밀어내고 속도 반사
      b.x += nW[0] * depth; b.y += nW[1] * depth; b.z += nW[2] * depth;
      var vn = b.vx * nW[0] + b.vy * nW[1] + b.vz * nW[2];
      if (vn < 0) { var k = (1 + e) * vn; b.vx -= k * nW[0]; b.vy -= k * nW[1]; b.vz -= k * nW[2]; b.vx *= 0.96; b.vy *= 0.96; b.vz *= 0.96; }
    }
    function spawn(count) {
      for (var k = 0; k < count; k++) {
        var a = Math.random() * Math.PI * 2, rr = Math.random() * Math.max(0, inR - r) * 0.8;
        var p = closed ? [cx + Math.cos(a) * rr, lo + r + Math.random() * (h - 2 * r), cz + Math.sin(a) * rr]
                       : [cx + Math.cos(a) * rr, hi + 0.5 + Math.random() * 0.4, cz + Math.sin(a) * rr];
        var w = toWorld(p);
        queue.push({ delay: k * (closed ? 0.02 : 0.07), x: w[0], y: w[1], z: w[2], vx: (Math.random() - 0.5) * 0.3, vy: closed ? 0 : -0.8, vz: (Math.random() - 0.5) * 0.3, inside: closed });
      }
    }
    function step(dt) {
      var dts = Math.min(0.033, dt / 1000), sub = 4, hh = dts / sub;
      if (flip.t < 1) { flip.t = Math.min(1, flip.t + dts / 1.3); var e2 = flip.t < 0.5 ? 2 * flip.t * flip.t : 1 - Math.pow(-2 * flip.t + 2, 2) / 2; flip.s = flip.from + (flip.to - flip.from) * e2; }
      for (var qi = queue.length - 1; qi >= 0; qi--) { queue[qi].delay -= dts; if (queue[qi].delay <= 0) { if (balls.length >= 60) balls.shift(); balls.push(queue.splice(qi, 1)[0]); } }
      for (var s2 = 0; s2 < sub; s2++) {
        balls.forEach(function (b) {
          b.vy -= G * hh; b.x += b.vx * hh; b.y += b.vy * hh; b.z += b.vz * hh;
          var q = toLocal([b.x, b.y, b.z]), wd = wallDist(q), m = wd[0];
          if (b.inside) {
            if (q[1] < lo + r) push(b, dirWorld([0, 1, 0]), lo + r - q[1], 0.3);
            if (closed && q[1] > hi - r) push(b, dirWorld([0, -1, 0]), q[1] - (hi - r), 0.3);
            if (!closed && q[1] > hi + r * 0.3) { b.inside = false; return; }   // 뚫린 곳으로 빠져나감
            planes.forEach(function (P) { var d = q[0] * P[0] + q[2] * P[1] - P[2]; if (d < r && (closed || q[1] < hi)) push(b, dirWorld([P[0], 0, P[1]]), r - d, 0.3); });
          } else {
            if (!closed && m > r * 0.9 && q[1] < hi + r && q[1] > lo) { b.inside = true; return; }   // 위에서 상자 안으로 들어감
            var top = closed ? hi : hi;
            if (q[1] > lo - r && q[1] < top + r && m > -r) {   // 상자 바깥 면에 닿음 → 가장 가까운 바깥쪽으로 밀기
              var opts = [[m + r, dirWorld([-planes[wd[1]][0], 0, -planes[wd[1]][1]])], [q[1] - (lo - r), dirWorld([0, -1, 0])]];
              if (closed || m < r * 0.9) opts.push([top + r - q[1], dirWorld([0, 1, 0])]);
              opts.sort(function (u, v) { return u[0] - v[0]; });
              if (opts[0][0] > 0) push(b, opts[0][1], opts[0][0], 0.3);
            }
          }
          if (b.y < floorY + r) { b.y = floorY + r; if (b.vy < 0) b.vy = -b.vy * 0.3; b.vx *= 0.97; b.vz *= 0.97; }
        });
        var minD = 2 * r;
        for (var i = 0; i < balls.length; i++) for (var j = i + 1; j < balls.length; j++) {
          var A = balls[i], B = balls[j], dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, dist = Math.hypot(dx, dy, dz);
          if (dist > 0 && dist < minD) {
            var nx = dx / dist, ny = dy / dist, nz = dz / dist, pen = (minD - dist) * 0.5;
            A.x -= nx * pen; A.y -= ny * pen; A.z -= nz * pen; B.x += nx * pen; B.y += ny * pen; B.z += nz * pen;
            var vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny + (B.vz - A.vz) * nz;
            if (vn < 0) { var imp = -(1 + 0.3) * vn * 0.5; A.vx -= imp * nx; A.vy -= imp * ny; A.vz -= imp * nz; B.vx += imp * nx; B.vy += imp * ny; B.vz += imp * nz; }
          }
        }
      }
      balls = balls.filter(function (b) { return Math.hypot(b.x - cx, b.z - cz) < inR * 9 && b.y > floorY - 1; });
    }
    var view = { c: [cx, cy + h * 0.38, cz], R: Math.max(base.R * 1.22, h * 1.25) };
    return {
      base: base, r: r, closed: closed, c: view.c, R: view.R,
      add: function () { if (flip.s === 0) spawn(closed ? 10 : 7); },
      clear: function () { balls = []; queue = []; },
      flip: function () { flip.from = flip.s; flip.to = flip.to > 0.5 ? 0 : 1; flip.t = 0; },
      flipped: function () { return flip.to > 0.5; },
      upright: function () { return flip.s === 0; },
      step: step, T: T, toWorld: toWorld, dirWorld: dirWorld,
      balls: function () { return balls.map(function (b) { return [b.x, b.y, b.z, b.inside]; }); },
      count: function () { return balls.length + queue.length; }
    };
  }
  // ---- 공이 든 상자를 2D로 그리기: 뒷벽 → 안쪽 공 → 앞벽 → 바깥 공 (상자는 볼록하니 이 순서면 맞다) ----
  function renderSim(cv, sim, yaw, pitch, frac, lw, col) {
    var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d, M = sim.base;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    var mat = Array.isArray(yaw) ? yaw : matFromYP(yaw, pitch), rot = rotFn(mat);
    var sc = Math.min(W, H) * frac / sim.R, ox = W / 2, oy = H / 2, c = sim.c;
    function scr(w) { var q = rot(w[0] - c[0], w[1] - c[1], w[2] - c[2]); return { x: ox + q[0] * sc, y: oy - q[1] * sc, z: q[2] }; }
    var Vw = M.V.map(sim.toWorld), P = Vw.map(scr);
    var B = sim.balls().map(function (b) { var s = scr(b); s.inside = b[3]; return s; });
    var labelOk = sim.upright() && M.box;
    if (use3d(cv)) {
      G3.draw(cv, { M: M, mat: mat, frac: frac, lw: lw, col: col, c: c, R: sim.R, T: sim.T(), balls: sim.balls(), r: sim.r, glass: sim.closed, rim: labelOk });
      if (labelOk) rimLabel(ctx, M, P, W, H, lw, col);
      return;
    }
    if (G3 && cv._box) G3.hide();
    var NN = M.N.map(function (n) { var w = sim.dirWorld(n); return rot(w[0], w[1], w[2]); });
    var front = NN.map(function (n) { return n[2] > 0; });
    var zc = scr(sim.toWorld([c[0], (M.V.reduce(function (a, v) { return a + v[1]; }, 0) / M.V.length), c[2]])).z;
    var R = sim.r * sc, glass = sim.closed;
    function ball(b) {
      var g = ctx.createRadialGradient(b.x - R * 0.35, b.y - R * 0.4, R * 0.1, b.x, b.y, R);
      var base = col.alt;
      g.addColorStop(0, 'rgb(' + base.map(function (v) { return Math.min(255, Math.round(v + (255 - v) * 0.6)); }).join(',') + ')');
      g.addColorStop(0.55, 'rgb(' + base.join(',') + ')');
      g.addColorStop(1, 'rgb(' + base.map(function (v) { return Math.round(v * 0.62); }).join(',') + ')');
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
    }
    function face(i, alpha, dark) {
      var f = M.F[i], n = NN[i], sg = front[i] ? 1 : -1;
      var lam = Math.max(0, sg * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])), k = (0.55 + 0.5 * lam) * (dark ? 0.45 : 1);
      ctx.beginPath(); f.forEach(function (v, j) { j ? ctx.lineTo(P[v].x, P[v].y) : ctx.moveTo(P[v].x, P[v].y); }); ctx.closePath();
      ctx.globalAlpha = alpha; ctx.fillStyle = 'rgb(' + col.base.map(function (v) { return Math.min(255, Math.round(v * k)); }).join(',') + ')'; ctx.fill(); ctx.globalAlpha = 1;
    }
    function edges(list, dashed, w) {
      ctx.beginPath(); list.forEach(function (e) { ctx.moveTo(P[e.a].x, P[e.a].y); ctx.lineTo(P[e.b].x, P[e.b].y); });
      ctx.setLineDash(dashed ? [7, 6] : []); ctx.strokeStyle = col.fg; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); ctx.setLineDash([]);
    }
    var backF = [], frontF = [];
    M.F.forEach(function (f, i) { (front[i] ? frontF : backF).push(i); });
    var backE = M.E.filter(function (e) { return !e.f.some(function (g) { return front[g]; }); });
    var frontE = M.E.filter(function (e) { return e.f.some(function (g) { return front[g]; }); });
    var outFar = B.filter(function (b) { return !b.inside && b.z < zc; }).sort(function (a, b) { return a.z - b.z; });
    var inside = B.filter(function (b) { return b.inside; }).sort(function (a, b) { return a.z - b.z; });
    var outNear = B.filter(function (b) { return !b.inside && b.z >= zc; }).sort(function (a, b) { return a.z - b.z; });
    outFar.forEach(ball);
    backF.forEach(function (i) { face(i, glass ? 0.22 : 1, !glass); });
    edges(backE, glass, glass ? lw * 0.8 : lw * 0.7);
    inside.forEach(ball);
    frontF.forEach(function (i) { face(i, glass ? 0.3 : 1, false); });
    edges(frontE, false, lw);
    outNear.forEach(ball);
    if (labelOk) rimLabel(ctx, M, P, W, H, lw, col, true);
  }
  // 뚫린 곳: 테두리 빨간 점선(2D일 때) + "뚫린 곳" 글자
  function rimLabel(ctx, M, P, W, H, lw, col, drawLine) {
    var sx = 0, top = 1e9, cnt = 0;
    if (drawLine) { ctx.setLineDash([10, 7]); ctx.strokeStyle = col.bad; ctx.lineWidth = lw * 1.7; ctx.beginPath(); }
    M.E.forEach(function (e) {
      if (e.f.length > 1) return;
      var a = P[e.a], b = P[e.b];
      if (drawLine) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      sx += a.x + b.x; cnt += 2; top = Math.min(top, a.y, b.y);
    });
    if (drawLine) { ctx.stroke(); ctx.setLineDash([]); }
    if (!cnt) return;
    var fs = Math.max(16, Math.min(W, H) * 0.045), lx = sx / cnt, ly = Math.max(fs + 4, top - 14);
    ctx.font = fs + 'px ' + css('--display'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 5; ctx.strokeStyle = col.panel; ctx.strokeText('뚫린 곳', lx, ly); ctx.fillStyle = col.bad; ctx.fillText('뚫린 곳', lx, ly);
  }
  // 공 넣기 · 뒤집기 · 비우기 단추 (무대 왼쪽 위)
  function BallUI(S) {
    var row = el('div', 'corner-row', '<button class="corner mball"></button><button class="corner mflip"></button><button class="corner mclear">비우기</button>');
    S.el.appendChild(row);
    var bB = row.querySelector('.mball'), bF = row.querySelector('.mflip'), bC = row.querySelector('.mclear'), U = { sim: null, row: row };
    function set(e, k, v) { if (e[k] !== v) e[k] = v; }
    U.label = function () {
      var m = U.sim; if (!m) return;
      set(bB, 'textContent', m.closed ? (m.count() ? '공 더 넣기 ⚽' : '안에 공 넣기 ⚽') : (m.count() ? '공 더 넣기 ⚽' : '공 넣기 ⚽'));
      set(bB, 'disabled', !m.upright());
      set(bF, 'textContent', m.flipped() ? '바로 세우기 ↺' : '뒤집기 ↻');
      set(bC, 'hidden', !m.count());
    };
    bB.onclick = function () { if (U.sim) { U.sim.add(); U.label(); } };
    bF.onclick = function () { if (U.sim) { U.sim.flip(); U.label(); } };
    bC.onclick = function () { if (U.sim) { U.sim.clear(); U.label(); } };
    U.set = function (M) { U.sim = (M.box || M.ballBox) ? BallSim(M) : null; row.hidden = !U.sim; U.label(); return U.sim; };
    return U;
  }

  // ================= 분류 장면 (장면 1, 장면 4) =================
  // 카드를 누르면 크게 보고 상자를 고른다 → 바로 다음 도형. 끌어서 옮길 수도 있다. 그다음 정답 공개.
  function sortScene(main, cfg) {
    var head = el('div', 'scene-head', '<h2>' + cfg.title + '</h2>');
    var tools = el('div', 'tools'), bRev = el('button', 'primary', '정답 공개'), bFix = el('button', '', '정답대로 정리'), bReset = el('button', '', '처음부터');
    tools.appendChild(bRev); tools.appendChild(bFix); tools.appendChild(bReset); head.appendChild(tools); main.appendChild(head);
    var note = el('div', 'sortnote'); note.hidden = true; if (cfg.note) { note.innerHTML = cfg.note; main.appendChild(note); }
    var wrap = el('div', 'sortwrap c' + (cfg.bins.length + 1)); main.appendChild(wrap);
    var BINS = {};
    function bin(id, cls, title) { var b = el('div', 'bin ' + cls, '<h3>' + title + ' <span class="cnt"></span></h3><div class="cards"></div>'); wrap.appendChild(b); BINS[id] = b; return b; }
    bin('pool', 'pool', '아직 안 나눈 도형');
    cfg.bins.forEach(function (b) { bin(b.id, b.cls, b.title); });
    var st = { revealed: false, modal: null };
    var cards = cfg.items.map(function (it, k) {
      var c = el('div', 'card', '<canvas></canvas><span class="num">' + (k + 1) + '</span><span class="mark"></span><span class="nm"></span>');
      c.setAttribute('role', 'button'); c.setAttribute('aria-label', (k + 1) + '번 도형'); c.tabIndex = 0;
      BINS.pool.querySelector('.cards').appendChild(c);
      var M = it.M();
      var C = { el: c, cv: c.querySelector('canvas'), it: it, M: M, k: k, yaw: 0.3 + k * 0.9, pitch: M.box ? 0.85 : M.open ? 0.6 : 0.38, at: 'pool' };
      var drag = null;
      c.addEventListener('pointerdown', function (e) { if (e.button) return; c.setPointerCapture(e.pointerId); var r = c.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, moving: false }; });
      c.addEventListener('pointermove', function (e) {
        if (!drag) return;
        if (!drag.moving) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return; drag.moving = true; c.classList.add('dragging'); c.style.width = drag.w + 'px'; c.style.height = drag.h + 'px'; }
        c.style.left = (e.clientX - drag.dx) + 'px'; c.style.top = (e.clientY - drag.dy) + 'px';
        var t = dropTarget(e.clientX, e.clientY); Object.keys(BINS).forEach(function (id) { BINS[id].classList.toggle('over', BINS[id] === t); });
      });
      function endDrag() { c.classList.remove('dragging'); c.style.left = c.style.top = c.style.width = c.style.height = ''; Object.keys(BINS).forEach(function (id) { BINS[id].classList.remove('over'); }); }
      c.addEventListener('pointerup', function (e) {
        if (!drag) return; var was = drag.moving; drag = null;
        if (!was) { openModal(C); return; }
        var t = dropTarget(e.clientX, e.clientY); endDrag();
        if (t) { var id = Object.keys(BINS).filter(function (x) { return BINS[x] === t; })[0]; move(C, id); }
      });
      c.addEventListener('pointercancel', function () { drag = null; endDrag(); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter') openModal(C); });
      return C;
    });
    function dropTarget(x, y) { var hit = document.elementFromPoint(x, y); return hit && hit.closest ? hit.closest('.bin') : null; }
    function move(C, where) { C.at = where; BINS[where].querySelector('.cards').appendChild(C.el); anim(C.el, 'pop'); refresh(); }
    function refresh() {
      Object.keys(BINS).forEach(function (id) { BINS[id].querySelector('.cnt').textContent = '(' + cards.filter(function (C) { return C.at === id; }).length + ')'; });
      cards.forEach(function (C) {
        var right = C.at === 'pool' ? null : C.at === C.it.ans;
        C.el.classList.toggle('right', st.revealed && right === true);
        C.el.classList.toggle('wrong', st.revealed && right === false);
        C.el.querySelector('.mark').textContent = st.revealed && right !== null ? (right ? '○' : '✕') : '';
        C.el.querySelector('.nm').textContent = st.revealed ? C.it.name : '';
      });
      bRev.textContent = st.revealed ? '정답 가리기' : '정답 공개';
      note.hidden = !st.revealed;
    }
    bRev.onclick = function () { st.revealed = !st.revealed; refresh(); if (st.revealed) cards.forEach(function (C) { if (C.el.classList.contains('wrong')) anim(C.el, 'shake'); }); };
    bFix.onclick = function () { st.revealed = true; cards.forEach(function (C) { if (C.at !== C.it.ans) move(C, C.it.ans); }); refresh(); };
    bReset.onclick = function () { st.revealed = false; cards.forEach(function (C) { C.at = 'pool'; BINS.pool.querySelector('.cards').appendChild(C.el); }); refresh(); };

    // 크게 보기 창
    var modal = el('div', 'modal', '<div class="mbox"><div class="mhead"><h3></h3><button class="mprev" aria-label="이전 도형">◀</button><button class="mnext" aria-label="다음 도형">▶</button><button class="mclose" aria-label="닫기">✕ 닫기</button></div><div class="mstage"></div><div class="mwhy" hidden></div><div class="mbtns"></div></div>');
    modal.hidden = true; main.appendChild(modal);
    var MS = Stage(modal.querySelector('.mstage')), mStamp = MS.add('stamp'), mWhy = modal.querySelector('.mwhy'), BU = BallUI(MS);
    var chooseBtns = cfg.bins.map(function (b) {
      var btn = el('button', 'choose ' + b.cls, b.btn + ' <kbd>' + b.keys[0].toUpperCase() + '</kbd>'); btn.dataset.id = b.id;
      btn.onclick = function () { choose(b.id); }; modal.querySelector('.mbtns').appendChild(btn); return btn;
    });
    var holdBtn = null;
    if (cfg.allowHold) {
      holdBtn = el('button', 'choose hold', '보류 <kbd>3</kbd>');
      holdBtn.onclick = function () { hold(); };
      modal.querySelector('.mbtns').appendChild(holdBtn);
    }
    var mStageBox = modal.querySelector('.mstage'), mToast = el('div', 'mtoast'); modal.querySelector('.mbox').appendChild(mToast);
    function binOf(id) { return cfg.bins.filter(function (b) { return b.id === id; })[0]; }
    function fill(C) {
      st.modal = C; st.ball = null;
      var left = cards.filter(function (x) { return x.at === 'pool'; }).length;
      modal.querySelector('h3').innerHTML = (C.k + 1) + '번 도형' + (st.revealed ? ' · ' + C.it.name : '') + ' <small>남은 도형 ' + left + '개</small>';
      MS.reset(C.pitch); MS.el.querySelector('.hint').hidden = !!C.M.box;
      st.sim = BU.set(C.M);
      var ab = binOf(C.it.ans);
      mStamp.className = st.revealed ? 'stamp ' + (ab.cls === 'no' || ab.cls === 'b2' ? 'no' : 'yes') : 'stamp'; mStamp.textContent = st.revealed ? ab.stamp : '';
      mWhy.hidden = !(st.revealed && C.it.why);
      if (!mWhy.hidden) mWhy.textContent = C.it.why;
      chooseBtns.forEach(function (b) { b.classList.toggle('sel', C.at === b.dataset.id); });
      if (holdBtn) holdBtn.classList.toggle('sel', C.at === 'pool');
    }
    function openModal(C) { fill(C); modal.hidden = false; void modal.offsetWidth; modal.classList.add('show'); }
    function closeModal() { if (modal.hidden) return; modal.classList.remove('show'); st.modal = null; busy = false; setTimeout(function () { if (!modal.classList.contains('show')) modal.hidden = true; }, 220); }
    function nextOf(C, dir, onlyPool) {
      for (var s2 = 1; s2 <= cards.length; s2++) { var x = cards[(C.k + dir * s2 + cards.length * 2) % cards.length]; if (!onlyPool || x.at === 'pool') return x; }
      return null;
    }
    var busy = false;
    function slideTo(C, dir) {
      if (busy) return; busy = true;
      mStageBox.classList.remove('in-l', 'in-r'); mStageBox.classList.add(dir > 0 ? 'out-l' : 'out-r');
      setTimeout(function () { fill(C); mStageBox.classList.remove('out-l', 'out-r'); void mStageBox.offsetWidth; mStageBox.classList.add(dir > 0 ? 'in-r' : 'in-l'); busy = false; }, 170);
    }
    function choose(id) {
      var C = st.modal; if (!C || busy) return;
      var btn = chooseBtns.filter(function (b) { return b.dataset.id === id; })[0];
      btn.classList.add('flash'); setTimeout(function () { btn.classList.remove('flash'); }, 300);
      move(C, id);
      var b = binOf(id); mToast.textContent = (C.k + 1) + '번 → ' + b.title; mToast.className = 'mtoast ' + b.cls; anim(mToast, 'toast');
      var nx = nextOf(C, 1, true);
      if (nx) slideTo(nx, 1); else setTimeout(closeModal, 350);
    }
    function hold() {
      var C = st.modal; if (!C || busy) return;
      if (holdBtn) { holdBtn.classList.add('flash'); setTimeout(function () { holdBtn.classList.remove('flash'); }, 300); }
      if (C.at !== 'pool') move(C, 'pool');
      mToast.textContent = (C.k + 1) + '번 → 보류 (나중에 보기)'; mToast.className = 'mtoast hold'; anim(mToast, 'toast');
      var nx = nextOf(C, 1, true);
      if (nx && nx !== C) slideTo(nx, 1); else setTimeout(closeModal, 350);
    }
    modal.querySelector('.mclose').onclick = closeModal;
    modal.querySelector('.mprev').onclick = function () { if (st.modal) slideTo(nextOf(st.modal, -1, false), -1); };
    modal.querySelector('.mnext').onclick = function () { if (st.modal) slideTo(nextOf(st.modal, 1, false), 1); };
    modal.addEventListener('pointerdown', function (e) { if (e.target === modal) closeModal(); });
    function onKey(e) {
      if (!st.modal) return;
      var k = e.key.toLowerCase();
      if (k === 'escape') return closeModal();
      if (k === 'arrowright' || k === 'pagedown') { e.preventDefault(); return modal.querySelector('.mnext').onclick(); }
      if (k === 'arrowleft' || k === 'pageup') { e.preventDefault(); return modal.querySelector('.mprev').onclick(); }
      if (cfg.allowHold && (k === '3' || k === 'h')) return hold();
      cfg.bins.forEach(function (b) { if (b.keys.indexOf(k) >= 0) choose(b.id); });
    }
    document.addEventListener('keydown', onKey);
    refresh();
    return {
      frame: function (dt, col) {
        cards.forEach(function (C) { if (!C.el.classList.contains('dragging')) C.yaw += dt * 0.00035; if (fit(C.cv)) render(C.cv, C.M, C.yaw, C.pitch, 0.4, 2, col); });
        if (st.modal && MS.tick(dt)) { if (st.sim) { st.sim.step(dt); BU.label(); renderSim(MS.cv, st.sim, MS.mat, 0, 0.42, 3, col); } else render(MS.cv, st.modal.M, MS.mat, 0, 0.42, 3, col); }
      },
      primary: function () { if (st.modal) return; bRev.onclick(); },
      unmount: function () { document.removeEventListener('keydown', onKey); }
    };
  }

  // ---- 장면 1: 다면체일까, 아닐까? ----
  var GUESS12 = ['cube', 'cylinder', 'sqPyr', 'halfCyl', 'triPrism', 'sphere', 'octa', 'openBox', 'hexPrism', 'cone', 'lPrism', 'plane5'];
  function sceneGuess(main) {
    return sortScene(main, {
      title: '다면체일까, 아닐까? 골라서 나눠 보세요',
      allowHold: true,
      items: GUESS12.map(function (k) { return { name: SH[k][0], ans: SH[k][1] ? 'yes' : 'no', why: SH[k][2], M: function () { return mesh(k); } }; }),
      bins: [
        { id: 'yes', cls: 'yes', title: '다면체예요 ○', btn: '다면체다 ○', keys: ['o', '1'], stamp: '다면체 ○' },
        { id: 'no', cls: 'no', title: '다면체가 아니에요 ✕', btn: '다면체가 아니다 ✕', keys: ['x', '2'], stamp: '다면체가 아니에요 ✕' }
      ]
    });
  }

  // ---- 장면 4: 각기둥과 각뿔로 나눠 보기 (초등에서 배운 것) → 남은 도형 소개 ----
  function ex(n, r, h, o) { return function () { return finish(extrude(regular(n, r), h, o)); }; }
  var SORT_PP = [
    { name: '사각뿔', ans: 'pyr', M: ex(4, 1, 1.6, { top: 0 }) },
    { name: '삼각기둥', ans: 'prism', M: ex(3, 1, 1.5) },
    { name: '사각뿔대', ans: 'etc', M: ex(4, 1, 1.2, { top: 0.5 }) },
    { name: '오각기둥', ans: 'prism', M: ex(5, 1, 1.4) },
    { name: '삼각뿔', ans: 'pyr', M: ex(3, 1.1, 1.6, { top: 0 }) },
    { name: '팔면체', ans: 'etc', M: function () { return finish(G_octa()); } },
    { name: '직육면체', ans: 'prism', M: function () { return finish(extrude([[-1.3, -0.8], [1.3, -0.8], [1.3, 0.8], [-1.3, 0.8]], 0.9)); } },
    { name: '오각뿔', ans: 'pyr', M: ex(5, 1, 1.5, { top: 0 }) },
    { name: '삼각뿔대', ans: 'etc', M: ex(3, 1.1, 1.1, { top: 0.45 }) },
    { name: '누운 육각기둥', ans: 'prism', M: function () { return finish(lay(extrude(regular(6, 0.9), 1.8))); } },
    { name: '육각뿔', ans: 'pyr', M: ex(6, 1, 1.3, { top: 0 }) },
    { name: '오각뿔대', ans: 'etc', M: ex(5, 1, 1.1, { top: 0.55 }) }
  ];
  function scenePrismPyramid(main) {
    return sortScene(main, {
      title: '초등학교에서 배운 각기둥과 각뿔로 나눠 볼까요?',
      items: SORT_PP,
      note: '<b>남은 도형</b> 중 사각뿔대 · 삼각뿔대 · 오각뿔대는 <b>윗면과 아랫면이 평행</b>하고 옆면이 사다리꼴이에요. 이런 다면체를 <b class="c-edge">각뿔대</b>라고 해요. → 다음 장면에서 각뿔을 잘라 만들어 봐요.',
      bins: [
        { id: 'prism', cls: 'b0', title: '각기둥', btn: '각기둥', keys: ['1'], stamp: '각기둥' },
        { id: 'pyr', cls: 'b1', title: '각뿔', btn: '각뿔', keys: ['2'], stamp: '각뿔' },
        { id: 'etc', cls: 'b2', title: '둘 다 아니에요', btn: '둘 다 아니다', keys: ['3'], stamp: '각기둥도 각뿔도 아니에요' }
      ]
    });
  }

  // ================= 장면 2: 다면체의 뜻 만들기 =================
  var CLAUSE = [
    { id: 'poly', text: '다각형인 면으로만', ex: 'cylinder', cap: '원기둥 ✕ — 굽은 면이 있어요' },
    { id: 'closed', text: '둘러싸인', ex: 'openBox', cap: '뚜껑 없는 상자 ✕ — 위가 뚫려 있어요' },
    { id: 'solid', text: '입체도형', ex: 'plane5', cap: '평면 오각형 ✕ — 두께가 없는 평면도형이에요' }
  ];
  var DEF_EXAMPLES = [
    ['cylinder', '원기둥 ✕'],
    ['openBox', '뚜껑 없는 상자 ✕'],
    ['plane5', '평면 오각형 ✕'],
    ['cube', '정육면체 ○']
  ];
  function sceneDefine(main) {
    main.appendChild(el('div', 'scene-head', '<h2>다면체의 뜻을 만들어 봐요</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag'), stamp = S.add('stamp'), BU = BallUI(S);
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { key: 'cylinder', ball: null, open: {} };
    panel.appendChild(el('p', 'lead', '다면체가 <b>아닌 도형(✕)</b>을 먼저 보면서, 빈칸에 들어갈 조건을 추론해 보세요.'));
    var exrow = el('div', 'row');
    DEF_EXAMPLES.forEach(function (x) {
      var b = el('button', 'pick mini', x[1]); b.dataset.key = x[0];
      b.onclick = function () { show(x[0]); };
      exrow.appendChild(b);
    });
    panel.appendChild(exrow);
    var sent = el('div', 'sent'); panel.appendChild(sent);
    var bReset = el('button', '', '빈칸 다시 가리기'), row = el('div', 'row');
    row.appendChild(bReset); panel.appendChild(row);
    function show(key) {
      st.key = key; var poly = SH[key][1], M = mesh(key);
      st.sim = BU.set(M);
      S.reset(M.box ? 0.9 : M.open ? 0.62 : 0.42);
      tag.textContent = SH[key][0];
      stamp.className = 'stamp ' + (poly ? 'yes' : 'no'); stamp.textContent = poly ? '다면체 ○' : '다면체가 아니에요 ✕'; anim(stamp, 'pop');
      S.el.querySelector('.hint').hidden = !!M.box;
      Array.prototype.forEach.call(exrow.children, function (b) { b.classList.toggle('sel', b.dataset.key === key); });
    }
    function draw(popId) {
      sent.innerHTML = CLAUSE.map(function (c) {
        var on = st.open[c.id];
        return '<span class="chipw"><button class="chip ' + c.id + (on ? ' on' : '') + (popId === c.id ? ' pop' : '') + '" data-id="' + c.id + '">' + (on ? c.text : '？？？') + '</button><small>' + (on ? c.cap : '추론 후 눌러서 확인') + '</small></span>';
      }).join(' ') + ' <span class="tail">을 <b>다면체</b>라고 해요.</span>';
    }
    sent.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var id = b.dataset.id;
      st.open[id] = !st.open[id]; draw(st.open[id] ? id : null);
    });
    bReset.onclick = function () { st.open = {}; draw(); };
    draw(); show('cylinder');
    return {
      frame: function (dt, col) { if (S.tick(dt)) { if (st.sim) { st.sim.step(dt); BU.label(); renderSim(S.cv, st.sim, S.mat, 0, 0.42, 3, col); } else render(S.cv, mesh(st.key), S.mat, 0, 0.42, 3, col); } },
      primary: function () { var next = CLAUSE.filter(function (c) { return !st.open[c.id]; })[0]; if (next) { st.open[next.id] = true; draw(next.id); } }
    };
  }

  // ================= 장면 3: 면의 개수로 이름 짓기 =================
  var NAMING = [
    ['삼각뿔', function () { return finish(extrude(regular(3, 1.1), 1.6, { top: 0 })); }],
    ['사각뿔', function () { return finish(extrude(regular(4, 1), 1.6, { top: 0 })); }],
    ['삼각기둥', function () { return finish(extrude(regular(3, 1), 1.5)); }],
    ['정육면체', function () { return finish(extrude(regular(4, 1), 1.414)); }],
    ['사각뿔대', function () { return finish(extrude(regular(4, 1), 1.2, { top: 0.5 })); }],
    ['오각뿔', function () { return finish(extrude(regular(5, 1), 1.5, { top: 0 })); }],
    ['오각기둥', function () { return finish(extrude(regular(5, 1), 1.4)); }],
    ['육각기둥', function () { return finish(extrude(regular(6, 1), 1.2)); }],
    ['팔면체', function () { return finish(G_octa()); }]
  ];
  function G_octa() { var V = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1.1, 0], [0, -1.1, 0]], F = []; for (var i = 0; i < 4; i++) { F.push([i, (i + 1) % 4, 4]); F.push([i, (i + 1) % 4, 5]); } return convex(V, F); }
  function sceneNameByFaces(main) {
    main.appendChild(el('div', 'scene-head', '<h2>면의 개수로 이름 짓기</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), big = S.add('big'), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: 3, M: null, seen: {}, thumbs: NAMING.map(function (x) { return x[1](); }) };
    function result(n) { big.innerHTML = '면 <b>' + n + '</b>개 → <b class="c-face">' + HANJA[n] + '면체</b>'; tag.textContent = NAMING[st.k][0]; anim(big, 'pop'); (st.seen[n] = st.seen[n] || {})[NAMING[st.k][0]] = 1; table(); }
    var C = Counter(function (mode, n) { result(n); }, function (mode, n) {
      if (n === st.M.F.length) result(n); else big.innerHTML = '면 <b>' + n + '</b>개';
    });
    S.onTap = function (x, y) { var id = pickAt(S.cv, st.M, S.mat, 0, 0.4, 'face', x, y); if (id >= 0) { S.spin = false; C.toggle(id); } };
    var picks = el('div', 'picks'); panel.appendChild(el('p', 'lead', '모양을 고르고 <b class="c-face">면을 직접 눌러</b> 세어 보세요. 다 세면 이름이 나와요.')); panel.appendChild(picks);
    var pickCvs = NAMING.map(function (x, k) {
      var b = el('button', 'pick shape-pick', '<canvas></canvas>');
      b.dataset.k = k; b.setAttribute('aria-label', (k + 1) + '번 도형');
      picks.appendChild(b);
      return { cv: b.querySelector('canvas'), yaw: 0.5 + k * 0.45 };
    });
    picks.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) load(Number(b.dataset.k)); });
    var grow = el('div', 'row'), go = el('button', '', '자동으로 세기 ▶'), again = el('button', '', '다시 세기');
    grow.appendChild(again); grow.appendChild(go); panel.appendChild(grow);
    var tbl = el('div', 'sumtab'); panel.appendChild(tbl);
    var q = el('details', 'qcard', '<summary>생각해 보기: 삼면체는 있을까요?</summary><p>면이 3개로는 공간을 빈틈없이 둘러쌀 수 없어요. 그래서 면의 개수가 가장 적은 다면체는 <b>사면체</b>예요.</p>');
    panel.appendChild(q);
    function load(k) {
      st.k = k; st.M = st.thumbs[k]; C.manual('face'); big.innerHTML = '면 <b>0</b>개'; tag.textContent = (k + 1) + '번 도형'; S.reset();
      Array.prototype.forEach.call(picks.children, function (b, i) { b.classList.toggle('sel', i === k); });
    }
    function table() {
      var ns = Object.keys(st.seen).map(Number).sort(function (a, b) { return a - b; });
      tbl.innerHTML = ns.length ? '<table class="ctab"><tr><th>면의 개수</th><th>이름</th><th>세어 본 도형</th></tr>' + ns.map(function (n) {
        return '<tr><td>' + n + '</td><td class="c-face"><b>' + HANJA[n] + '면체</b></td><td>' + Object.keys(st.seen[n]).join(', ') + '</td></tr>';
      }).join('') + '</table>' : '';
    }
    go.onclick = function () { big.innerHTML = ''; C.start(st.M, 'face'); };
    again.onclick = function () { C.manual('face'); big.innerHTML = '면 <b>0</b>개'; tag.textContent = (st.k + 1) + '번 도형'; };
    load(3);
    return {
      frame: function (dt, col) {
        if (S.tick(dt)) drawCount(S.cv, st.M, S.mat, 0, 0.4, C.mode, C.shown(), col);
        pickCvs.forEach(function (pc, k) {
          pc.yaw += dt * 0.00035;
          if (fit(pc.cv)) render(pc.cv, st.thumbs[k], pc.yaw, 0.42, 0.42, 1.8, col);
        });
      },
      primary: function () { go.onclick(); }
    };
  }

  // ================= 장면 4: 각뿔을 잘라 각뿔대 만들기 =================
  var SLANT = norm([0.55, 1, 0.15]);
  function baseButtons(holder, st, onPick, from, to) {
    var row = el('div', 'row', '<span class="lab">밑면</span>');
    for (var n = from; n <= to; n++) (function (n) {
      var b = el('button', 'pick mini' + (st.n === n ? ' sel' : ''), NAMES[n] + '형');
      b.onclick = function () { st.n = n; Array.prototype.forEach.call(row.querySelectorAll('button'), function (x) { x.classList.toggle('sel', x === b); }); onPick(); };
      row.appendChild(b);
    })(n);
    holder.appendChild(row); return row;
  }
  function sceneCut(main) {
    main.appendChild(el('div', 'scene-head', '<h2>각뿔을 잘라 각뿔대 만들기</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag'), stamp = S.add('stamp');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { n: 4, t: 0.05, cut: null, t0: 0, cacheKey: '', cacheM: null };
    baseButtons(panel, st, rejoin, 3, 6);
    var srow = el('div', 'row', '<span class="lab">자르는 높이</span>'), rng = el('input'); rng.type = 'range'; rng.min = -50; rng.max = 55; rng.value = 5;
    rng.oninput = function () { st.t = rng.value / 100; rejoin(); }; srow.appendChild(rng); panel.appendChild(srow);
    var brow = el('div', 'row'), bPar = el('button', 'primary', '평행하게 자르기 ✂'), bSl = el('button', '', '비스듬히 자르기 ✂'), bJoin = el('button', '', '다시 붙이기');
    brow.appendChild(bPar); brow.appendChild(bSl); brow.appendChild(bJoin); panel.appendChild(brow);
    var msg = el('div', 'defbox'); panel.appendChild(msg);
    function rejoin() { st.cut = null; st.cacheKey = ''; tag.textContent = NAMES[st.n] + '뿔'; stamp.className = 'stamp'; stamp.textContent = ''; msg.innerHTML = '<p>칼날(반투명 판)의 높이를 정하고 잘라 보세요.</p>'; }
    function doCut(kind) {
      st.cut = kind; st.t0 = performance.now(); st.cacheKey = '';
      if (kind === 'par') {
        tag.textContent = '아래 조각: ' + NAMES[st.n] + '뿔대'; stamp.className = 'stamp yes'; stamp.textContent = '각뿔대 ○'; anim(stamp, 'pop');
        msg.innerHTML = '<p class="def">각뿔을 <b>밑면에 평행한 평면</b>으로 자를 때 생기는 두 입체도형 중에서 각뿔이 아닌 쪽을 <b class="c-edge">각뿔대</b>라고 해요.</p><p>두 밑면: 서로 평행 · 옆면: 모두 사다리꼴</p>';
      } else {
        tag.textContent = '아래 조각'; stamp.className = 'stamp no'; stamp.textContent = '각뿔대가 아니에요 ✕'; anim(stamp, 'pop');
        msg.innerHTML = '<p class="def">비스듬히 자르면 두 밑면이 <b class="c-bad">평행하지 않아요</b>. 그래서 각뿔대가 아니에요.</p>';
      }
    }
    bPar.onclick = function () { doCut('par'); }; bSl.onclick = function () { doCut('slant'); }; bJoin.onclick = rejoin;
    rejoin(); S.reset(0.38);
    function meshNow() {
      var k = st.cut ? Math.min(1, (performance.now() - st.t0) / 700) : 1;
      var key = st.n + '|' + st.t + '|' + (st.cut || 'none') + '|' + (k >= 1 ? '1' : 'anim');
      if (k >= 1 && st.cacheKey === key && st.cacheM) return st.cacheM;
      var P = pyramid(st.n), n = st.cut === 'slant' ? SLANT : [0, 1, 0], c = [0, st.t, 0], d = dot(n, c), M;
      if (!st.cut) { M = finish({ V: P.V, F: P.F, open: false }); M.glass = [glass([0, 1, 0], c, 1.25)]; }
      else {
        var e = 1 - (1 - k) * (1 - k);
        M = merge([{ m: clip(P, n, d) }, { m: clip(P, [-n[0], -n[1], -n[2]], -d), off: [n[0] * 0.6 * e, n[1] * 0.6 * e, n[2] * 0.6 * e], tint: true }]);
      }
      M.c = [0, 0.25, 0]; M.R = 1.6;
      if (k >= 1) { st.cacheKey = key; st.cacheM = M; }
      return M;
    }
    return {
      frame: function (dt, col) { if (S.tick(dt)) render(S.cv, meshNow(), S.mat, 0, 0.46, 3, col); },
      primary: function () { if (!st.cut) doCut('par'); else if (st.cut === 'par') doCut('slant'); else rejoin(); }
    };
  }

  // ================= 장면 5: 각기둥 · 각뿔대 · 각뿔 =================
  function sceneFamily(main) {
    main.appendChild(el('div', 'scene-head', '<h2>각기둥 · 각뿔대 · 각뿔 — 이름은 밑면의 모양으로</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { n: 5, s: 1, M: null };
    baseButtons(panel, st, update, 3, 8);
    var srow = el('div', 'row', '<span class="lab">윗면 크기</span>'), rng = el('input'); rng.type = 'range'; rng.min = 0; rng.max = 100; rng.value = 100;
    rng.oninput = function () { st.s = rng.value / 100; update(); }; srow.appendChild(rng); panel.appendChild(srow);
    var quick = el('div', 'row'); [['각기둥', 100], ['각뿔대', 50], ['각뿔', 0]].forEach(function (q) { var b = el('button', '', q[0]); b.onclick = function () { rng.value = q[1]; st.s = q[1] / 100; update(); }; quick.appendChild(b); });
    panel.appendChild(quick);
    var name = el('div', 'bigname'); panel.appendChild(name);
    var feat = el('table', 'ctab feat'); panel.appendChild(feat);
    function update() {
      var n = st.n, s = st.s, kind = s >= 1 ? 'prism' : s <= 0 ? 'pyramid' : 'frustum';
      var m = extrude(regular(n, 1), 1.6, { top: s }), M = finish(m);
      M.tint = M.N.map(function (nn) { return Math.abs(nn[1]) < 0.99; });   // 옆면은 주황, 밑면은 파랑
      if (s > 0 && s < 1) M.extra = ext(m, n, Math.min(4.2, 1 / (1 - s)));
      M.c = [0, 0.5, 0]; M.R = 1.9; st.M = M;
      var nm = NAMES[n] + KIND[kind]; tag.textContent = nm;
      name.innerHTML = '밑면이 <b class="c-edge">' + NAMES[n] + '형</b>인 ' + KIND[kind] + ' → <b>' + nm + '</b>';
      var base = kind === 'prism' ? '2개 · 서로 평행하고 합동' : kind === 'frustum' ? '2개 · 서로 평행, 모양은 같고 크기가 달라요' : '1개';
      var side = kind === 'prism' ? '직사각형' : kind === 'frustum' ? '사다리꼴' : '삼각형';
      feat.innerHTML = '<tr><th>밑면 <span class="sw blue"></span></th><td>' + base + '</td></tr><tr><th>옆면 <span class="sw orange"></span></th><td><b>' + side + '</b> ' + n + '개</td></tr>' +
        (kind === 'frustum' ? '<tr><th>옆 모서리</th><td>늘리면 한 점에서 만나요 (점선)</td></tr>' : '');
    }
    update(); S.reset(0.45);
    return { frame: function (dt, col) { if (S.tick(dt)) render(S.cv, st.M, S.mat, 0, 0.47, 3, col); }, primary: function () { var v = st.s >= 1 ? 50 : st.s > 0 ? 0 : 100; rng.value = v; st.s = v / 100; update(); } };
  }

  // ================= 장면 6: 면 · 모서리 · 꼭짓점 =================
  var TERM_SHAPES = [['오각기둥', 'prism', 5], ['사각뿔', 'pyramid', 4], ['사각뿔대', 'frustum', 4]];
  function sceneTerms(main) {
    main.appendChild(el('div', 'scene-head', '<h2>다면체의 면 · 모서리 · 꼭짓점</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), big = S.add('big'), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: 0, M: null };
    function say6(mode, n, done) { big.innerHTML = '<span class="c-' + mode + '">' + WORD[mode] + '</span> <b>' + n + '</b>개' + (done ? ' ✓' : ''); if (done) anim(big, 'pop'); }
    var C = Counter(function (mode, n) { say6(mode, n, true); }, function (mode, n) { say6(mode, n, n === totalOf(st.M, mode)); });
    S.onTap = function (x, y) { if (!C.manualOn) return; var id = pickAt(S.cv, st.M, S.mat, 0, 0.4, C.mode, x, y); if (id >= 0) { S.spin = false; C.toggle(id); } };
    var picks = el('div', 'row'); TERM_SHAPES.forEach(function (x, k) { var b = el('button', 'pick mini', x[0]); b.onclick = function () { load(k); }; picks.appendChild(b); }); panel.appendChild(picks);
    var defs = el('div', 'terms');
    defs.innerHTML = [['face', '면', '다면체를 둘러싸고 있는 <b>다각형</b>'], ['edge', '모서리', '다각형의 <b>변</b>'], ['vertex', '꼭짓점', '다각형의 <b>꼭짓점</b>']].map(function (t) {
      return '<button class="term ' + t[0] + '" data-m="' + t[0] + '"><span class="tw c-' + t[0] + '">' + t[1] + '</span><span class="td">' + t[2] + '</span></button>';
    }).join('');
    panel.appendChild(el('p', 'lead', '세고 싶은 것을 고른 뒤, 도형에서 <b>직접 눌러</b> 불을 켜 보세요.')); panel.appendChild(defs);
    var arow = el('div', 'row'), bAuto = el('button', '', '자동으로 세기 ▶'), bAgain = el('button', '', '다시 세기'); arow.appendChild(bAgain); arow.appendChild(bAuto); panel.appendChild(arow);
    function pickMode(m) { C.manual(m); say6(m, 0, false); Array.prototype.forEach.call(defs.children, function (b) { b.classList.toggle('on', b.dataset.m === m); }); S.spin = false; }
    defs.addEventListener('click', function (e) { var b = e.target.closest('.term'); if (b) pickMode(b.dataset.m); });
    bAuto.onclick = function () { var m = C.mode || 'face'; big.innerHTML = ''; C.start(st.M, m); };
    bAgain.onclick = function () { pickMode(C.mode || 'face'); };
    function load(k) {
      st.k = k; var x = TERM_SHAPES[k]; st.M = solid(x[1], x[2]); var m = C.mode || 'face'; tag.textContent = x[0]; S.reset(); pickMode(m);
      Array.prototype.forEach.call(picks.children, function (b, i) { b.classList.toggle('sel', i === k); });
    }
    load(0);
    return {
      frame: function (dt, col) { if (S.tick(dt)) drawCount(S.cv, st.M, S.mat, 0, 0.4, C.mode, C.shown(), col); },
      primary: function () { bAuto.onclick(); }
    };
  }

  // ================= 장면 8: 층마다 세기 (1층 · 2층 · 층 사이) =================
  // 1층 = 아래 다각형, 2층 = 위 다각형(각뿔이면 점 하나), 층 사이 = 두 층을 잇는 모서리와 옆면
  var LCOL = { 1: '28, 126, 214', 2: '112, 72, 232', 3: '232, 89, 12' };   // 1층 파랑 · 2층 보라 · 층 사이 주황
  function layerSolid(n, s) {
    var M = finish(extrude(regular(n, 1), 1.6, { top: s }));
    M.c = [0, 0, 0]; M.R = Math.hypot(1, 0.8);   // 윗층 크기를 바꿔도 화면 크기가 흔들리지 않게
    return prep(M);
  }
  function sceneLayers(main) {
    main.appendChild(el('div', 'scene-head', '<h2>층마다 세면 쉬워요 — 1층 · 2층 · 층 사이</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), big = S.add('big'), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { n: 4, s: 1, layer: 1, animT0: performance.now(), rev: {}, M: null };
    var COLS3 = [{ k: 1, name: '1층', cls: 'l1' }, { k: 2, name: '2층', cls: 'l3' }, { k: 3, name: '층 사이', cls: 'l2' }];
    var ROWS3 = [{ m: 'vertex', w: '꼭짓점' }, { m: 'edge', w: '모서리' }, { m: 'face', w: '면' }];
    var krow = el('div', 'row', '<span class="lab">모양</span>');
    [['각기둥', 100], ['각뿔대', 50], ['각뿔', 0]].forEach(function (q) {
      var b = el('button', 'pick mini', q[0]); b.dataset.v = q[1];
      b.onclick = function () { rng.value = q[1]; setTop(q[1]); };
      krow.appendChild(b);
    });
    panel.appendChild(krow);
    var nrowL = baseButtons(panel, st, function () { st.layer = 1; st.rev = {}; st.animT0 = performance.now(); rebuild(); }, 3, 6);
    var wrow = el('div', 'row', '<span class="lab">학습지</span>');
    [['삼각뿔대', 3, 50], ['육각뿔', 6, 0], ['오각기둥', 5, 100]].forEach(function (q) {
      var b = el('button', 'mini', q[0]);
      b.onclick = function () { st.n = q[1]; Array.prototype.forEach.call(nrowL.querySelectorAll('button'), function (x) { x.classList.toggle('sel', x.textContent === NAMES[q[1]] + '형'); }); rng.value = q[2]; st.layer = 1; st.rev = {}; st.animT0 = performance.now(); setTop(q[2]); };
      wrow.appendChild(b);
    });
    panel.appendChild(wrow);
    var srow = el('div', 'row', '<span class="lab">윗층 크기</span>'), rng = el('input'); rng.type = 'range'; rng.min = 0; rng.max = 100; rng.value = 100;
    rng.oninput = function () { setTop(Number(rng.value)); };
    srow.appendChild(rng); panel.appendChild(srow);
    panel.appendChild(el('p', 'lead', '<b>1층 → 2층 → 층 사이</b> 순서로 쌓으며, 층마다 꼭짓점·모서리·면을 세어 보세요.'));
    var lrow = el('div', 'row');
    var lBtns = ['비우기', '1층', '2층', '층 사이'].map(function (t, lv) {
      var b = el('button', 'pick mini', t);
      b.onclick = function () { st.layer = lv; st.animT0 = performance.now(); update(); };
      lrow.appendChild(b); return b;
    });
    var bStep = el('button', 'primary', '');
    bStep.onclick = function () { st.layer = st.layer < 3 ? st.layer + 1 : 0; if (st.layer === 0) st.rev = {}; st.animT0 = performance.now(); update(); };
    lrow.appendChild(bStep); panel.appendChild(lrow);
    var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
    var rrow = el('div', 'row'), bAll = el('button', '', '쌓은 칸 모두 열기');
    bAll.onclick = function () {
      var keys = allKeys(), on = keys.length && keys.every(function (k) { return st.rev[k]; });
      keys.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); update();
    };
    rrow.appendChild(bAll); panel.appendChild(rrow);
    var tip = el('p', 'note'); panel.appendChild(tip);
    function kindOf() { return st.s >= 1 ? 'prism' : st.s <= 0 ? 'pyramid' : 'frustum'; }
    function setTop(v) { st.s = v / 100; rebuild(); }
    function rebuild() { st.M = layerSolid(st.n, st.s); update(); }
    function val(m, c) {
      var n = st.n, pyr = kindOf() === 'pyramid';
      var V = { vertex: [n, pyr ? 1 : n, 0], edge: [n, pyr ? 0 : n, n], face: [1, pyr ? 0 : 1, n] };
      return V[m][c - 1];
    }
    function allKeys() {
      var ks = [];
      ROWS3.forEach(function (r) {
        COLS3.forEach(function (c) { if (c.k <= st.layer) ks.push(r.m + c.k); });
        if (st.layer >= 3) ks.push(r.m + 's');
      });
      return ks;
    }
    function update() {
      var kind = kindOf(), lv = st.layer;
      tag.textContent = NAMES[st.n] + KIND[kind];
      Array.prototype.forEach.call(krow.querySelectorAll('button'), function (b) { var v = Number(b.dataset.v); b.classList.toggle('sel', kind === (v >= 100 ? 'prism' : v <= 0 ? 'pyramid' : 'frustum')); });
      lBtns.forEach(function (b, i) { b.classList.toggle('sel', i === lv); });
      bStep.textContent = lv < 3 ? '다음 쌓기 →' : '처음부터 ↺';
      big.innerHTML = lv === 0 ? '' : '<span class="layer-badge ' + COLS3[lv - 1].cls + '">' + COLS3[lv - 1].name + '</span>';
      var h = '<table class="ctab layers"><tr><th></th>' + COLS3.map(function (c) { return '<th><span class="layer-badge ' + c.cls + '">' + c.name + '</span></th>'; }).join('') + '<th>합계</th></tr>';
      ROWS3.forEach(function (r) {
        h += '<tr><th class="c-' + r.m + '">' + r.w + '</th>';
        var allOpen = true, parts = [];
        COLS3.forEach(function (c) {
          var k = r.m + c.k, built = c.k <= lv, on = built && st.rev[k];
          if (!on) allOpen = false; parts.push(val(r.m, c.k));
          h += built ? '<td data-k="' + k + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? val(r.m, c.k) : '?') + '</td>' : '<td class="nb">·</td>';
        });
        var sk = r.m + 's', sOn = lv >= 3 && st.rev[sk] && allOpen, sum = parts[0] + parts[1] + parts[2];
        h += lv >= 3 ? '<td data-k="' + sk + '" class="' + (sOn ? 'rev sumc' : 'q') + '">' + (sOn ? parts.join(' + ') + ' = <b>' + sum + '</b>' : '?') + '</td>' : '<td class="nb">·</td>';
        h += '</tr>';
      });
      tbl.innerHTML = h + '</table>';
      var pyr = kind === 'pyramid';
      tip.innerHTML = lv === 0 ? '1층부터 차례대로 쌓아 보세요.' :
        lv === 1 ? '<b>1층</b>(아래층): ' + NAMES[st.n] + '형이에요. 꼭짓점·모서리·면이 몇 개일까요?' :
        lv === 2 ? (pyr ? '<b>2층</b>(위층): 각뿔의 2층은 <b>점 하나</b>예요! 꼭짓점·모서리·면은 몇 개일까요?' : '<b>2층</b>(위층): 1층과 같은 모양이에요' + (kind === 'frustum' ? '(크기만 작아요)' : '') + '. 몇 개씩일까요?') :
        '<b>층 사이</b>: 1층과 2층을 잇는 모서리와 옆면을 세어 보세요. ' + (pyr ? '모두 2층의 한 점으로 모여요.' : '') +
        '<br>윗층 크기를 0까지 줄이면 2층이 점 하나가 돼요. 표가 어떻게 바뀌는지 보세요.';
    }
    tbl.addEventListener('click', function (e) {
      var td = e.target.closest('td[data-k]'); if (!td) return;
      var k = td.dataset.k;
      if (/s$/.test(k)) { var m = k.slice(0, -1); if (![1, 2, 3].every(function (c) { return st.rev[m + c]; })) { anim(td, 'pop'); return; } }
      st.rev[k] = st.rev[k] ? 0 : 1; update();
    });
    rebuild(); S.reset(0.42);
    return {
      frame: function (dt, col) { if (S.tick(dt)) drawLayers(S.cv, st.M, st.layer, st.animT0, S.mat, 0, 0.4, col); },
      primary: function () { bStep.onclick(); }
    };
  }

  // ================= 장면 9: 개수 세고 규칙 찾기 =================
  var FORM = {
    prism: { vertex: [2, 0], edge: [3, 0], face: [1, 2] },
    pyramid: { vertex: [1, 1], edge: [2, 0], face: [1, 1] },
    frustum: { vertex: [2, 0], edge: [3, 0], face: [1, 2] }
  };
  function fstr(f) { return (f[0] === 1 ? '' : f[0]) + '<i>n</i>' + (f[1] ? ' + ' + f[1] : ''); }
  function sceneTable(main) {
    main.appendChild(el('div', 'scene-head', '<h2>개수를 세고 규칙을 찾아봐요</h2>'));
    var two = el('div', 'two t7'); main.appendChild(two);
    var S = Stage(two), big = S.add('big'), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { kind: 'prism', n: 3, M: null, rev: {}, frev: {} };
    function done7(mode, n) { big.innerHTML = '<span class="c-' + mode + '">' + WORD[mode] + '</span> <b>' + n + '</b>개 ✓'; anim(big, 'pop'); if (st.n <= 6) reveal(st.kind, st.n, mode); }
    var C = Counter(done7, function (mode, n) { if (n === totalOf(st.M, mode)) done7(mode, n); else big.innerHTML = '<span class="c-' + mode + '">' + WORD[mode] + '</span> <b>' + n + '</b>개'; });
    S.onTap = function (x, y) { if (!C.manualOn) return; var id = pickAt(S.cv, st.M, S.mat, 0, 0.4, C.mode, x, y); if (id >= 0) { S.spin = false; C.toggle(id); } };
    var krow = el('div', 'row'); [['prism', '각기둥'], ['pyramid', '각뿔'], ['frustum', '각뿔대']].forEach(function (x) {
      var b = el('button', 'pick mini', x[1]); b.dataset.k = x[0]; b.onclick = function () { st.kind = x[0]; load(); }; krow.appendChild(b);
    });
    panel.appendChild(krow);
    var nrow = baseButtons(panel, st, load, 3, 8);
    var crow = el('div', 'row', '<span class="lab">직접 세기</span>');
    function pick7(m) { C.manual(m); big.innerHTML = '<span class="c-' + m + '">' + WORD[m] + '</span> <b>0</b>개'; Array.prototype.forEach.call(crow.querySelectorAll('.cnt'), function (b) { b.classList.toggle('on', b.dataset.m === m); }); S.spin = false; }
    ['vertex', 'edge', 'face'].forEach(function (m) { var b = el('button', 'cnt ' + m, WORD[m]); b.dataset.m = m; b.onclick = function () { pick7(m); }; crow.appendChild(b); });
    var bAuto7 = el('button', '', '자동으로 세기 ▶'); bAuto7.onclick = function () { var m = C.mode || 'vertex'; big.innerHTML = ''; C.start(st.M, m); }; crow.appendChild(bAuto7);
    var bRevAll = el('button', '', '표 전체 공개');
    bRevAll.onclick = function () {
      var rows = [3, 4, 5, 6], ms = ['vertex', 'edge', 'face'], allOn = rows.every(function (n) { return ms.every(function (m) { return st.rev[key(st.kind, n, m)]; }); }) && ms.every(function (m) { return st.frev['F' + st.kind + m]; });
      rows.forEach(function (n) { ms.forEach(function (m) { st.rev[key(st.kind, n, m)] = allOn ? 0 : 1; }); });
      ms.forEach(function (m) { st.frev['F' + st.kind + m] = allOn ? 0 : 1; });
      bRevAll.textContent = allOn ? '표 전체 공개' : '표 전체 가리기';
      table();
    };
    crow.appendChild(bRevAll);
    panel.appendChild(crow);
    var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
    panel.appendChild(el('p', 'note', '칸을 누르면 값이 열려요. 먼저 학생들에게 예상하게 해 보세요. 마지막 줄은 규칙(식)이에요.'));
    function key(kind, n, m) { return kind + n + m; }
    function reveal(kind, n, m) { st.rev[key(kind, n, m)] = 1; table(key(kind, n, m)); }
    function table(popKey) {
      var kind = st.kind, kn = KIND[kind], rows = [3, 4, 5, 6];
      var h = '<table class="ctab big"><tr><th>도형</th><th class="c-vertex">꼭짓점</th><th class="c-edge">모서리</th><th class="c-face">면</th></tr>';
      rows.forEach(function (n) {
        var M = solid(kind, n), val = { vertex: M.V.length, edge: M.E.length, face: M.F.length };
        h += '<tr' + (n === st.n ? ' class="cur"' : '') + '><th>' + NAMES[n] + kn + '</th>' + ['vertex', 'edge', 'face'].map(function (m) {
          var k = key(kind, n, m), on = st.rev[k];
          return '<td data-k="' + k + '" class="' + (on ? 'rev' : 'q') + (popKey === k ? ' pop' : '') + '">' + (on ? val[m] : '?') + '</td>';
        }).join('') + '</tr>';
      });
      h += '<tr class="frow"><th><i>n</i>' + kn.replace(/^/, '각') + '</th>' + ['vertex', 'edge', 'face'].map(function (m) {
        var k = 'F' + kind + m, on = st.frev[k];
        return '<td data-f="' + k + '" class="formula ' + (on ? 'rev' : 'q') + (popKey === k ? ' pop' : '') + '">' + (on ? fstr(FORM[kind][m]) : '?') + '</td>';
      }).join('') + '</tr></table>';
      tbl.innerHTML = h;
    }
    tbl.addEventListener('click', function (e) {
      var td = e.target.closest('td'); if (!td) return;
      if (td.dataset.k) { st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; table(td.dataset.k); }
      else if (td.dataset.f) { st.frev[td.dataset.f] = st.frev[td.dataset.f] ? 0 : 1; table(td.dataset.f); }
    });
    function load() {
      st.M = solid(st.kind, st.n); tag.textContent = NAMES[st.n] + KIND[st.kind]; S.reset(); if (crow) pick7(C.mode || 'vertex');
      Array.prototype.forEach.call(krow.children, function (b) { b.classList.toggle('sel', b.dataset.k === st.kind); });
      table();
    }
    load();
    return {
      frame: function (dt, col) { if (S.tick(dt)) drawCount(S.cv, st.M, S.mat, 0, 0.4, C.mode, C.shown(), col); },
      primary: function () { bAuto7.onclick(); }
    };
  }

  // ================= 층 그리기 (일반형) =================
  // L = { vL: 꼭짓점의 층, eL: 모서리의 층, fL: 면의 층, col: 층별 색, max: 마지막 단계 }
  // step까지 쌓은 부분만 그리고, 방금 쌓은 단계는 애니메이션. mono면 흑백 겨냥도(보이지 않는 모서리는 점선)
  function drawLayersG(cv, M, L, step, animT0, yaw, pitch, frac, col, mono) {
    var ctx = cv.getContext('2d'), W = cv._w, H = cv._h, d = cv._d;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    var sc = Math.min(W, H) * frac / M.R, ox = W / 2, oy = H / 2, rot = rotFn(yaw, pitch);
    var P = M.V.map(function (v) { var r = rot(v[0] - M.c[0], v[1] - M.c[1], v[2] - M.c[2]); return { x: ox + r[0] * sc, y: oy - r[1] * sc, z: r[2] }; });
    var NN = M.N.map(function (nn) { return rot(nn[0], nn[1], nn[2]); }), front = NN.map(function (nn) { return nn[2] > 0; });
    var t = Math.min(1, (performance.now() - animT0) / 950), p = 1 - Math.pow(1 - t, 2);
    var pNow = function (s) { return s === step ? p : 1; };
    var vCount = {}; L.vL.forEach(function (s) { vCount[s] = (vCount[s] || 0) + 1; });
    var out = use3d(cv) ? { faces: M.F.map(function () { return null; }), segs: [] } : null;   // three.js: 면·선은 모아서 넘기고, 점만 여기서 그린다
    function seg(a, b, color, w, dash, alpha, fr) { var bb = fr == null ? b : [a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr, a[2] + (b[2] - a[2]) * fr]; out.segs.push({ a: a, b: bb, color: color, w: w, dash: dash, alpha: alpha }); }
    if (!out && G3 && cv._box) G3.hide();
    var rgb = function (s) { return 'rgb(' + L.col[s] + ')'; };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (!mono) M.E.forEach(function (e, ei) {   // 아직 쌓지 않은 부분: 연한 점선 안내선
      if (L.eL[ei] <= step) return;
      if (out) { seg(M.V[e.a], M.V[e.b], col.muted, 1.8, true, 0.25); return; }
      ctx.beginPath(); ctx.moveTo(P[e.a].x, P[e.a].y); ctx.lineTo(P[e.b].x, P[e.b].y);
      ctx.setLineDash([5, 6]); ctx.strokeStyle = col.muted; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.8;
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    var depth = M.F.map(function (f) { var z = 0; f.forEach(function (k) { z += P[k].z; }); return z / f.length; });
    var order = M.F.map(function (f, i) { return i; }).filter(function (i) { return L.fL[i] <= step; }).sort(function (a, b) { return (front[a] - front[b]) || (depth[a] - depth[b]); });
    order.forEach(function (i) {
      var f = M.F[i], nn = NN[i], sg = front[i] ? 1 : -1, s = L.fL[i];
      var lam = Math.max(0, sg * (nn[0] * LIGHT[0] + nn[1] * LIGHT[1] + nn[2] * LIGHT[2])), k = 0.72 + 0.28 * lam;
      var base = mono ? '250, 251, 253' : L.col[s];
      var c = base.split(',').map(function (x) { return Math.min(255, Math.round(Number(x) * k)); }).join(',');
      ctx.beginPath(); f.forEach(function (v, j) { j ? ctx.lineTo(P[v].x, P[v].y) : ctx.moveTo(P[v].x, P[v].y); }); ctx.closePath();
      var a = mono ? (front[i] ? 0.85 : 0) : front[i] ? (s === step ? 0.5 : 0.32) : 0.16;
      var fade = Math.max(0, (pNow(s) - 0.4) / 0.6);
      if (out) { out.faces[i] = a * fade > 0.005 ? ['rgb(' + base + ')', mono ? a * fade * 0.75 : Math.min(1, a * fade * 1.25)] : null; return; }
      ctx.globalAlpha = a * fade; ctx.fillStyle = 'rgb(' + c + ')'; ctx.fill(); ctx.globalAlpha = 1;
    });
    var ring = {};
    M.E.forEach(function (e, ei) { if (L.vL[e.a] === L.vL[e.b]) (ring[L.eL[ei]] = ring[L.eL[ei]] || []).push(ei); });
    M.E.forEach(function (e, ei) {
      var s = L.eL[ei]; if (s > step) return;
      var pa = P[e.a], pb = P[e.b], ma = M.V[e.a], mb = M.V[e.b], cur = s === step && !mono;
      var hidden = (mono || step >= L.max) && !e.f.some(function (g) { return front[g]; });
      if (out) {
        var c3 = cur ? rgb(s) : col.fg, w3 = cur ? 5 : mono ? 3 : 2.8, fr3 = null;
        if (s === step && p < 1) {
          if (L.vL[e.a] !== L.vL[e.b]) { if (L.vL[e.a] > L.vL[e.b]) { var t3 = ma; ma = mb; mb = t3; } fr3 = p; }
          else { var R3 = ring[s] || [ei]; fr3 = Math.max(0, Math.min(1, p * R3.length - R3.indexOf(ei))); }
          if (fr3 <= 0) return;
        }
        seg(ma, mb, c3, w3, hidden && !cur, 1, fr3); return;
      }
      ctx.strokeStyle = cur ? rgb(s) : col.fg; ctx.lineWidth = cur ? 5 : mono ? 3 : 2.8;
      ctx.setLineDash(hidden && !cur ? [7, 6] : []);
      if (s === step && p < 1) {
        var fr;
        if (L.vL[e.a] !== L.vL[e.b]) { if (L.vL[e.a] > L.vL[e.b]) { var tmp = pa; pa = pb; pb = tmp; } fr = p; }
        else { var R = ring[s] || [ei], idx = R.indexOf(ei); fr = Math.max(0, Math.min(1, p * R.length - idx)); }
        if (fr <= 0) { ctx.setLineDash([]); return; }
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pa.x + (pb.x - pa.x) * fr, pa.y + (pb.y - pa.y) * fr); ctx.stroke(); ctx.setLineDash([]);
        return;
      }
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
    });
    if (out) G3.drawStyled(cv, { M: M, mat: Array.isArray(yaw) ? yaw : matFromYP(yaw, pitch), frac: frac, faces: out.faces, segs: out.segs });
    M.V.forEach(function (v, vi) {
      var s = L.vL[vi]; if (s > step) return;
      var cur = s === step, rad = mono ? 4 : cur ? 8 : 5.5;
      if (cur && p < 1) rad *= Math.min(1, p * 1.6);
      if (cur && !mono && vCount[s] === 1) rad = 9 + 4 * Math.sin(p * Math.PI);
      if (rad <= 0) return;
      ctx.beginPath(); ctx.arc(P[vi].x, P[vi].y, rad, 0, Math.PI * 2);
      var c2 = mono ? col.fg : cur ? rgb(s) : col.fg;
      ctx.fillStyle = mono ? col.fg : cur ? c2 : col.panel; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = c2; ctx.stroke();
    });
  }
  // 기둥 · 뿔대 · 뿔: 1층(아래) → 2층(위) → 층 사이
  function layersOf(M) {
    if (M._L) return M._L;
    var vL = M.V.map(function (v) { return v[1] < 0 ? 1 : 2; });
    var fL = M.N.map(function (nn) { return nn[1] < -0.9 ? 1 : nn[1] > 0.9 ? 2 : 3; });
    var eL = M.E.map(function (e) { var a = vL[e.a], b = vL[e.b]; return a === b ? a : 3; });
    return (M._L = { vL: vL, eL: eL, fL: fL, col: LCOL, max: 3 });
  }
  function drawLayers(cv, M, layer, animT0, yaw, pitch, frac, col) { drawLayersG(cv, M, layersOf(M), layer, animT0, yaw, pitch, frac, col, false); }

  // ================= 도입 1: 표지 =================
  function sceneCover(main) {
    var box = el('div', 'cover');
    box.innerHTML = '<div class="cover-txt"><div class="unit">Ⅶ. 입체도형의 성질</div><h1>01. 다면체 <span>1차시</span></h1><div class="page">교과서 P. 211 ~ 212</div><div class="cover-hint">→ 키나 [다음]을 눌러 시작해요</div></div><img alt="부르즈 할리파" src="' + IMG.burj + '">';
    main.appendChild(box);
    return {};
  }

  // ================= 도입 2: 건축물 퀴즈 =================
  var BUILDINGS = [
    { img: 'burj', q: '세상에서 가장 높은 빌딩 <b>부르즈 할리파</b>는 몇 층일까요?', name: '부르즈 할리파', opts: [152, 168, 173, 182, 191], ans: 1 },
    { img: 'merdeka', q: '세상에서 두 번째로 높은 빌딩 <b>메르데카 ○○○</b>는 몇 층일까요?', name: '메르데카 118', opts: [118, 123, 132, 145, 163], ans: 0 },
    { img: 'shanghai', q: '세상에서 세 번째로 높은 빌딩 <b>상하이 타워</b>는 몇 층일까요?', name: '상하이 타워', opts: [115, 128, 137, 145, 166], ans: 1 }
  ];
  function sceneQuiz(main) {
    var head = el('div', 'scene-head', '<h2>건축물 퀴즈 <small class="sub">이민걸의 사회 시간</small></h2>'); main.appendChild(head);
    var tabs = el('div', 'tools'); head.appendChild(tabs);
    var wrap = el('div', 'quiz'); main.appendChild(wrap);
    var st = { k: 0, pick: -1, shown: false, end: false };
    var tBtns = BUILDINGS.map(function (b, i) { var x = el('button', 'pick mini', (i + 1) + '번'); x.onclick = function () { load(i); }; tabs.appendChild(x); return x; });
    var tEnd = el('button', 'pick mini', '그래서?'); tEnd.onclick = function () { st.end = true; draw(); }; tabs.appendChild(tEnd);
    function load(i) { st.k = i; st.pick = -1; st.shown = false; st.end = false; draw(); }
    function draw() {
      tBtns.forEach(function (b, i) { b.classList.toggle('sel', !st.end && i === st.k); }); tEnd.classList.toggle('sel', st.end);
      if (st.end) {
        wrap.innerHTML = '<div class="quiz-end"><p>높은 건물도 <b>층</b>으로 나누면 한눈에 파악할 수 있어요.</p><p class="punch">입체도형을 파악하려면 <b>층</b>을 알아야 한다!</p></div>';
        anim(wrap.firstChild, 'pop'); return;
      }
      var B = BUILDINGS[st.k];
      wrap.innerHTML = '<img alt="' + B.name + '" src="' + IMG[B.img] + '"><div class="quiz-r"><p class="quiz-q">' + B.q + '</p><div class="quiz-opts"></div><p class="quiz-a"></p></div>';
      var ob = wrap.querySelector('.quiz-opts');
      B.opts.forEach(function (o, i) {
        var x = el('button', 'qopt', (i + 1) + '. ' + o + '층');
        if (st.shown && i === B.ans) x.classList.add('ok');
        else if (st.shown && i === st.pick) x.classList.add('no');
        else if (!st.shown && i === st.pick) x.classList.add('sel');
        x.onclick = function () { if (st.shown) return; st.pick = i; draw(); };
        ob.appendChild(x);
      });
      wrap.querySelector('.quiz-a').innerHTML = st.shown ? '정답: <b>' + B.opts[B.ans] + '층</b> (' + B.name + ')' : '<span class="note">고른 뒤 스페이스 키나 [정답]으로 확인해요.</span>';
      if (!st.shown) { var bA = el('button', 'primary', '정답'); bA.onclick = function () { st.shown = true; draw(); }; wrap.querySelector('.quiz-a').appendChild(bA); }
    }
    draw();
    return { primary: function () { if (st.end) return; if (!st.shown) { st.shown = true; draw(); } else if (st.k < BUILDINGS.length - 1) load(st.k + 1); else { st.end = true; draw(); } } };
  }

  // ================= 도입 3: 학습목표 =================
  function sceneGoal(main) {
    var box = el('div', 'goal', '<div class="goal-lab">학습목표</div><p class="goal-txt">다면체의 <b>이름</b>을 지을 수 있고,<br><b>구성 요소의 개수</b>를 안다.</p><ol class="goal-map"><li>다면체의 뜻 <small>주요개념 1</small></li><li>다면체의 이름 <small>주요개념 2 · 연습하기</small></li><li>층마다 세기 <small>생각익히기</small></li><li>거꾸로 생각하기 · 도전 <small>마무리</small></li></ol>');
    main.appendChild(box);
    return {};
  }

  // ================= 주요개념 1 확인: 학습지의 O / X =================
  SH.plane4 = ['평면 사각형', false, WHY.flat, function () { return plane(4); }];
  var WS_OX = ['pentPyr', 'cylinder', 'sqFrustum', 'plane4'];
  function sceneWsOX(main) {
    return sortScene(main, {
      title: '학습지 확인: 다면체일까? (O / X)',
      items: WS_OX.map(function (k) { return { name: SH[k][0], ans: SH[k][1] ? 'yes' : 'no', why: SH[k][2], M: function () { return mesh(k); } }; }),
      bins: [
        { id: 'yes', cls: 'yes', title: '다면체 ○', btn: '다면체다 ○', keys: ['o', '1'], stamp: '다면체 ○' },
        { id: 'no', cls: 'no', title: '다면체가 아니에요 ✕', btn: '다면체가 아니다 ✕', keys: ['x', '2'], stamp: '다면체가 아니에요 ✕' }
      ]
    });
  }

  // ================= 연습하기: 다면체의 이름 2가지 =================
  var HANJA_N = { 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십' };
  var PRACTICE = [
    { n: 5, s: 0, h: 1.5 }, { n: 4, s: 0.5, h: 1.2 }, { n: 3, s: 1, h: 1.5 }, { n: 8, s: 0.62, h: 1.1 }
  ];
  function solidNS(n, s, h) { var M = finish(extrude(regular(n, 1), h || 1.4, { top: s })); M.tint = M.N.map(function (nn) { return Math.abs(nn[1]) < 0.99; }); return M; }
  function kindNS(s) { return s >= 1 ? 'prism' : s <= 0 ? 'pyramid' : 'frustum'; }
  function facesNS(n, s) { return s <= 0 ? n + 1 : n + 2; }
  function scenePractice(main) {
    main.appendChild(el('div', 'scene-head', '<h2>연습하기: 다면체의 이름 2가지</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag'), num = S.add('big');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: 0, rev: {}, M: null };
    panel.appendChild(el('p', 'lead', '도형을 고르고, 학생들이 이름 2가지를 말한 뒤 칸을 눌러 확인하세요.'));
    var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
    var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
    var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
    function name2(P) { return { f: HANJA_N[facesNS(P.n, P.s)] + '면체', m: NAMES[P.n] + KIND[kindNS(P.s)] }; }
    function load(k) { st.k = k; var P = PRACTICE[k]; st.M = solidNS(P.n, P.s, P.h); num.textContent = '①②③④'[k]; tag.textContent = ''; S.reset(0.45); draw(); }
    function draw() {
      var h = '<table class="ctab big"><tr><th></th><th>면의 개수로</th><th>모양으로</th></tr>';
      PRACTICE.forEach(function (P, i) {
        var nm = name2(P);
        h += '<tr data-row="' + i + '" class="' + (i === st.k ? 'cur' : '') + '"><th class="rowpick">' + '①②③④'[i] + '</th>' +
          ['f', 'm'].map(function (c) { var k = i + c, on = st.rev[k]; return '<td data-k="' + k + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? nm[c] : '?') + '</td>'; }).join('') + '</tr>';
      });
      tbl.innerHTML = h + '</table>';
      var both = st.rev['0f'] && st.rev['1f'];
      note.hidden = !both;
      note.innerHTML = '①과 ②는 둘 다 <b>육면체</b>예요! 면의 개수로 지은 이름은 하나로 정해지지 않아요. 그래서 <b>모양으로 짓는 이름</b>이 필요해요.';
    }
    tbl.addEventListener('click', function (e) {
      var td = e.target.closest('td[data-k]'), tr = e.target.closest('tr[data-row]');
      if (tr && Number(tr.dataset.row) !== st.k) load(Number(tr.dataset.row));
      if (td) { st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; draw(); }
    });
    bAll.onclick = function () { var ks = []; PRACTICE.forEach(function (P, i) { ks.push(i + 'f', i + 'm'); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); draw(); };
    load(0);
    return {
      frame: function (dt, col) { if (S.tick(dt)) render(S.cv, st.M, S.mat, 0, 0.44, 3, col); },
      primary: function () { var k = st.k; if (!st.rev[k + 'f']) st.rev[k + 'f'] = 1; else if (!st.rev[k + 'm']) st.rev[k + 'm'] = 1; else if (k < PRACTICE.length - 1) { load(k + 1); return; } draw(); }
    };
  }

  // ================= 생각익히기: 다면체 분석하기 (학습지 표 그대로) =================
  var ANALYZE = [
    { name: '삼각뿔대', n: 3, s: 0.5, side: '사다리꼴', given: { base: 1 } },
    { name: '육각뿔', n: 6, s: 0, side: '삼각형', given: {} },
    { name: '오각기둥', n: 5, s: 1, side: '직사각형', given: {} }
  ];
  function layerParts(n, s, m) {
    var pyr = s <= 0;
    return { vertex: [n, pyr ? 1 : n, 0], edge: [n, pyr ? 0 : n, n], face: [1, pyr ? 0 : 1, n] }[m];
  }
  function sceneAnalyze(main) {
    main.appendChild(el('div', 'scene-head', '<h2>다면체 분석하기 — 층마다 세면 쉬워요!</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag'), big = S.add('big');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: 0, layer: 3, animT0: 0, rev: {}, M: null };
    var lrow = el('div', 'row', '<span class="lab">층 쌓기</span>');
    var lBtns = ['비우기', '1층', '2층', '층 사이'].map(function (t, lv) { var b = el('button', 'pick mini', t); b.onclick = function () { st.layer = lv; st.animT0 = performance.now(); draw(); }; lrow.appendChild(b); return b; });
    panel.appendChild(lrow);
    var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
    var note = el('p', 'callout'); note.hidden = true; panel.appendChild(note);
    var row = el('div', 'row'), bAll = el('button', '', '모두 열기 / 가리기'); row.appendChild(bAll); panel.appendChild(row);
    panel.appendChild(el('p', 'note', '열 제목(도형 이름)을 누르면 왼쪽에 그 도형이 나와요. 개수 칸을 열면 층별로 센 식도 함께 보여요.'));
    var ROWS = [['base', '밑면의 모양'], ['side', '옆면의 모양'], ['vertex', '꼭짓점의 개수'], ['edge', '모서리의 개수'], ['face', '면의 개수']];
    function value(A, r) {
      if (r === 'base') return NAMES[A.n] + '형';
      if (r === 'side') return A.side;
      var p = layerParts(A.n, A.s, r), sum = p[0] + p[1] + p[2];
      return '<b>' + sum + '</b><small class="brk">' + p.join(' + ') + '</small>';
    }
    function load(k) { st.k = k; var A = ANALYZE[k]; st.M = layerSolid(A.n, A.s); tag.textContent = A.name; st.layer = 3; st.animT0 = 0; S.reset(0.42); draw(); }
    function draw() {
      lBtns.forEach(function (b, i) { b.classList.toggle('sel', i === st.layer); });
      big.innerHTML = st.layer ? '<span class="layer-badge ' + ['', 'l1', 'l3', 'l2'][st.layer] + '">' + ['', '1층', '2층', '층 사이'][st.layer] + '</span>' : '';
      var h = '<table class="ctab big analyze"><tr><th>다면체</th>' + ANALYZE.map(function (A, i) { return '<th data-col="' + i + '" class="colpick' + (i === st.k ? ' on' : '') + '">' + A.name + '</th>'; }).join('') + '</tr>';
      ROWS.forEach(function (r) {
        h += '<tr><th class="' + ({ vertex: 'c-vertex', edge: 'c-edge', face: 'c-face' }[r[0]] || '') + '">' + r[1] + '</th>' + ANALYZE.map(function (A, i) {
          var k = i + r[0], given = A.given[r[0]], on = given || st.rev[k];
          return given ? '<td class="given">' + value(A, r[0]) + '</td>' : '<td data-k="' + k + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? value(A, r[0]) : '?') + '</td>';
        }).join('') + '</tr>';
      });
      tbl.innerHTML = h + '</table>';
      note.hidden = !(st.rev['1face'] && st.rev['2face']);
      note.innerHTML = '육각뿔과 오각기둥은 둘 다 <b>칠면체</b>예요. 그런데 꼭짓점과 모서리의 개수는 달라요. 층 구조가 다르기 때문이에요.';
    }
    tbl.addEventListener('click', function (e) {
      var th = e.target.closest('th[data-col]'); if (th) { load(Number(th.dataset.col)); return; }
      var td = e.target.closest('td[data-k]'); if (!td) return;
      var col = Number(td.dataset.k[0]); if (col !== st.k) load(col);
      st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; draw();
    });
    bAll.onclick = function () { var ks = []; ANALYZE.forEach(function (A, i) { ROWS.forEach(function (r) { if (!A.given[r[0]]) ks.push(i + r[0]); }); }); var on = ks.every(function (k) { return st.rev[k]; }); ks.forEach(function (k) { st.rev[k] = on ? 0 : 1; }); draw(); };
    load(0);
    return {
      frame: function (dt, col) { if (S.tick(dt)) drawLayers(S.cv, st.M, st.layer, st.animT0, S.mat, 0, 0.4, col); },
      primary: function () { st.layer = st.layer < 3 ? st.layer + 1 : 1; st.animT0 = performance.now(); draw(); }
    };
  }

  // ================= 거꾸로 생각하기 (학습지 역문제) =================
  function sceneReverse(main) {
    var head = el('div', 'scene-head', '<h2>거꾸로 생각하기</h2>'); main.appendChild(head);
    var tabs = el('div', 'tools'); head.appendChild(tabs);
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { p: 0, step: 0, pick: {}, M: null };
    var PROB = [
      { t: '학습지', q: '면의 개수가 <b>8</b>인 각뿔대의 모서리의 개수를 <i>a</i>, 꼭짓점의 개수를 <i>b</i>라고 할 때, <i>b</i> − <i>a</i>의 값을 구하시오.' },
      { t: '더 해 보기', q: '모서리의 개수가 <b>12</b>인 다면체를 <b>모두</b> 찾아보세요. (각기둥 · 각뿔대 · 각뿔 중에서)' }
    ];
    var tBtns = PROB.map(function (P, i) { var b = el('button', 'pick mini', P.t); b.onclick = function () { st.p = i; st.step = 0; st.pick = {}; draw(); }; tabs.appendChild(b); return b; });
    var qbox = el('p', 'qbox'); panel.appendChild(qbox);
    var body = el('div', 'revbody'); panel.appendChild(body);
    var row = el('div', 'row'), bNext = el('button', 'primary', '다음 단계 →'), bBack = el('button', '', '처음부터'); row.appendChild(bNext); row.appendChild(bBack); panel.appendChild(row);
    bNext.onclick = function () { step(); }; bBack.onclick = function () { st.step = 0; st.pick = {}; draw(); };
    function grid(n, show, hl) {   // show: 열린 행들, hl: 강조할 행
      var R = [['vertex', '꼭짓점'], ['edge', '모서리'], ['face', '면']];
      var h = '<table class="ctab layers"><tr><th></th><th><span class="layer-badge l1">1층</span></th><th><span class="layer-badge l3">2층</span></th><th><span class="layer-badge l2">층 사이</span></th><th>합계</th></tr>';
      R.forEach(function (r) {
        var p = layerParts(n || 0, 0.5, r[0]), on = show[r[0]];
        h += '<tr' + (hl === r[0] ? ' class="cur"' : '') + '><th class="c-' + r[0] + '">' + r[1] + '</th>';
        if (r[0] === 'face' && show.faceQ) h += '<td>1</td><td>1</td><td class="hl"><i>n</i></td><td>8</td>';
        else if (on) h += '<td>' + p[0] + '</td><td>' + p[1] + '</td><td>' + p[2] + '</td><td><b>' + (p[0] + p[1] + p[2]) + '</b></td>';
        else h += '<td class="nb">·</td><td class="nb">·</td><td class="nb">·</td><td class="nb">·</td>';
        h += '</tr>';
      });
      return h + '</table>';
    }
    var STEPS1 = [
      function () { return '<p class="hint1">각뿔대는 <b>1층과 2층</b>이 모두 다각형이에요. 면은 어디에 몇 개씩 있을까요?</p>' + grid(0, {}); },
      function () { return '<p class="hint1">면 = 1층 1개 + 2층 1개 + 층 사이 <i>n</i>개 = 8</p>' + grid(0, { faceQ: 1 }, 'face'); },
      function () { return '<p class="hint1">1 + 1 + <i>n</i> = 8 이므로 <i>n</i> = <b>6</b> → <b>육각뿔대</b></p>' + grid(6, { face: 1 }, 'face'); },
      function () { return '<p class="hint1">모서리 = 6 + 6 + 6 = <b>18</b> → <i>a</i> = 18</p>' + grid(6, { face: 1, edge: 1 }, 'edge'); },
      function () { return '<p class="hint1">꼭짓점 = 6 + 6 + 0 = <b>12</b> → <i>b</i> = 12</p>' + grid(6, { face: 1, edge: 1, vertex: 1 }, 'vertex'); },
      function () { return '<p class="answer"><i>b</i> − <i>a</i> = 12 − 18 = <b>−6</b></p>' + grid(6, { face: 1, edge: 1, vertex: 1 }); }
    ];
    var CANDS = [
      { name: '삼각기둥', n: 3, s: 1, e: 9 }, { name: '사각기둥', n: 4, s: 1, e: 12 }, { name: '사각뿔대', n: 4, s: 0.5, e: 12 },
      { name: '오각뿔', n: 5, s: 0, e: 10 }, { name: '육각뿔', n: 6, s: 0, e: 12 }, { name: '사각뿔', n: 4, s: 0, e: 8 }
    ];
    function step() {
      if (st.p === 0) { if (st.step < STEPS1.length - 1) st.step++; }
      else { var nxt = CANDS.filter(function (c, i) { return !st.pick[i]; })[0]; if (nxt) st.pick[CANDS.indexOf(nxt)] = 1; }
      draw();
    }
    function draw() {
      tBtns.forEach(function (b, i) { b.classList.toggle('sel', i === st.p); });
      qbox.innerHTML = PROB[st.p].q;
      if (st.p === 0) {
        body.innerHTML = STEPS1[st.step]();
        var n = st.step >= 2 ? 6 : 0;
        st.M = n ? layerSolid(6, 0.5) : null; tag.textContent = n ? '육각뿔대' : '면이 8개인 각뿔대는?';
        bNext.disabled = st.step >= STEPS1.length - 1;
      } else {
        body.innerHTML = '<p class="hint1">각기둥·각뿔대는 모서리 = <i>n</i> + <i>n</i> + <i>n</i>, 각뿔은 <i>n</i> + 0 + <i>n</i> … 층마다 세어 확인해요. 카드를 눌러 모서리 개수를 열어 보세요.</p><div class="cands">' +
          CANDS.map(function (c, i) { var on = st.pick[i]; return '<button class="cand' + (on ? (c.e === 12 ? ' ok' : ' no') : '') + '" data-i="' + i + '">' + c.name + '<small>' + (on ? '모서리 ' + c.e + '개' : '?') + '</small></button>'; }).join('') + '</div>' +
          (CANDS.every(function (c, i) { return c.e !== 12 || st.pick[i]; }) ? '<p class="callout">모서리가 12개인 다면체: <b>사각기둥, 사각뿔대, 육각뿔</b></p>' : '');
        var last = -1; Object.keys(st.pick).forEach(function (k) { last = Number(k); });
        st.M = last >= 0 ? layerSolid(CANDS[last].n, CANDS[last].s) : null; tag.textContent = last >= 0 ? CANDS[last].name : '';
        bNext.disabled = false;
      }
    }
    body.addEventListener('click', function (e) { var b = e.target.closest('.cand'); if (!b) return; var i = Number(b.dataset.i); st.pick[i] = st.pick[i] ? 0 : 1; if (!st.pick[i]) delete st.pick[i]; draw(); });
    draw();
    return {
      frame: function (dt, col) { if (S.tick(dt)) { if (st.M) drawLayers(S.cv, st.M, 3, 0, S.mat, 0, 0.4, col); else { var c = S.cv.getContext('2d'); c.setTransform(S.cv._d, 0, 0, S.cv._d, 0, 0); c.clearRect(0, 0, S.cv._w, S.cv._h); if (G3) G3.hide(); } } },
      primary: step
    };
  }

  // ================= 직접 그려봅시다: 층 순서로 겨냥도 그리기 =================
  function sceneDraw(main) {
    main.appendChild(el('div', 'scene-head', '<h2>직접 그려봅시다 — 1층 → 2층 → 층 사이 순서로</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: 0, layer: 1, animT0: performance.now(), M: null };
    var SHAPES = [['사각기둥', 4, 1], ['사각뿔', 4, 0], ['사각뿔대', 4, 0.5]];
    var krow = el('div', 'row');
    var kBtns = SHAPES.map(function (x, i) { var b = el('button', 'pick mini', x[0]); b.onclick = function () { st.k = i; st.layer = 1; st.animT0 = performance.now(); load(); }; krow.appendChild(b); return b; });
    panel.appendChild(krow);
    var lrow = el('div', 'row');
    var lBtns = ['1층', '2층', '층 사이'].map(function (t, i) { var b = el('button', 'pick mini', t); b.onclick = function () { st.layer = i + 1; st.animT0 = performance.now(); upd(); }; lrow.appendChild(b); return b; });
    var bStep = el('button', 'primary', '다음 →'); bStep.onclick = function () { st.layer = st.layer < 3 ? st.layer + 1 : 1; st.animT0 = performance.now(); upd(); }; lrow.appendChild(bStep);
    panel.appendChild(lrow);
    var tip = el('div', 'drawtips'); panel.appendChild(tip);
    panel.appendChild(el('p', 'note', '고정 축을 켜고 <b>밑면 평행</b>을 누르면 교과서 겨냥도처럼 볼 수 있어요. 보이지 않는 모서리는 점선이에요.'));
    function load() { st.M = layerSolid(4, SHAPES[st.k][2]); tag.textContent = SHAPES[st.k][0]; kBtns.forEach(function (b, i) { b.classList.toggle('sel', i === st.k); }); upd(); }
    function upd() {
      lBtns.forEach(function (b, i) { b.classList.toggle('sel', i + 1 === st.layer); });
      var pyr = SHAPES[st.k][2] <= 0, fr = SHAPES[st.k][2] > 0 && SHAPES[st.k][2] < 1;
      var T = ['① <b>1층</b>: 밑면(사각형)을 비스듬히 그려요. 뒤쪽 두 변은 점선으로.',
        '② <b>2층</b>: ' + (pyr ? '꼭대기 <b>점 하나</b>를 밑면 한가운데 위에 찍어요.' : fr ? '1층보다 <b>작은</b> 사각형을 위에 그려요.' : '1층과 <b>똑같은</b> 사각형을 바로 위에 그려요.'),
        '③ <b>층 사이</b>: ' + (pyr ? '밑면의 꼭짓점과 꼭대기 점을 이어요.' : '1층과 2층의 꼭짓점을 짝지어 이어요.') + ' 가려지는 선은 점선!'];
      tip.innerHTML = T.map(function (t, i) { return '<p class="' + (i + 1 === st.layer ? 'on' : i + 1 < st.layer ? 'done' : '') + '">' + t + '</p>'; }).join('');
    }
    load(); S.reset(0.32);
    return {
      frame: function (dt, col) { if (S.tick(dt)) drawLayersG(S.cv, st.M, layersOf(st.M), st.layer, st.animT0, S.mat, 0, 0.42, col, true); },
      primary: function () { bStep.onclick(); }
    };
  }

  // ================= 도전 1: 왜 이면체, 삼면체는 없을까? =================
  function sceneWhy4(main) {
    main.appendChild(el('div', 'scene-head', '<h2>도전: 왜 이면체, 삼면체는 없을까?</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag'), stamp = S.add('stamp');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var st = { k: 2, show: false };
    function openTri(k) {   // 한 점에 삼각형 k개를 모은 모양 (바닥 없음)
      var V = [[0, 0.9, 0]], F = [], r = 1.1;
      if (k === 2) { V.push([-r, -0.6, 0.3], [r * 0.2, -0.6, -0.9], [r, -0.6, 0.4]); F = [[0, 1, 2], [0, 2, 3]]; }
      else { regular(k, r).forEach(function (q) { V.push([q[0], -0.6, q[1]]); }); for (var i = 0; i < k; i++) F.push([0, 1 + i, 1 + (i + 1) % k]); }
      return finish({ V: V, F: F, open: true });
    }
    var MESH4 = { 2: openTri(2), 3: openTri(3), 4: finish(extrude(regular(3, 1.1), 1.5, { top: 0 })) };
    var krow = el('div', 'row', '<span class="lab">면의 개수</span>');
    var kBtns = [[2, '면 2개'], [3, '면 3개'], [4, '면 4개']].map(function (x) { var b = el('button', 'pick mini', x[1]); b.onclick = function () { st.k = x[0]; upd(); }; krow.appendChild(b); return b; });
    panel.appendChild(krow);
    var msg = el('p', 'lead'); panel.appendChild(msg);
    var bWhy = el('button', '', '층으로 설명하기 ▼'); panel.appendChild(bWhy);
    var why = el('div', 'why4'); why.hidden = true; panel.appendChild(why);
    why.innerHTML = '<p>다면체를 층으로 보면 <b>면 = 1층 1개 + 2층 (1개 또는 0개) + 층 사이 <i>n</i>개</b></p><p>밑면은 다각형이니까 <i>n</i>은 <b>3 이상</b>이에요.</p><p>가장 적을 때: 1 + 0 + 3 = <b>4</b> → 삼각뿔(사면체)</p><p class="note">각기둥 · 각뿔대 · 각뿔에 대한 설명이에요. 모든 다면체에 대한 증명은 고등학교 이후에 배워요.</p>';
    bWhy.onclick = function () { why.hidden = !why.hidden; bWhy.textContent = why.hidden ? '층으로 설명하기 ▼' : '층으로 설명하기 ▲'; };
    function upd() {
      kBtns.forEach(function (b, i) { b.classList.toggle('sel', i + 2 === st.k); });
      tag.textContent = st.k === 4 ? '삼각뿔 (사면체)' : '면 ' + st.k + '개를 한 점에';
      stamp.className = 'stamp ' + (st.k === 4 ? 'yes' : 'no'); stamp.textContent = st.k === 4 ? '둘러싸였어요 ○' : '뚫려 있어요 ✕'; anim(stamp, 'pop');
      msg.innerHTML = st.k === 2 ? '면 2개를 붙이면 책을 펼친 모양이에요. 공간을 <b>둘러쌀 수 없어요</b>.' :
        st.k === 3 ? '면 3개를 한 점에 모으면 뾰족해지지만 <b>바닥이 뚫려</b> 있어요. 층으로 말하면 <b>층 사이 면만 있고 1층이 없는</b> 상태예요.' :
        '바닥(1층)을 덮으면 비로소 닫혀요. 그래서 가장 면이 적은 다면체는 <b>사면체</b>예요.';
    }
    upd(); S.reset(0.5);
    return {
      frame: function (dt, col) { if (S.tick(dt)) render(S.cv, MESH4[st.k], S.mat, 0, 0.44, 3, col); },
      primary: function () { if (st.k < 4) { st.k++; upd(); } else if (why.hidden) bWhy.onclick(); }
    };
  }

  // ================= 도전 2: 팔면체도 층으로 셀 수 있을까? (정다면체 차시로 가는 다리) =================
  var OCTA_COL = { 1: '112, 72, 232', 2: '28, 126, 214', 3: '112, 72, 232', 4: '232, 89, 12', 5: '232, 89, 12' };
  function sceneOcta(main) {
    main.appendChild(el('div', 'scene-head', '<h2>도전: 팔면체도 층으로 셀 수 있을까?</h2>'));
    var two = el('div', 'two'); main.appendChild(two);
    var S = Stage(two), tag = S.add('tag'), big = S.add('big');
    var panel = el('div', 'panel'); two.appendChild(panel);
    var M = prep(finish(G_octa())); M.c = [0, 0, 0]; M.R = 1.15;
    var vL = M.V.map(function (v) { return v[1] > 0.5 ? 1 : v[1] < -0.5 ? 3 : 2; });
    var eL = M.E.map(function (e) { var a = vL[e.a], b = vL[e.b]; if (a === b) return a; return Math.min(a, b) === 1 ? 4 : 5; });
    var fL = M.F.map(function (f) { return f.some(function (v) { return vL[v] === 1; }) ? 4 : 5; });
    var L = { vL: vL, eL: eL, fL: fL, col: OCTA_COL, max: 5 };
    var st = { step: 1, animT0: performance.now(), rev: {} };
    var COLS = [{ s: 1, name: '위 점', cls: 'l3' }, { s: 2, name: '가운데', cls: 'l1' }, { s: 3, name: '아래 점', cls: 'l3' }, { s: 4, name: '위 층 사이', cls: 'l2' }, { s: 5, name: '아래 층 사이', cls: 'l2' }];
    var VAL = { vertex: [1, 4, 1, 0, 0], edge: [0, 4, 0, 4, 4], face: [0, 0, 0, 4, 4] };
    panel.appendChild(el('p', 'lead', '팔면체는 <b>점 – 사각형 – 점</b>, 3층이에요. 층마다 세어 볼까요?'));
    var lrow = el('div', 'row');
    var bStep = el('button', 'primary', ''); bStep.onclick = function () { st.step = st.step < 5 ? st.step + 1 : 1; st.animT0 = performance.now(); upd(); };
    lrow.appendChild(bStep); panel.appendChild(lrow);
    var tbl = el('div', 'tabwrap'); panel.appendChild(tbl);
    panel.appendChild(el('p', 'note', '칸을 눌러 열어요. 다음 시간에 배우는 정다면체도 이렇게 층으로 셀 수 있어요.'));
    function upd() {
      bStep.textContent = st.step < 5 ? '다음 쌓기 → (' + COLS[st.step].name + ')' : '처음부터 ↺';
      big.innerHTML = '<span class="layer-badge ' + COLS[st.step - 1].cls + '">' + COLS[st.step - 1].name + '</span>';
      tag.textContent = '팔면체';
      var h = '<table class="ctab layers"><tr><th></th>' + COLS.map(function (c) { return '<th><span class="layer-badge ' + c.cls + '">' + c.name + '</span></th>'; }).join('') + '<th>합계</th></tr>';
      [['vertex', '꼭짓점'], ['edge', '모서리'], ['face', '면']].forEach(function (r) {
        var all = true;
        h += '<tr><th class="c-' + r[0] + '">' + r[1] + '</th>' + COLS.map(function (c, j) {
          var k = r[0] + c.s, built = c.s <= st.step, on = built && st.rev[k]; if (!on) all = false;
          return built ? '<td data-k="' + k + '" class="' + (on ? 'rev' : 'q') + '">' + (on ? VAL[r[0]][j] : '?') + '</td>' : '<td class="nb">·</td>';
        }).join('');
        var sum = VAL[r[0]].reduce(function (a, b) { return a + b; }, 0);
        h += '<td class="' + (all ? 'rev' : 'nb') + '">' + (all ? VAL[r[0]].join(' + ') + ' = <b>' + sum + '</b>' : '·') + '</td></tr>';
      });
      tbl.innerHTML = h + '</table>';
    }
    tbl.addEventListener('click', function (e) { var td = e.target.closest('td[data-k]'); if (!td) return; st.rev[td.dataset.k] = st.rev[td.dataset.k] ? 0 : 1; upd(); });
    upd(); S.reset(0.38);
    return {
      frame: function (dt, col) { if (S.tick(dt)) drawLayersG(S.cv, M, L, st.step, st.animT0, S.mat, 0, 0.42, col, false); },
      primary: function () { bStep.onclick(); }
    };
  }

  // ================= 장면 넘기기 =================
  // ---- three.js 엔진 (시범): 머리의 체크박스로 켜고 끈다. 켜면 engine3d.js를 그때 불러온다 ----
  var G3 = null, USE3D = false;
  function use3d(cv) { return USE3D && G3 && cv._box; }
  function set3D(on) {
    var box = $('eng3d');
    if (!on) { USE3D = false; box.checked = false; if (G3) G3.hide(); try { localStorage.setItem('eng3d', '0'); } catch (e) {} return; }
    import('./engine3d.js').then(function (m) { G3 = m; USE3D = true; box.checked = true; try { localStorage.setItem('eng3d', '1'); } catch (e) {} })
      .catch(function () { USE3D = false; box.checked = false; $('eng3d-msg').hidden = false; setTimeout(function () { $('eng3d-msg').hidden = true; }, 6000); });
  }
  $('eng3d').onchange = function () { set3D(this.checked); };
  try { if (localStorage.getItem('eng3d') === '1') set3D(true); } catch (e) {}
  var SECS = [], SCENES = [], cur = -1, active = null;
  function startLesson(secs, scenes) {
    SECS = secs; SCENES = scenes;
    function go(k) {
      if (k < 0 || k >= SCENES.length || k === cur) return;
      if (active && active.unmount) active.unmount();
      cur = k; var main = $('scene'); main.innerHTML = '';
      active = SCENES[k].mount(main) || {};
      $('secs').innerHTML = SECS.map(function (t, i) { return '<button data-s="' + i + '" class="' + (SCENES[k].sec === i ? 'on' : '') + '">' + (i + 1) + '. ' + t + '</button>'; }).join('');
      $('dots').innerHTML = SCENES.map(function (s, i) { return s.sec !== SCENES[k].sec ? '' : '<button data-k="' + i + '" title="' + s.title + '" class="' + (i === k ? 'on' : '') + '">' + (i + 1) + '</button>'; }).join('');   // 지금 단원의 장면만
      $('stitle').innerHTML = (k + 1) + ' / ' + SCENES.length + ' · ' + SCENES[k].title + (SCENES[k].ws ? ' <span class="wsfoot">학습지: ' + SCENES[k].ws + '</span>' : '');
      var hd = main.querySelector('.scene-head'); if (hd && SCENES[k].ws) hd.appendChild(el('span', 'wschip', '학습지 · ' + SCENES[k].ws));
      $('prev').disabled = k === 0; $('next').disabled = k === SCENES.length - 1;
      try { history.replaceState(null, '', '#s' + (k + 1)); } catch (e) {}
    }
    $('secs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var s = Number(b.dataset.s); for (var i = 0; i < SCENES.length; i++) if (SCENES[i].sec === s) { go(i); break; } });
    $('dots').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go(Number(b.dataset.k)); });
    $('prev').onclick = function () { go(cur - 1); };
    $('next').onclick = function () { go(cur + 1); };
    // 키보드: → ← (발표용 리모컨의 PageDown/PageUp도), 1·2·3 단원, 스페이스는 장면의 주 동작
    document.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (document.querySelector('.modal:not([hidden])')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
      else if (e.key === ' ' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); if (active.primary) active.primary(); }
      else if (e.key >= '1' && e.key <= '5') { var s = Number(e.key) - 1; for (var i = 0; i < SCENES.length; i++) if (SCENES[i].sec === s) { go(i); break; } }
    });
    var last = 0;
    function loop(t) {
      var dt = Math.min(50, t - (last || t)); last = t;
      if (active && active.frame) active.frame(dt, cols());
      requestAnimationFrame(loop);
    }
    var start = /^#s(\d+)$/.exec(location.hash);
    go(start ? Math.min(SCENES.length, Math.max(1, Number(start[1]))) - 1 : 0);
    requestAnimationFrame(loop);
  }
