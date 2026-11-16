// The hands-on activities students do in each step. Each one draws from its saved state and calls
// onChange(state) after every change; the lesson saves it and checks whether the step is done.
// The rules for "done" live in logic.js, so the screen and the tests agree.
//
// Placing things works two ways: drag a card, or tap a card and then tap where it goes. Tapping
// also works on touchscreens and with a keyboard.
import { h, svg, clear, fill, md, toast } from '../ui.js';
import { readButton } from '../settings.js';
import { stateOf, isDone, words, bitsValue, toBits, LETTERS, SPEED, SPEED_START, loadSeconds, designPicks, computerName, linksFor, framePieces } from './logic.js';
import { casePicture, machinePicture, portIcon } from './pictures.js';
import { CATEGORIES, BUDGET, PRICES_CHECKED, buildTotal, buildProblems, missingParts, optionById, PURPOSES, TODAY } from '../curriculum/catalog.js';
import { modelButton } from '../views/model3d.js';

/** A stable shuffle, so cards stay put between visits but don't start in the answer order. */
function shuffled(list, seed) {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    n = (n * 1103515245 + 12345) >>> 0;
    const j = n % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((x, i) => x === list[i])) out.push(out.shift());
  return out;
}

const shake = (el) => { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
const say = (box, kind, text) => { fill(box, h(`p.${kind}`, text)); };

/** A text box with a live word count against a goal. */
function wordBox({ label, value, minWords, onInput, rows = 3, placeholder = '', readOnly }) {
  const counter = h('span.word-count');
  const area = h('textarea', { rows, value: value || '', placeholder, readOnly, 'aria-label': label });
  const update = () => {
    const n = words(area.value);
    counter.textContent = minWords ? (n >= minWords ? `✓ ${n} words` : `${n} of ${minWords} words`) : `${n} words`;
    counter.className = `word-count ${!minWords || n >= minWords ? 'ok' : ''}`;
  };
  area.addEventListener('input', () => { update(); onInput(area.value); });
  update();
  return h('label.field.word-field', h('span', label), area, counter);
}

// Sort: put each card in a box, on a picture, or on a port ---------------------------------------

function sortActivity(spec, st, env) {
  const root = h('div.act.act-sort', { class: `layout-${spec.layout || 'bins'}` });
  let picked = null;
  const feedback = h('div.act-feedback', { 'aria-live': 'polite' });
  const order = shuffled(spec.items, `${env.stepId}`);
  const itemById = (id) => spec.items.find((x) => x.id === id);
  const locked = (id) => spec.graded && st.place[id] === itemById(id).bin;

  function place(itemId, binId, cardEl) {
    if (env.readOnly) return;
    const it = itemById(itemId);
    const bin = spec.bins.find((b) => b.id === binId);
    if (!it || !bin) return;
    if (spec.graded && it.bin !== binId) {
      st.misses = (st.misses || 0) + 1;
      say(feedback, 'warn', `Not quite. ${it.hint || `${it.label} doesn't go in "${bin.label}". Try another spot.`}`);
      picked = null;
      draw();
      shake(root.querySelector(`[data-item="${itemId}"]`) || cardEl);
      env.onChange(st);
      return;
    }
    st.place[itemId] = binId;
    picked = null;
    if (spec.graded) say(feedback, 'ok', `✓ ${it.label}: ${bin.label}.`);
    else clear(feedback);
    if (isDone(spec, st, env.ctx)) say(feedback, 'ok', spec.graded ? '✓ All sorted!' : '✓ All sorted. Press Next.');
    draw();
    env.onChange(st);
  }

  const card = (it) => h('button.chip', {
    type: 'button', 'data-item': it.id, draggable: env.readOnly || locked(it.id) ? 'false' : 'true',
    class: `${picked === it.id ? 'picked' : ''} ${locked(it.id) ? 'locked' : ''}`,
    'aria-pressed': picked === it.id ? 'true' : 'false',
    disabled: env.readOnly || locked(it.id),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move'; },
    onclick: (e) => {
      // Holding a card and tapping one already in a box puts the held card in that box.
      if (picked && picked !== it.id && st.place[it.id]) { e.stopPropagation(); place(picked, st.place[it.id], e.currentTarget); return; }
      picked = picked === it.id ? null : it.id;
      draw();
    },
  }, it.emoji && h('span.chip-emoji', { 'aria-hidden': 'true' }, it.emoji), h('span', it.label));

  const dropProps = (binId) => ({
    ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('over'); },
    ondragleave: (e) => e.currentTarget.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); place(e.dataTransfer.getData('text/plain'), binId, e.currentTarget); },
    onclick: (e) => { if (picked && !e.target.closest('button.chip')) place(picked, binId, e.currentTarget); },
  });

  function draw() {
    const waiting = order.filter((it) => !st.place[it.id]);
    const tray = h('div.tray', { 'aria-label': 'Cards to place', ...dropProps(null), onclick: null, ondrop: (e) => {
      // Ungraded sorts let a card come back to the tray.
      e.preventDefault();
      if (!spec.graded && !env.readOnly) { delete st.place[e.dataTransfer.getData('text/plain')]; draw(); env.onChange(st); }
    } }, waiting.length ? waiting.map(card) : h('p.muted.small', 'Every card is placed.'));
    let targets;
    if (spec.layout === 'diagram') {
      const placedIds = new Set(Object.keys(st.place).map((id) => itemById(id)?.bin).filter(Boolean));
      targets = h('div.diagram', casePicture(spec.picture === 'empty' ? 'empty' : 'inside', placedIds),
        spec.bins.map((b) => {
          const here = spec.items.filter((it) => st.place[it.id] === b.id);
          return h('button.pin', { type: 'button', style: `left:${b.x / 4}%;top:${b.y / 3}%`, class: `${here.length ? 'filled' : ''} ${picked ? 'ready' : ''}`, 'aria-label': here.length ? `${here.map((x) => x.label).join(', ')} placed here` : `Spot: ${spec.picture === 'empty' ? 'an empty slot' : 'a part'}${picked ? `. Put ${itemById(picked).label} here` : ''}`, ...dropProps(b.id) },
            here.length ? h('span.pin-tag', here.map((x) => x.label).join(', ')) : h('span.pin-dot', '?'));
        }));
    } else {
      targets = h('div.bins', spec.bins.map((b) => {
        const here = spec.items.filter((it) => st.place[it.id] === b.id);
        return h('div.bin', { class: picked ? 'ready' : '', tabindex: picked ? '0' : null, role: picked ? 'button' : null, 'aria-label': picked ? `Put ${itemById(picked).label} in ${b.label}` : b.label, onkeydown: (e) => { if (picked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); place(picked, b.id, e.currentTarget); } }, ...dropProps(b.id) },
          h('div.bin-head', spec.layout === 'ports' ? portIcon(b.id) : b.emoji && h('span.bin-emoji', { 'aria-hidden': 'true' }, b.emoji), h('strong', b.label)),
          h('div.bin-body', here.map((it) => (spec.graded ? h('span.chip.placed', it.emoji && h('span.chip-emoji', it.emoji), it.label) : card(it)))));
      }));
    }
    fill(root, 
      h('p.how', picked ? `Now tap where "${itemById(picked).label}" goes.` : 'Drag a card, or tap a card and then tap where it goes.'),
      targets, tray, feedback);
  }
  draw();
  if (isDone(spec, st, env.ctx)) say(feedback, 'ok', '✓ All sorted!');
  return root;
}

