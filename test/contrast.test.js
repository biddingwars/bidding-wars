/* WCAG contrast of the real design tokens in app.css, in both themes. No browser needed.
   Text must reach 4.5:1 on every surface it can sit on (page background and its two
   gradient blobs, plain glass, bright glass). Fails if someone retunes a colour badly. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');

function block(sel) {
  const i = css.indexOf(sel + '{'); assert.ok(i >= 0, 'block ' + sel);
  return css.slice(i + sel.length + 1, css.indexOf('}', i));
}
function tokens(sel) {
  const t = {};
  for (const m of block(sel).matchAll(/--([\w-]+):([^;]+);/g)) t[m[1]] = m[2].trim();
  return t;
}
const dark = tokens(':root'), light = Object.assign({}, dark, tokens(':root[data-theme=light]'));

const parse = v => {
  let m = /^#([0-9a-f]{6})$/i.exec(v); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = /^rgba?\(([^)]+)\)$/.exec(v); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
  throw new Error('cannot parse ' + v);
};
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

for (const [name, T] of [['Nocturne (dark)', dark], ['Daylight (light)', light]]) {
  const bg1 = parse(T.bg1), bg2 = parse(T.bg2);
  const bases = [bg1, bg2, over(parse(T.blob1), bg1), over(parse(T.blob2), bg2)];
  const surfaces = bases.flatMap(b => [b, over(parse(T.glass), b), over(parse(T.glass2), b)]);
  const worst = (fg, surfs) => Math.min(...surfs.map(s => ratio(fg, s)));

  test(name + ': body, secondary and tertiary text reach 4.5:1 on every surface', () => {
    for (const k of ['ink', 'ink2', 'ink3']) assert.ok(worst(parse(T[k]), surfaces) >= 4.5, `${k} ${worst(parse(T[k]), surfaces).toFixed(2)}`);
  });
  test(name + ': brass label text reaches 4.5:1 on surfaces and on its own tint', () => {
    assert.ok(worst(parse(T.goldink), surfaces) >= 4.5, 'goldink on surfaces ' + worst(parse(T.goldink), surfaces).toFixed(2));
    const tinted = surfaces.map(s => over(parse(T.goldtint), s));
    assert.ok(worst(parse(T.goldink), tinted) >= 4.5, 'goldink on tint ' + worst(parse(T.goldink), tinted).toFixed(2));
  });
  test(name + ': text on a brass button reaches 4.5:1 across the whole gradient', () => {
    for (const g of ['gold1', 'gold2']) assert.ok(ratio(parse(T['on-gold']), parse(T[g])) >= 4.5, `on-gold on ${g} ${ratio(parse(T['on-gold']), parse(T[g])).toFixed(2)}`);
  });
  test(name + ': Drop out text reaches 4.5:1 on its tinted button; the urgent seconds badge too', () => {
    const acc = parse(T['danger-accent']), tint = surfaces.map(s => over([acc[0], acc[1], acc[2], .08], s));
    assert.ok(worst(parse(T.danger), tint) >= 4.5, 'danger ' + worst(parse(T.danger), tint).toFixed(2));
    assert.ok(ratio(parse(T['on-danger']), acc) >= 4.5, 'on-danger ' + ratio(parse(T['on-danger']), acc).toFixed(2));
  });
  test(name + ': white initials reach 4.5:1 on all four seat colours', () => {
    for (const k of ['seat0', 'seat1', 'seat2', 'seat3']) assert.ok(ratio([255, 255, 255, 1], parse(T[k])) >= 4.5, `${k} ${ratio([255, 255, 255, 1], parse(T[k])).toFixed(2)}`);
  });
  test(name + ': sheet text and the seconds badge', () => {
    const sheets = [parse(T.sheet1), parse(T.sheet2)];
    for (const k of ['ink', 'ink2', 'ink3', 'goldink']) assert.ok(worst(parse(T[k]), sheets) >= 4.5, `${k} on sheet ${worst(parse(T[k]), sheets).toFixed(2)}`);
  });
}

test('the gold SOLD slab: dark lettering on the whole brass gradient', () => {
  for (const bg of ['#F4DC9A', '#E7BE62', '#C9953C']) {
    assert.ok(ratio(parse('#2B1E06'), parse(bg)) >= 4.5, 'SOLD on ' + bg);
    assert.ok(ratio(parse('#2B1E06'), parse(bg)) >= 4.5, 'caption on ' + bg);
  }
  assert.ok(ratio(parse('#2A2E4A'), parse('#A9AFC8')) >= 4.5, 'overpaid caption');
  assert.ok(ratio(parse('#FFFFFF'), parse('#5F688D')) >= 4.5, 'overpaid pill');
});
