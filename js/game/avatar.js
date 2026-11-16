// Pixel-art characters assembled from layers. Everything is drawn from these text grids,
// so all the art is original and new items are just a few more lines of text.

// One palette of skin colors. Saved characters store a position in this list, so new colors go at
// the end; the character maker shows them sorted by shade (SKIN_ORDER), all as one set.
const SKINS = ['#ffdbb4', '#eab98c', '#c68c5b', '#8d5a36', '#5a3825', '#a5e887', '#b9b4f5'];
const lightness = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
export const SKIN_ORDER = SKINS.map((c, i) => i).sort((a, b) => lightness(SKINS[b]) - lightness(SKINS[a]));
const HAIRS = ['#2b2118', '#6a3f1d', '#d9a23a', '#c4482f', '#ece6dc', '#3f6fd8', '#e05aa7'];
const OUTFITS = [
  { id: 'teal', color: '#1f9e95' }, { id: 'red', color: '#d9483b' }, { id: 'blue', color: '#3567c9' }, { id: 'gold', color: '#dca52c' },
  { id: 'violet', color: '#8350c9', unlock: { xp: 50 } },
];

const BASE = [
  '................', '................', '................', '................',
  '.....SSSSSS.....', '....SSSSSSSS....', '....SSESSESS....', '....SSSSSSSS....',
  '.....SSSSSS.....', '....OOOOOOOO....', '...SOOOOOOOOS...', '...SOOOOOOOOS...',
  '....PPPPPPPP....', '....PPP..PPP....', '....PPP..PPP....', '....BBB..BBB....',
];

const HAIR = {
  none: { name: 'Bald', grid: {} },
  short: { name: 'Short', grid: { 3: '.....HHHHHH.....', 4: '....HHHHHHHH....', 5: '....H......H....' } },
  spiky: { name: 'Spiky', grid: { 2: '....H.H..H.H....', 3: '....HHHHHHHH....', 4: '....HHHHHHHH....', 5: '....H......H....' } },
  long: { name: 'Long', grid: { 3: '.....HHHHHH.....', 4: '....HHHHHHHH....', 5: '...HH......HH...', 6: '...H........H...', 7: '...H........H...', 8: '...HH......HH...' } },
  puffs: { name: 'Puffs', grid: { 2: '..HHH......HHH..', 3: '..HHHHHHHHHHHH..', 4: '..HHHHHHHHHHHH..', 5: '....H......H....' } },
};

// A small set of gear for a five-lesson unit. Each unlock comes from XP or a badge, never from grades.
const HATS = {
  none: { name: 'No hat', grid: {} },
  cap: { name: 'Ball cap', unlock: { xp: 50 }, colors: { A: '#3567c9', a: '#22468c' }, grid: { 2: '.....AAAAAA.....', 3: '....AAAAAAAA....', 4: '....AAAAAAAAaaa.' } },
  hardhat: { name: 'Hard hat', unlock: { badge: 'case-cracker' }, colors: { A: '#f4c430', a: '#c99a12' }, grid: { 2: '.....AAAAAA.....', 3: '....AAAaAAAA....', 4: '...aaaaaaaaaa...' } },
  crown: { name: 'Gold crown', unlock: { xp: 425 }, colors: { A: '#f4cf49', a: '#d9483b' }, grid: { 1: '....A..AA..A....', 2: '....AAAAAAAA....', 3: '....AaAAAAaA....' } },
};

const HELD = {
  none: { name: 'Empty hands', grid: {} },
  chip: { name: 'CPU chip', unlock: { xp: 125 }, colors: { A: '#2a2b38', a: '#d4dbe6' }, grid: { 6: '.............a.a', 7: '............aAAA', 8: '.............AAA', 9: '............aAAA', 10: '.............a.a' } },
  floppy: { name: 'Floppy disk', unlock: { badge: 'binary' }, colors: { A: '#3567c9', a: '#f6f1e3' }, grid: { 7: '............AAAA', 8: '............AaaA', 9: '............AaaA', 10: '............AAAA' } },
};