// Explore: tap cards to learn ------------------------------------------------------------------

function exploreActivity(spec, st, env) {
  const root = h('div.act.act-explore');
  function draw() {
    fill(root, h('div.cards', spec.cards.map((c) => {
      const open = st.opened.includes(c.id);
      return h('div.learn-card', { class: open ? 'open' : '' },
        h('button.learn-face', { type: 'button', 'aria-expanded': open ? 'true' : 'false', onclick: () => {
          if (!open) { st.opened.push(c.id); env.onChange(st); }
          draw();
        } }, h('span.learn-emoji', { 'aria-hidden': 'true' }, c.emoji), h('strong', c.title), !open && h('span.small.muted', 'Tap to learn')),
        open && h('div.learn-back', h('div.read-row', h('p', c.text), readButton(() => `${c.title}. ${c.text}`)), c.model && modelButton(c.model)));
    })), h('p.act-progress.small', `${st.opened.length} of ${spec.cards.length} opened`));
  }
  draw();
  return root;
}

// Order: tap things in the right order ------------------------------------------------------------

function orderActivity(spec, st, env) {
  const root = h('div.act.act-order', { class: spec.layout === 'diagram' ? 'layout-diagram' : '' });
  const feedback = h('div.act-feedback', { 'aria-live': 'polite' });
  const pool = shuffled(spec.items, env.stepId);
  function tap(it, el) {
    if (env.readOnly || st.done.includes(it.id)) return;
    const want = spec.items[st.done.length];
    if (it.id !== want.id) {
      st.misses = (st.misses || 0) + 1;
      say(feedback, 'warn', st.done.length === 0 ? 'Not first. Which one comes first?' : 'Not yet. What comes right after the last one?');
      shake(el);
      env.onChange(st);
      return;
    }
    st.done.push(it.id);
    say(feedback, 'ok', st.done.length === spec.items.length ? '✓ All in order!' : `✓ ${it.label}`);
    draw();
    env.onChange(st);
  }
  function draw() {
    if (spec.layout === 'diagram') {
      const visited = st.done.map((id) => spec.items.find((x) => x.id === id));
      const lines = visited.slice(1).map((b, i) => svg('line', { x1: visited[i].x, y1: visited[i].y, x2: b.x, y2: b.y, class: 'path-line' }));
      const last = visited[visited.length - 1];
      fill(root, 
        h('div.diagram.path-diagram', machinePicture(),
          svg('svg', { viewBox: '0 0 400 300', class: 'pic pic-lines', 'aria-hidden': 'true' }, ...lines, last && svg('circle', { cx: last.x, cy: last.y, r: 9, class: 'path-pulse' })),
          spec.items.map((it) => {
            const n = st.done.indexOf(it.id);
            return h('button.node', { type: 'button', style: `left:${it.x / 4}%;top:${it.y / 3}%`, class: n >= 0 ? 'visited' : '', disabled: env.readOnly, onclick: (e) => tap(it, e.currentTarget), 'aria-label': `${it.label}${n >= 0 ? `, step ${n + 1}` : ''}` },
              h('span.node-emoji', { 'aria-hidden': 'true' }, it.emoji), h('span.node-label', it.label), n >= 0 && h('span.node-n', n + 1));
          })),
        feedback);
      return;
    }
    fill(root, 
      h('ol.order-done', spec.items.map((_, i) => {
        const it = st.done[i] && spec.items.find((x) => x.id === st.done[i]);
        return h('li', { class: it ? 'filled' : '' }, h('span.order-n', i + 1), it ? [h('span', it.emoji, ' ', it.label), spec.reveal && it.size && h('span.size-tag', it.size)] : h('span.muted', '...'));
      })),
      h('p.how', st.done.length < spec.items.length ? (st.done.length ? 'Tap the one that comes next.' : 'Tap the one that comes first.') : ''),
      h('div.tray', pool.filter((it) => !st.done.includes(it.id)).map((it) => h('button.chip', { type: 'button', disabled: env.readOnly, onclick: (e) => tap(it, e.currentTarget) }, it.emoji && h('span.chip-emoji', it.emoji), h('span', it.label)))),
      feedback);
  }
  draw();
  return root;
}

