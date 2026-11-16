// Where things sit on the drawn pictures (a 400 by 300 drawing). The drawing code is in
// js/activities/pictures.js; these are only positions, so the tests can check them without a page.

// One pin per part inside the case. Labels and parts are dropped onto these pins.
export const CASE_SPOTS = [
  { id: 'board', label: 'Motherboard', x: 112, y: 40 },
  { id: 'cpu', label: 'CPU socket', x: 200, y: 95 },
  { id: 'ram', label: 'RAM slots', x: 268, y: 95 },
  { id: 'gpu', label: 'Graphics slot', x: 205, y: 183 },
  { id: 'storage', label: 'Storage slot', x: 165, y: 233 },
  { id: 'psu', label: 'Power supply bay', x: 95, y: 273 },
  { id: 'fan', label: 'Fan opening', x: 34, y: 62 },
];