const PETS = {
  none: { name: 'No pet', grid: [] },
  mouse: { name: 'Computer mouse', unlock: { badge: 'helper' }, colors: { A: '#d4dbe6', a: '#2a2b38' }, grid: ['..a.....', '..a.....', '.AAAA...', '.AaAA...', '.AAAA...', '..AA....'] },
};

// A cape hangs behind the body, so it is drawn first.
const CAPES = {
  none: { name: 'No cape', grid: {} },
  circuit: { name: 'Circuit cape', unlock: { xp: 300 }, colors: { C: '#1f7a4b', c: '#6ff0b4' } },
};
const CAPE_GRID = { 9: '...CCCCCCCCCC...', 10: '..CCCCCCCCCCCC..', 11: '..CCcCCCCCcCCC..', 12: '..CCCCcCCCCCcC..', 13: '..CcCCCCCcCCCC..', 14: '...cCCcCCcCCc...' };

// An aura outlines the whole character in a glow, with a few sparkles.
const AURAS = {
  none: { name: 'No glow' },
  spark: { name: 'Golden glow', unlock: { xp: 200 }, color: '#ffd84a' },
};
const RAINBOW = ['#ff5e5e', '#ffb13d', '#ffe14d', '#6fe07a', '#55b8ff', '#a77bff'];
const SPARKLES = [[1, 3], [14, 1], [0, 11], [15, 9]];

/** Earned titles show under a student's name. Picked from this list, never typed. */
export const TITLES = {
  none: { name: 'No title' },
  flipper: { name: 'Bit Flipper', unlock: { badge: 'binary' } },
  designer: { name: 'Computer Designer', unlock: { badge: 'designer' } },
  historian: { name: 'Computer Historian', unlock: { badge: 'historian' } },
};
export const titleOf = (av) => (av && av.title && TITLES[av.title] && av.title !== 'none' ? TITLES[av.title].name : '');

// Rarity, from how hard an item is to earn. Shown with colors, and legendary items shimmer.
const EPIC_BADGES = new Set(['helper', 'fixer', 'curious', 'teamwork', 'creative', 'designer', 'historian']);
export const RARITY_NAMES = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
export function rarityOf(unlock) {
  if (!unlock) return 'common';
  if (unlock.badge) return EPIC_BADGES.has(unlock.badge) ? 'epic' : 'rare';
  return unlock.xp >= 400 ? 'legendary' : unlock.xp >= 200 ? 'epic' : 'rare';
}

export const SLOTS = {
  skin: { label: 'Skin', swatches: SKINS, order: SKIN_ORDER },
  hairColor: { label: 'Hair color', swatches: HAIRS },
  hair: { label: 'Hair', items: HAIR },
  outfit: { label: 'Outfit', swatches: OUTFITS.map((o) => o.color), locks: OUTFITS.map((o) => o.unlock), names: OUTFITS.map((o) => `${o.id[0].toUpperCase()}${o.id.slice(1)} outfit`) },
  hat: { label: 'Hat', items: HATS },
  held: { label: 'Holding', items: HELD },
  pet: { label: 'Pet', items: PETS },
  cape: { label: 'Cape', items: CAPES },
  aura: { label: 'Glow', items: AURAS },
  title: { label: 'Title', items: TITLES },
};

/** Every item that has to be earned, for the collection meter and the next-unlock list. */
export function unlockables() {
  const out = [];
  for (const [slot, def] of Object.entries(SLOTS)) {
    if (def.items) for (const [id, item] of Object.entries(def.items)) { if (item.unlock) out.push({ slot, id, name: item.name, unlock: item.unlock, key: `${slot}:${id}` }); }
    else if (def.locks) def.locks.forEach((lock, i) => { if (lock) out.push({ slot, id: i, name: def.names ? def.names[i] : `${def.label} color ${i + 1}`, unlock: lock, key: `${slot}:${i}` }); });
  }
  return out;
}
export const auraColor = (av) => { const a = AURAS[av && av.aura]; return a && a.color ? a.color : ''; };