// Judge: is there a computer inside? -------------------------------------------------------------

function judgeActivity(spec, st, env) {
  const root = h('div.act.act-judge');
  let open = null;
  const feedback = h('div.act-feedback', { 'aria-live': 'polite' });
  function answer(t, yes) {
    if (env.readOnly) return;
    if (yes !== t.yes) {
      st.misses = (st.misses || 0) + 1;
      if (!st.missed.includes(t.id)) st.missed.push(t.id);
      say(feedback, 'warn', 'Look again. Does it take input, follow instructions, and give output?');
      shake(root.querySelector('.judge-panel'));
      env.onChange(st);
      return;
    }
    if (!st.right.includes(t.id)) st.right.push(t.id);
    clear(feedback);
    draw();
    env.onChange(st);
  }
  function draw() {
    const t = open && spec.things.find((x) => x.id === open);
    const solved = t && st.right.includes(t.id);
    fill(root, 
      h('div.house', spec.things.map((x) => h('button.thing', { type: 'button', class: `${st.right.includes(x.id) ? (x.yes ? 'is-computer' : 'not-computer') : ''} ${open === x.id ? 'on' : ''}`, 'aria-pressed': open === x.id ? 'true' : 'false', onclick: () => { open = x.id; clear(feedback); draw(); } },
        h('span.thing-emoji', { 'aria-hidden': 'true' }, x.emoji), h('span', x.label), st.right.includes(x.id) && h('span.thing-mark', x.yes ? '💻' : '—')))),
      t ? h('div.judge-panel',
        h('h3', `${t.emoji} ${t.label}`),
        solved ? h('div.read-row', h('p', t.reveal), readButton(() => t.reveal))
          : [h('p', spec.question), h('div.row', h('button.btn', { type: 'button', onclick: () => answer(t, true) }, 'Yes'), h('button.btn', { type: 'button', onclick: () => answer(t, false) }, 'No'))])
        : h('p.how', 'Tap something in the house.'),
      feedback,
      h('p.act-progress.small', `${st.right.length} of ${spec.things.length} checked`));
  }
  draw();
  return root;
}

// Binary switches ---------------------------------------------------------------------------------

