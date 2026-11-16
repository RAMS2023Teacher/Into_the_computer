// Drawings for the activities, made from simple shapes so they need no image files and stay sharp
// at any size. Positions of the drop pins are in js/curriculum/pictures.js.
import { svg } from '../ui.js';

const PARTS = {
  board: (on) => svg('g', { class: `pic-part pic-board ${on ? 'on' : ''}` },
    svg('rect', { x: 62, y: 22, width: 268, height: 226, rx: 6 }),
    ...[0, 1, 2, 3, 4, 5].map((i) => svg('path', { d: `M${80 + i * 40},40 v190`, class: 'pic-trace' })),
    svg('path', { d: 'M70,150 h250', class: 'pic-trace' })),
  cpu: (on) => svg('g', { class: `pic-part pic-cpu ${on ? 'on' : ''}` },
    svg('rect', { x: 172, y: 67, width: 56, height: 56, rx: 3 }),
    svg('rect', { x: 184, y: 79, width: 32, height: 32, rx: 2, class: 'pic-die' })),
  ram: (on) => svg('g', { class: `pic-part pic-ram ${on ? 'on' : ''}` },
    svg('rect', { x: 252, y: 52, width: 12, height: 88, rx: 2 }), svg('rect', { x: 272, y: 52, width: 12, height: 88, rx: 2 }),
    ...[0, 1, 2, 3].map((i) => svg('rect', { x: 254, y: 58 + i * 20, width: 8, height: 12, class: 'pic-chip' })),
    ...[0, 1, 2, 3].map((i) => svg('rect', { x: 274, y: 58 + i * 20, width: 8, height: 12, class: 'pic-chip' }))),
  gpu: (on) => svg('g', { class: `pic-part pic-gpu ${on ? 'on' : ''}` },
    svg('rect', { x: 92, y: 166, width: 226, height: 36, rx: 4 }),
    svg('circle', { cx: 150, cy: 184, r: 13, class: 'pic-fan' }), svg('circle', { cx: 255, cy: 184, r: 13, class: 'pic-fan' })),
  storage: (on) => svg('g', { class: `pic-part pic-storage ${on ? 'on' : ''}` },
    svg('rect', { x: 118, y: 226, width: 94, height: 14, rx: 2 }), svg('rect', { x: 124, y: 229, width: 18, height: 8, class: 'pic-chip' }), svg('rect', { x: 148, y: 229, width: 18, height: 8, class: 'pic-chip' })),
  psu: (on) => svg('g', { class: `pic-part pic-psu ${on ? 'on' : ''}` },
    svg('rect', { x: 20, y: 255, width: 150, height: 36, rx: 3 }), ...[0, 1, 2, 3, 4].map((i) => svg('path', { d: `M${120 + i * 9},262 v22`, class: 'pic-vent' }))),
  fan: (on) => svg('g', { class: `pic-part pic-fanpart ${on ? 'on' : ''}` },
    svg('circle', { cx: 34, cy: 62, r: 22 }), svg('path', { d: 'M34,62 l0,-16 a16,16 0 0 1 12,6 z M34,62 l14,8 a16,16 0 0 1 -12,8 z M34,62 l-14,8 a16,16 0 0 1 2,-14 z', class: 'pic-blade' })),
};

/** Outlines of the empty slots, so the shape of each slot is a clue for where a part goes. */
const SLOTS = [
  svg('rect', { x: 62, y: 22, width: 268, height: 226, rx: 6, class: 'pic-slot board-slot' }),
  svg('rect', { x: 172, y: 67, width: 56, height: 56, class: 'pic-slot' }),
  svg('rect', { x: 252, y: 52, width: 12, height: 88, class: 'pic-slot' }), svg('rect', { x: 272, y: 52, width: 12, height: 88, class: 'pic-slot' }),
  svg('rect', { x: 92, y: 178, width: 226, height: 10, class: 'pic-slot' }),
  svg('rect', { x: 118, y: 228, width: 94, height: 10, class: 'pic-slot' }),
  svg('rect', { x: 20, y: 255, width: 150, height: 36, class: 'pic-slot' }),
  svg('circle', { cx: 34, cy: 62, r: 22, class: 'pic-slot' }),
];

const caseOutline = () => svg('rect', { x: 6, y: 6, width: 388, height: 290, rx: 10, class: 'pic-case' });

/**
 * The inside of a desktop case.
 *   mode 'inside': every part is there (for labeling).
 *   mode 'empty':  just the slots, with any parts in `placed` drawn in (for building).
 */
export function casePicture(mode, placed = new Set()) {
  const kids = [caseOutline()];
  if (mode === 'empty') {
    kids.push(...SLOTS.map((s) => s.cloneNode(true)));
    for (const id of ['board', 'psu', 'fan', 'storage', 'cpu', 'ram', 'gpu']) if (placed.has(id)) kids.push(PARTS[id](true));
  } else {
    for (const id of ['board', 'psu', 'fan', 'storage', 'cpu', 'ram', 'gpu']) kids.push(PARTS[id](true));
  }
  return svg('svg', { viewBox: '0 0 400 300', class: 'pic', role: 'img', 'aria-label': mode === 'empty' ? 'An empty computer case with slots' : 'The inside of a computer case' }, ...kids);
}

/** A faint machine behind the key press path. */
export function machinePicture() {
  return svg('svg', { viewBox: '0 0 400 300', class: 'pic pic-faint', 'aria-hidden': 'true' },
    svg('rect', { x: 150, y: 30, width: 230, height: 200, rx: 10, class: 'pic-case' }),
    svg('rect', { x: 165, y: 45, width: 200, height: 170, rx: 6, class: 'pic-board on' }));
}

const PORT_SHAPES = {
  usba: () => [svg('rect', { x: 8, y: 16, width: 44, height: 18, rx: 2 }), svg('rect', { x: 14, y: 20, width: 32, height: 6, class: 'pic-pin' })],
  usbc: () => [svg('rect', { x: 14, y: 19, width: 32, height: 12, rx: 6 }), svg('rect', { x: 20, y: 23, width: 20, height: 4, rx: 2, class: 'pic-pin' })],
  hdmi: () => [svg('path', { d: 'M6,16 h48 v10 l-6,8 h-36 l-6,-8 z' }), svg('rect', { x: 14, y: 21, width: 32, height: 4, class: 'pic-pin' })],
  audio: () => [svg('circle', { cx: 30, cy: 25, r: 12 }), svg('circle', { cx: 30, cy: 25, r: 5, class: 'pic-hole' })],
  net: () => [svg('path', { d: 'M12,12 h36 v28 h-10 v-6 h-16 v6 h-10 z' }), ...[0, 1, 2, 3, 4, 5].map((i) => svg('rect', { x: 17 + i * 5, y: 15, width: 2, height: 7, class: 'pic-pin' }))],
};
export function portIcon(id) {
  const shape = PORT_SHAPES[id];
  if (!shape) return null;
  return svg('svg', { viewBox: '0 0 60 50', class: 'port-icon', 'aria-hidden': 'true' }, svg('g', { class: 'port-shape' }, ...shape()));
}