export const defaultAvatar = (seed = '') => {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { skin: h % SKINS.length, hairColor: (h >> 3) % 5, hair: ['short', 'spiky', 'long', 'puffs'][(h >> 5) % 4], outfit: (h >> 7) % 4, hat: 'none', held: 'none', pet: 'none', cape: 'none', aura: 'none', title: 'none' };
};

/** Is an item open to this student? stats comes from statsFor(). */
export const isUnlocked = (unlock, stats) => {
  if (!unlock) return true;
  if (unlock.xp !== undefined) return stats.xp >= unlock.xp;
  if (unlock.badge) return stats.badges.includes(unlock.badge);
  return false;
};
export const unlockLabel = (unlock, badgeName) => (unlock.xp !== undefined ? `${unlock.xp} XP` : `${badgeName(unlock.badge)} badge`);

const cache = new Map();

/** Draw a character to a PNG data URL. 24 by 16 cells: 16 for the hero, 8 for the pet. */
export function avatarURL(av, scale = 6) {
  const a = { ...defaultAvatar(), ...(av || {}) };
  const key = JSON.stringify(a) + scale;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 24 * scale;
  c.height = 16 * scale;
  const g = c.getContext('2d');
  const filled = new Set();
  const put = (x, y, color) => { g.fillStyle = color; g.fillRect(x * scale, y * scale, scale, scale); if (x < 16) filled.add(`${x},${y}`); };
  const shade = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const d = (v) => Math.floor(v * 0.72).toString(16).padStart(2, '0');
    return `#${d(n >> 16)}${d((n >> 8) & 255)}${d(n & 255)}`;
  };
  const outfit = OUTFITS[a.outfit] ? OUTFITS[a.outfit].color : OUTFITS[0].color;
  const palette = { S: SKINS[a.skin] || SKINS[0], E: '#1b1b28', O: outfit, P: shade(outfit), B: '#2b2118', H: HAIRS[a.hairColor] || HAIRS[0] };
  const cape = CAPES[a.cape] || CAPES.none;
  if (cape.colors) for (const y of Object.keys(CAPE_GRID)) [...CAPE_GRID[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, cape.colors[ch]); });
  BASE.forEach((row, y) => [...row].forEach((ch, x) => { if (palette[ch]) put(x, y, palette[ch]); }));
  const overlay = (grid, colors) => {
    for (const y of Object.keys(grid)) [...grid[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, colors[ch] || palette[ch]); });
  };
  overlay((HAIR[a.hair] || HAIR.none).grid, palette);
  const hat = HATS[a.hat] || HATS.none;
  overlay(hat.grid, hat.colors || {});
  const held = HELD[a.held] || HELD.none;
  overlay(held.grid, held.colors || {});
  const aura = AURAS[a.aura] || AURAS.none;
  if (aura.color) {
    // Paint every empty cell that touches the character, then a few sparkles.
    const ring = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (filled.has(`${x},${y}`)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled.has(`${x + dx},${y + dy}`))) ring.push([x, y]);
    }
    g.globalAlpha = 0.8;
    ring.forEach(([x, y], i) => { g.fillStyle = aura.color === 'rainbow' ? RAINBOW[(x + y) % RAINBOW.length] : aura.color; g.fillRect(x * scale, y * scale, scale, scale); });
    g.globalAlpha = 1;
    SPARKLES.forEach(([x, y], i) => { if (!filled.has(`${x},${y}`)) { g.fillStyle = aura.color === 'rainbow' ? RAINBOW[i * 2 % RAINBOW.length] : '#ffffff'; g.fillRect(x * scale, y * scale, scale, scale); } });
  }
  const pet = PETS[a.pet] || PETS.none;
  pet.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') put(16 + x, 10 + y, pet.colors[ch]); }));
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