function switchRow(bits, onFlip, readOnly) {
  const size = bits.length;
  return h('div.switches', { style: `--n:${size}` }, bits.map((b, i) => h('button.switch', {
    type: 'button', class: b ? 'on' : '', role: 'switch', 'aria-checked': b ? 'true' : 'false', disabled: readOnly,
    'aria-label': size === 1 ? 'Switch' : `Switch worth ${2 ** (size - 1 - i)}`, onclick: () => onFlip(i),
  }, size > 1 && h('span.sw-value', 2 ** (size - 1 - i)), h('span.sw-bulb', { 'aria-hidden': 'true' }), h('span.sw-bit', b ? '1' : '0'))));
}

function binaryActivity(spec, st, env) {
  const root = h('div.act.act-binary');
  const feedback = h('div.act-feedback', { 'aria-live': 'polite' });
  const label = (n) => (spec.bits === 1 ? (n ? 'Turn it on' : 'Turn it off') : `Make ${n}`);
  function draw() {
    const value = bitsValue(st.bits);
    const done = st.hit >= spec.targets.length;
    fill(root, 
      h('div.targets', spec.targets.map((n, i) => h('span.target', { class: i < st.hit ? 'hit' : i === st.hit ? 'now' : '' }, i < st.hit ? `✓ ${label(n)}` : label(n)))),
      switchRow(st.bits, (i) => {
        if (env.readOnly) return;
        st.bits[i] = st.bits[i] ? 0 : 1;
        const v = bitsValue(st.bits);
        if (st.hit < spec.targets.length && v === spec.targets[st.hit]) {
          st.hit++;
          say(feedback, 'ok', st.hit >= spec.targets.length ? '✓ You made every one!' : `✓ ${spec.bits === 1 ? (v ? 'On is 1.' : 'Off is 0.') : `That's ${v}!`}`);
        } else clear(feedback);
        draw();
        env.onChange(st);
      }, env.readOnly),
      spec.bits > 1 && h('p.binary-sum', h('span.mono', st.bits.join('')), ' = ', st.bits.map((b, i) => (b ? 2 ** (spec.bits - 1 - i) : null)).filter((x) => x !== null).join(' + ') || '0', st.bits.filter(Boolean).length > 1 ? ` = ${value}` : ''),
      spec.bits === 1 && h('p.binary-sum', st.bits[0] ? 'On = 1' : 'Off = 0'),
      !done && h('p.how', `Goal: ${label(spec.targets[st.hit])}`),
      feedback);
  }
  draw();
  return root;
}

function decodeActivity(spec, st, env) {
  const root = h('div.act.act-decode');
  const codes = [...spec.message].map((c) => c.charCodeAt(0));
  const helper = { bits: Array(8).fill(0) };
  const ini = st.initial;
  let showTable = false;
  let decoderOpen = false; // Redrawing must not close the decoder while a student is using it.
  /** After a redraw, put focus back on the switch that was just flipped. */
  const refocus = (where, i) => root.querySelectorAll(`${where} .switch`)[i]?.focus();
  const status = h('div.act-feedback', { 'aria-live': 'polite' });
  function check() {
    const typed = String(st.letters || '').toUpperCase();
    root.querySelectorAll('.letter-box').forEach((box, i) => box.classList.toggle('right', typed[i] === spec.message[i]));
    if (typed === spec.message) say(status, 'ok', `✓ The message says ${spec.message}!`);
    else clear(status);
  }
  function draw() {
    const letters = String(st.letters || '').toUpperCase().padEnd(spec.message.length, ' ');
    const helperValue = bitsValue(helper.bits);
    const iniValue = bitsValue(ini.bits);
    fill(root, 
      h('div.secret', codes.map((n, i) => h('div.secret-byte',
        h('span.mono', toBits(n, 8).join('')),
        h('input.letter-box', { maxlength: 1, value: letters[i].trim(), readOnly: env.readOnly, 'aria-label': `Letter ${i + 1}, from the bits ${toBits(n, 8).join(' ')}`, autocomplete: 'off',
          oninput: (e) => {
            const chars = [...letters];
            chars[i] = (e.target.value.slice(-1) || ' ').toUpperCase();
            e.target.value = chars[i].trim();
            st.letters = chars.join('').replace(/\s+$/, '');
            check();
            env.onChange(st);
            if (e.target.value) e.target.closest('.secret-byte')?.nextElementSibling?.querySelector('input')?.focus();
          } })))),
      status,
      h('details.hint.decoder', { open: decoderOpen, ontoggle: (e) => { decoderOpen = e.currentTarget.open; } }, h('summary', 'Byte decoder: flip switches to turn bits into a number'),
        switchRow(helper.bits, (i) => { helper.bits[i] = helper.bits[i] ? 0 : 1; draw(); refocus('.decoder', i); }),
        h('p.binary-sum', h('span.mono', helper.bits.join('')), ` = ${helperValue}`, helperValue >= 65 && helperValue <= 90 ? h('strong', ` = the letter ${String.fromCharCode(helperValue)}`) : '')),
      h('button.btn.small', { type: 'button', onclick: () => { showTable = !showTable; draw(); } }, showTable ? 'Hide the code table' : 'Show the code table'),
      showTable && h('div.code-table', LETTERS.map((l) => h('span', h('strong', l), ` ${l.charCodeAt(0)}`))),
      spec.initial && h('section.stack.tight.initial',
        h('h3', 'Now write the first letter of your name in binary'),
        h('label.field.small', h('span', 'My letter'), h('select', { disabled: env.readOnly, onchange: (e) => { ini.letter = e.target.value; draw(); env.onChange(st); } },
          h('option', { value: '' }, 'Choose'), LETTERS.map((l) => h('option', { value: l, selected: ini.letter === l }, l)))),
        ini.letter && h('p.small', `${ini.letter} is ${ini.letter.charCodeAt(0)}. Flip the switches to make ${ini.letter.charCodeAt(0)}.`),
        ini.letter && switchRow(ini.bits, (i) => { if (env.readOnly) return; ini.bits[i] = ini.bits[i] ? 0 : 1; draw(); refocus('.initial', i); env.onChange(st); }, env.readOnly),
        ini.letter && h('p.binary-sum', h('span.mono', ini.bits.join('')), ` = ${iniValue}`, iniValue === ini.letter.charCodeAt(0) ? h('strong.ok', ` ✓ That's ${ini.letter}!`) : '')),
    );
    check();
  }
  draw();
  return root;
}

function pixelsActivity(spec, st, env) {
  const root = h('div.act.act-pixels');
  const size = spec.rows[0].length;
  const want = spec.rows.join('');
  function draw() {
    const grid = String(st.grid).padEnd(want.length, '0');
    fill(root, h('div.pixel-wrap',
      h('ol.bit-rows', spec.rows.map((r, y) => h('li', { class: grid.slice(y * size, (y + 1) * size) === r ? 'right' : '' }, h('span.mono', r))) ),
      h('div.pixel-grid', { style: `--n:${size}`, role: 'grid', 'aria-label': 'Picture grid' }, [...grid].map((c, i) => h('button.px', {
        type: 'button', class: c === '1' ? 'on' : '', disabled: env.readOnly, 'aria-label': `Row ${Math.floor(i / size) + 1}, square ${(i % size) + 1}, ${c === '1' ? 'black' : 'white'}`,
        onclick: () => { const g = [...grid]; g[i] = g[i] === '1' ? '0' : '1'; st.grid = g.join(''); draw(); env.onChange(st); },
      })))),
    grid === want ? h('p.ok', '✓ You drew it from the bits!') : h('p.how', 'A row turns green when it matches its bits.'));
  }
  draw();
  return root;
}

function colorActivity(spec, st, env) {
  const root = h('div.act.act-color');
  const swatch = h('div.swatch-big');
  const feedback = h('div.act-feedback', { 'aria-live': 'polite' });
  const names = ['Red', 'Green', 'Blue'];
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= spec.tolerance);
  const outs = [];
  function paint() {
    swatch.style.background = `rgb(${st.rgb.join(',')})`;
    outs.forEach((o, i) => { o.textContent = `${st.rgb[i]} = ${toBits(st.rgb[i], 8).join('')}`; });
  }
  function check() {
    if (st.hit < spec.targets.length && close(st.rgb, spec.targets[st.hit].rgb)) {
      st.hit++;
      say(feedback, 'ok', st.hit >= spec.targets.length ? '✓ You mixed every color!' : `✓ That's ${spec.targets[st.hit - 1].label.toLowerCase()}!`);
      drawTargets();
      env.onChange(st);
    }
  }
  const targets = h('div.targets');
  const drawTargets = () => fill(targets, ...spec.targets.map((t, i) => h('span.target', { class: i < st.hit ? 'hit' : i === st.hit ? 'now' : '' }, h('i.dot', { style: `background:rgb(${t.rgb.join(',')})` }), i < st.hit ? `✓ ${t.label}` : `Make ${t.label.toLowerCase()}`)));
  drawTargets();
  const sliders = names.map((n, i) => {
    const out = h('output.mono');
    outs.push(out);
    const input = h('input', { type: 'range', min: 0, max: 255, step: 1, value: st.rgb[i], disabled: env.readOnly, 'aria-label': `${n} amount`, class: `slider-${n.toLowerCase()}`,
      oninput: (e) => { st.rgb[i] = Number(e.target.value); paint(); check(); },
      onchange: () => env.onChange(st) });
    return h('label.color-row', h('span', n), input, out);
  });
  paint();
  root.append(targets, h('div.color-wrap', swatch, h('div.stack.tight', sliders)), feedback);
  return root;
}

// Speed lab ---------------------------------------------------------------------------------------

function speedActivity(spec, st, env) {
  const root = h('div.act.act-speed');
  let running = false;
  function draw(progress) {
    const best = st.tries.length ? Math.min(...st.tries.map(loadSeconds)) : null;
    fill(root, 
      h('div.speed-parts', Object.entries(SPEED).map(([k, def]) => h('fieldset.speed-part', h('legend', def.label),
        def.options.map((o) => h('label.check', h('input', { type: 'radio', name: `${env.stepId}-${k}`, checked: st.cfg[k] === o.id, disabled: env.readOnly || running, onchange: () => { st.cfg[k] = o.id; draw(); } }), h('span', o.label)))))),
      h('div.row', h('button.btn.primary', { type: 'button', disabled: env.readOnly || running, onclick: load }, '▶ Load the game'), h('span.muted', `Goal: under ${spec.goal} seconds`)),
      progress !== undefined && h('div.load-bar', h('div.load-fill', { style: `width:${Math.round(progress * 100)}%` }), h('span.load-text', `Loading... ${Math.round(progress * loadSeconds(st.cfg))} s`)),
      st.tries.length > 0 && h('table.board.speed-table', h('thead', h('tr', h('th', 'Try'), h('th', 'CPU'), h('th', 'RAM'), h('th', 'Storage'), h('th.num', 'Seconds'))),
        h('tbody', st.tries.map((t, i) => h('tr', { class: loadSeconds(t) < spec.goal ? 'goal' : '' }, h('td', i + 1),
          ...['cpu', 'ram', 'storage'].map((k) => h('td', SPEED[k].options.find((o) => o.id === t[k]).label)),
          h('td.num', `${loadSeconds(t)}${loadSeconds(t) < spec.goal ? ' ✓' : ''}`))))),
      best !== null && h('p', best < spec.goal ? h('strong.ok', `✓ Goal reached: ${best} seconds.`) : `Fastest so far: ${best} seconds.`, st.tries.length < spec.minTries ? ` Try at least ${spec.minTries} different setups.` : ''));
  }
  function load() {
    running = true;
    const start = performance.now();
    const dur = Math.min(2500, 300 + loadSeconds(st.cfg) * 70);
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      draw(p);
      if (p < 1) { requestAnimationFrame(tick); return; }
      running = false;
      st.tries.push({ ...st.cfg });
      if (st.tries.length > 20) st.tries.shift();
      draw();
      env.onChange(st);
    };
    requestAnimationFrame(tick);
  }
  if (!st.cfg) st.cfg = { ...SPEED_START };
  draw();
  return root;
}

// Project activities ------------------------------------------------------------------------------

function chooseActivity(spec, st, env) {
  const root = h('div.act.act-choose');
  const opts = [...spec.options, ...(spec.other ? [{ id: 'other', emoji: '💭', label: 'Something else', text: 'Check with your teacher first.' }] : [])];
  function draw() {
    fill(root, 
      h('div.choices', { role: 'radiogroup', 'aria-label': 'Choices' }, opts.map((o) => h('div.choice-wrap',
        h('button.choice', { type: 'button', role: 'radio', 'aria-checked': st.pick === o.id ? 'true' : 'false', disabled: env.readOnly, onclick: () => {
          if (st.pick === o.id) return;
          if (spec.track && env.onTrack && !env.onTrack(o.id)) return;
          st.pick = o.id; draw(); env.onChange(st);
        } }, h('span.choice-emoji', { 'aria-hidden': 'true' }, o.emoji), h('strong', o.label), o.text && h('span.small', o.text)),
        o.model && modelButton(o.model)))),
      st.pick === 'other' && wordBox({ label: 'Which computer?', value: st.text, minWords: 2, readOnly: env.readOnly, rows: 1, onInput: (v) => { st.text = v; env.onChange(st); } }),
      spec.ask && st.pick && st.pick !== 'other' && wordBox({ label: spec.ask.label, value: st.text, minWords: spec.ask.minWords, readOnly: env.readOnly, onInput: (v) => { st.text = v; env.onChange(st); } }));
  }
  draw();
  return root;
}

const money = (n) => `$${Number(n).toLocaleString('en-US')}`;

/** The running total for a design, shown at the top of every parts step. */
function budgetBar(picks) {
  const total = buildTotal(picks);
  const over = total > BUDGET;
  return h('div.budget', { class: over ? 'over' : '' },
    h('div.row.between', h('strong', `Total so far: ${money(total)}`), h('span', over ? `${money(total - BUDGET)} over budget` : `${money(BUDGET - total)} left of ${money(BUDGET)}`)),
    h('div.xpbar', h('div.xpfill', { style: `width:${Math.min(100, Math.round((total / BUDGET) * 100))}%` })),
    h('p.small.muted', `Real parts. Prices checked in ${PRICES_CHECKED}; real prices change every day. A ~ means a typical price.`));
}

function partsActivity(spec, st, env) {
  const root = h('div.act.act-parts');
  const top = h('div');
  const warn = h('div');
  const allPicks = () => ({ ...designPicks(env.ctx.answers), ...st.picks });
  const drawTop = () => {
    fill(top, budgetBar(allPicks()));
    fill(warn, ...buildProblems(allPicks()).map((p) => h('p.warn', `⚠️ ${p}`)));
  };
  const sections = spec.categories.map((id) => {
    const c = CATEGORIES.find((x) => x.id === id);
    const list = h('div.part-options');
    const drawList = () => fill(list, ...c.options.map((o) => {
      const on = c.many ? (st.picks[id] || []).includes(o.id) : st.picks[id] === o.id;
      return h('button.part', { type: 'button', role: c.many ? 'checkbox' : 'radio', 'aria-checked': on ? 'true' : 'false', disabled: env.readOnly, onclick: () => {
        if (c.many) {
          const cur = new Set(st.picks[id] || []);
          if (cur.has(o.id)) cur.delete(o.id); else cur.add(o.id);
          st.picks[id] = [...cur];
        } else st.picks[id] = o.id;
        drawList(); drawTop(); env.onChange(st);
      } }, h('span.part-name', o.label), h('span.part-price', `${o.estimate ? '~' : ''}${money(o.price)}`), h('span.small', o.spec), h('span.small.muted', o.note));
    }));
    drawList();
    return h('section.part-cat', h('div.row.between', h('h3', `${c.emoji} ${c.label}`), c.model && modelButton(c.model)),
      c.many && h('p.small.muted', 'Pick as many as it needs.'),
      list,
      wordBox({ label: `Why this ${c.many ? 'choice' : 'one'}? What will it do for your computer?`, value: (st.why || {})[id], minWords: spec.minWords, readOnly: env.readOnly, rows: 2, onInput: (v) => { st.why = { ...(st.why || {}), [id]: v }; env.onChange(st); } }));
  });
  drawTop();
  root.append(top, warn, ...sections);
  return root;
}

function specSheet(answers) {
  const picks = designPicks(answers);
  const purpose = PURPOSES.find((p) => p.id === answers?.purpose?.pick);
  const name = answers?.assemble?.name;
  const rows = CATEGORIES.flatMap((c) => {
    const ids = c.many ? (picks[c.id] || []) : picks[c.id] ? [picks[c.id]] : [];
    return ids.map((x) => optionById(x)).filter(Boolean).map((o) => h('tr', h('td', c.label), h('td', o.label), h('td.num', money(o.price))));
  });
  return h('div.spec-sheet',
    h('h3', name || 'My computer'), purpose && h('p.small', `${purpose.emoji} ${purpose.label}`),
    h('table.board', h('tbody', rows, h('tr.total', h('td', 'Total'), h('td', ''), h('td.num', money(buildTotal(picks)))))));
}

function budgetActivity(spec, st, env) {
  const root = h('div.act.act-budget');
  const picks = designPicks(env.ctx.answers);
  const missing = missingParts(picks);
  const problems = buildProblems(picks);
  const total = buildTotal(picks);
  fill(root, 
    budgetBar(picks),
    specSheet(env.ctx.answers),
    missing.length > 0 && h('p.warn', `Still to choose: ${missing.join(', ')}. Go back to that step to pick one.`),
    ...problems.map((p) => h('p.warn', `⚠️ ${p} Go back and change one of those parts.`)),
    total > BUDGET && h('p.warn', `You are ${money(total - BUDGET)} over. Go back and swap a part for a cheaper one.`),
    !missing.length && !problems.length && total <= BUDGET && h('p.ok', '✓ Complete, and within budget!'),
    wordBox({ label: 'One trade-off you made: what did you give up, and what did you get instead?', value: st.text, minWords: spec.minWords, readOnly: env.readOnly, onInput: (v) => { st.text = v; env.onChange(st); } }));
  return root;
}

function assembleActivity(spec, st, env) {
  const root = h('div.act.act-assemble');
  const picks = designPicks(env.ctx.answers);
  const placed = new Set(['board', 'cpu', 'ram', 'storage', 'psu', 'fan']);
  if (picks.graphics && picks.graphics !== 'gpu-none') placed.add('gpu');
  const pic = casePicture('empty', placed);
  pic.classList.add('assembling');
  const extras = (picks.extras || []).map((id) => optionById(id)).filter(Boolean);
  fill(root, 
    h('div.diagram.assemble-pic', pic),
    extras.length > 0 && h('p.small', 'Plugged in: ', extras.map((o) => o.label).join(', ')),
    h('label.field', h('span', 'Name your computer'), h('input', { maxlength: 40, value: st.name || '', readOnly: env.readOnly, placeholder: 'The Rock Hopper 1', oninput: (e) => { st.name = e.target.value; env.onChange(st); } })));
  return root;
}

function writeActivity(spec, st, env) {
  const root = h('div.act.act-write');
  if (spec.show === 'spec') root.append(specSheet(env.ctx.answers));
  root.append(...spec.prompts.map((p) => wordBox({ label: p.label, value: (st.text || {})[p.id], minWords: p.minWords, rows: p.minWords >= 20 ? 6 : 3, readOnly: env.readOnly, onInput: (v) => { st.text = { ...(st.text || {}), [p.id]: v }; env.onChange(st); } })));
  return root;
}

function linksActivity(spec, st, env) {
  const root = h('div.act.act-links');
  const links = linksFor(env.ctx);
  function draw() {
    fill(root,
      !links.length && h('p.warn', 'Go back and pick a computer first.'),
      h('div.cards.link-cards', links.map((l) => h('a.learn-card.link-card', {
        href: l.url, target: '_blank', rel: 'noopener noreferrer', class: st.opened.includes(l.url) ? 'open' : '',
        onclick: () => { if (!st.opened.includes(l.url)) { st.opened.push(l.url); env.onChange(st); draw(); } },
      }, h('span.learn-emoji', { 'aria-hidden': 'true' }, l.kids ? '📗' : '📚'), h('strong', l.label), h('span.small', l.kids ? 'Written for kids. Start here.' : 'More detail, harder reading.'),
        h('span.btn.small', st.opened.includes(l.url) ? '✓ Opened. Open again ↗' : 'Open ↗')))),
      h('div.look-for', h('h3', 'Look for:'), h('ul', h('li', 'Who made it, and when'), h('li', 'What people used it for'), h('li', 'How big it was'), h('li', 'Its input, processing, storage, and output'))),
      h('p.small.muted', 'The website opens in a new tab. Come back to this tab to fill in what you found.'));
  }
  draw();
  return root;
}

function framesActivity(spec, st, env) {
  const name = computerName(env.ctx);
  return h('div.act.act-frames', spec.frames.map((f) => h('p.frame', framePieces(f, name).map((piece) => (piece.key
    ? h('input.blank', { value: st.blanks[piece.key] || '', placeholder: piece.hint, 'aria-label': piece.hint, readOnly: env.readOnly, size: Math.max(12, piece.hint.length),
      oninput: (e) => { st.blanks[piece.key] = e.target.value; env.onChange(st); } })
    : piece.text)))));
}

function compareActivity(spec, st, env) {
  const name = computerName(env.ctx);
  return h('div.act.act-compare', h('div.table-wrap', h('table.board.compare',
    h('thead', h('tr', h('th', ''), h('th', `The ${name}, then`), h('th', TODAY.label))),
    h('tbody', TODAY.rows.map((r) => h('tr', h('th', { scope: 'row' }, r.label),
      h('td', h('input', { value: st.then[r.id] || '', readOnly: env.readOnly, 'aria-label': `${r.label} for ${name || 'your computer'}`, oninput: (e) => { st.then[r.id] = e.target.value; env.onChange(st); } })),
      h('td.muted', r.now)))))));
}

const RENDER = {
  sort: sortActivity, explore: exploreActivity, order: orderActivity, judge: judgeActivity, binary: binaryActivity, decode: decodeActivity,
  pixels: pixelsActivity, color: colorActivity, speedlab: speedActivity, choose: chooseActivity, parts: partsActivity,
  budget: budgetActivity, assemble: assembleActivity, write: writeActivity, links: linksActivity, frames: framesActivity, compare: compareActivity,
};

/**
 * Draw one activity.
 * env: { stepId, ctx: { answers }, readOnly, onChange(state), onTrack?(track) -> bool }
 */
export function renderActivity(spec, saved, env) {
  const draw = RENDER[spec.type];
  if (!draw) return h('p.warn', `Unknown activity: ${spec.type}`);
  return draw(spec, stateOf(spec, saved), env);
}

export { specSheet, budgetBar };
