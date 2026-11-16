// The parts store for the "Design a computer" project. Prices are rounded, realistic 2026 prices in
// US dollars. The budget is set so the best of everything doesn't fit: students have to trade off.
export const BUDGET = 2500;

export const PURPOSES = [
  { id: 'gaming', emoji: '🎮', label: 'Gaming PC', text: 'Plays new games smoothly with lots of detail.', needs: ['graphics', 'speed'] },
  { id: 'school', emoji: '🎒', label: 'School laptop', text: 'Light, long battery, ready for every class.', needs: ['battery', 'light'] },
  { id: 'video', emoji: '🎬', label: 'Video studio', text: 'Edits long videos without waiting.', needs: ['speed', 'space'] },
  { id: 'rover', emoji: '🚀', label: 'Mars rover brain', text: 'Drives itself, senses rocks, survives dust.', needs: ['sensors', 'tough'] },
  { id: 'pets', emoji: '🐶', label: 'Smart pet feeder', text: 'Feeds a pet on time and sends photos.', needs: ['sensors', 'small'] },
  { id: 'own', emoji: '💡', label: 'My own idea', text: 'Something else. You describe it.', needs: [] },
];

export const NEEDS = [
  { id: 'speed', label: 'Fast thinking (CPU)' },
  { id: 'graphics', label: 'Great pictures (graphics)' },
  { id: 'space', label: 'Lots of room for files (storage)' },
  { id: 'battery', label: 'Runs on a battery' },
  { id: 'light', label: 'Light and easy to carry' },
  { id: 'small', label: 'Small' },
  { id: 'tough', label: 'Tough and weatherproof' },
  { id: 'sensors', label: 'Senses the world (sensors)' },
  { id: 'cheap', label: 'Low price' },
];

// Each category: pick one option, or several when `many` is set. `none` options cost nothing.
export const CATEGORIES = [
  { id: 'cpu', label: 'Processor (CPU)', emoji: '🧠', model: 'cpu', slot: 'cpu', options: [
    { id: 'cpu-basic', label: 'Basic CPU', price: 120, spec: '4 cores, 2.5 GHz', note: 'Fine for web pages and documents.' },
    { id: 'cpu-fast', label: 'Fast CPU', price: 300, spec: '8 cores, 4.0 GHz', note: 'Good for games and most apps.' },
    { id: 'cpu-super', label: 'Super CPU', price: 580, spec: '16 cores, 5.0 GHz', note: 'For huge jobs like video editing.' },
  ] },
  { id: 'ram', label: 'Memory (RAM)', emoji: '📋', model: 'ram', slot: 'ram', options: [
    { id: 'ram-8', label: '8 GB RAM', price: 30, spec: '8 GB', note: 'Enough for a few apps at once.' },
    { id: 'ram-16', label: '16 GB RAM', price: 55, spec: '16 GB', note: 'Good for games and many tabs.' },
    { id: 'ram-32', label: '32 GB RAM', price: 110, spec: '32 GB', note: 'For video editing and big projects.' },
    { id: 'ram-64', label: '64 GB RAM', price: 220, spec: '64 GB', note: 'More than almost anyone needs.' },
  ] },
  { id: 'storage', label: 'Storage', emoji: '🗄️', model: 'ssd', slot: 'storage', options: [
    { id: 'hdd-1', label: '1 TB hard drive', price: 50, spec: '1 TB, spinning disk', note: 'Cheap, but slow to load things.' },
    { id: 'ssd-1', label: '1 TB SSD', price: 90, spec: '1 TB, no moving parts', note: 'Fast, and survives bumps.' },
    { id: 'ssd-2', label: '2 TB fast SSD', price: 170, spec: '2 TB, extra fast', note: 'Fast with room for big games.' },
    { id: 'ssd-4', label: '4 TB fast SSD', price: 320, spec: '4 TB, extra fast', note: 'Room for hours of video.' },
  ] },
  { id: 'graphics', label: 'Graphics', emoji: '🎨', model: 'gpu', slot: 'graphics', options: [
    { id: 'gpu-none', label: 'Built into the CPU', price: 0, spec: 'Uses the CPU', note: 'Fine for video and simple games.' },
    { id: 'gpu-mid', label: 'Graphics card', price: 350, spec: 'Mid-range card', note: 'Smooth games at good detail.' },
    { id: 'gpu-top', label: 'Top graphics card', price: 1000, spec: 'Top-of-the-line card', note: 'The best pictures. Uses lots of power.' },
  ] },
  { id: 'board', label: 'Motherboard', emoji: '🟩', model: 'motherboard', slot: 'board', options: [
    { id: 'board-tiny', label: 'Tiny board', price: 60, spec: 'Card-sized', note: 'Small and low power. Few slots.' },
    { id: 'board-basic', label: 'Basic motherboard', price: 110, spec: 'Standard size', note: 'Has the slots most computers need.' },
    { id: 'board-pro', label: 'Pro motherboard', price: 280, spec: 'Extra slots and ports', note: 'More ports and room to upgrade.' },
  ] },
  { id: 'power', label: 'Power', emoji: '🔌', model: 'psu', slot: 'power', options: [
    { id: 'battery', label: 'Battery pack', price: 90, spec: 'About 10 hours', note: 'Goes anywhere. Not for top graphics.' },
    { id: 'psu-550', label: '550 W power supply', price: 70, spec: 'Plugs into the wall', note: 'Enough for most computers.' },
    { id: 'psu-850', label: '850 W power supply', price: 130, spec: 'Plugs into the wall', note: 'Needed for a top graphics card.' },
    { id: 'solar', label: 'Solar panel and battery', price: 260, spec: 'Charges from sunlight', note: 'For places with no outlets.' },
  ] },
  { id: 'case', label: 'Case and cooling', emoji: '📦', model: 'cooler', slot: 'case', options: [
    { id: 'case-laptop', label: 'Thin laptop body', price: 150, spec: 'Light, folds shut', note: 'Easy to carry. Small fans.' },
    { id: 'case-tower', label: 'Tower case with fans', price: 100, spec: 'Big box, 3 fans', note: 'Stays cool. Sits on a desk.' },
    { id: 'case-rugged', label: 'Rugged sealed box', price: 220, spec: 'Dustproof and waterproof', note: 'Survives weather and bumps.' },
    { id: 'case-mini', label: 'Mini box', price: 40, spec: 'Fits in your hand', note: 'Tiny, but little room for parts.' },
  ] },
  { id: 'screen', label: 'Screen', emoji: '🖥️', slot: 'screen', options: [
    { id: 'screen-none', label: 'No screen', price: 0, spec: 'None', note: 'For computers nobody looks at.' },
    { id: 'screen-small', label: 'Small touchscreen', price: 120, spec: '7 inch, touch', note: 'Input and output in one.' },
    { id: 'screen-laptop', label: 'Laptop screen', price: 160, spec: '14 inch', note: 'Built into a laptop body.' },
    { id: 'screen-big', label: 'Big monitor', price: 300, spec: '27 inch, very sharp', note: 'Lots of room to see detail.' },
  ] },
  { id: 'extras', label: 'Input, output, and sensors', emoji: '🎛️', many: true, slot: 'extras', options: [
    { id: 'keys', label: 'Keyboard and mouse', price: 60, spec: 'Input', note: 'For typing and pointing.' },
    { id: 'camera', label: 'Camera', price: 50, spec: 'Input', note: 'Takes photos and video.' },
    { id: 'mic', label: 'Microphone', price: 40, spec: 'Input', note: 'Hears voices and sounds.' },
    { id: 'speakers', label: 'Speakers', price: 40, spec: 'Output', note: 'Plays sound.' },
    { id: 'sensors', label: 'Sensor pack', price: 45, spec: 'Input: heat, distance, light', note: 'Lets it sense the world.' },
    { id: 'gps', label: 'GPS', price: 40, spec: 'Input: location', note: 'Knows where it is.' },
    { id: 'motors', label: 'Motors and wheels', price: 180, spec: 'Output: movement', note: 'Lets it move things.' },
    { id: 'wifi', label: 'Wi-Fi and Bluetooth', price: 25, spec: 'Input and output', note: 'Talks to other devices.' },
  ] },
];

/** Rules a real build has to follow. Each returns a message when the build breaks it. */
export const RULES = [
  (p) => (p.graphics === 'gpu-top' && p.power !== 'psu-850' ? 'A top graphics card needs the 850 W power supply.' : ''),
  (p) => (p.board === 'board-tiny' && ['gpu-mid', 'gpu-top'].includes(p.graphics) ? 'A tiny board has no slot for a graphics card.' : ''),
  (p) => (p.case === 'case-mini' && ['gpu-mid', 'gpu-top'].includes(p.graphics) ? 'A graphics card will not fit in a mini box.' : ''),
  (p) => (p.case === 'case-laptop' && p.power && p.power !== 'battery' ? 'A laptop body needs a battery pack.' : ''),
  (p) => (p.screen === 'screen-laptop' && p.case && p.case !== 'case-laptop' ? 'A laptop screen only fits a laptop body.' : ''),
];

export const optionById = (id) => CATEGORIES.flatMap((c) => c.options.map((o) => ({ ...o, category: c.id }))).find((o) => o.id === id);

/** picks: { cpu: 'cpu-fast', extras: ['keys', 'wifi'], ... } */
export function buildTotal(picks) {
  let total = 0;
  for (const c of CATEGORIES) {
    const chosen = c.many ? (Array.isArray(picks[c.id]) ? picks[c.id] : []) : (picks[c.id] ? [picks[c.id]] : []);
    for (const id of chosen) { const o = c.options.find((x) => x.id === id); if (o) total += o.price; }
  }
  return total;
}

export const buildProblems = (picks) => RULES.map((r) => r(picks || {})).filter(Boolean);
export const missingParts = (picks) => CATEGORIES.filter((c) => !c.many && !(picks || {})[c.id]).map((c) => c.label);

// Computers from history students can research. Years are when each first went into use or on sale.
export const HISTORY = [
  { id: 'mark1', name: 'Harvard Mark I', year: 1944, emoji: '⚙️' },
  { id: 'colossus', name: 'Colossus', year: 1944, emoji: '🔐' },
  { id: 'eniac', name: 'ENIAC', year: 1945, emoji: '🏛️' },
  { id: 'univac', name: 'UNIVAC I', year: 1951, emoji: '📼' },
  { id: 'agc', name: 'Apollo Guidance Computer', year: 1966, emoji: '🌕', model: 'agc' },
  { id: 'altair', name: 'Altair 8800', year: 1975, emoji: '💡' },
  { id: 'apple2', name: 'Apple II', year: 1977, emoji: '🍎', model: 'apple2' },
  { id: 'pet', name: 'Commodore PET', year: 1977, emoji: '🐾', model: 'pet' },
  { id: 'ibmpc', name: 'IBM Personal Computer', year: 1981, emoji: '💼', model: 'ibmpc' },
  { id: 'c64', name: 'Commodore 64', year: 1982, emoji: '🕹️', model: 'c64' },
  { id: 'mac', name: 'Apple Macintosh', year: 1984, emoji: '🖱️', model: 'mac' },
  { id: 'amiga', name: 'Amiga 500', year: 1987, emoji: '🎨', model: 'amiga' },
  { id: 'gameboy', name: 'Nintendo Game Boy', year: 1989, emoji: '🎮' },
  { id: 'iphone', name: 'The first iPhone', year: 2007, emoji: '📱' },
];

// The "now" column of the then-and-now table: a typical school Chromebook in 2026.
export const TODAY = {
  label: 'A school Chromebook today',
  rows: [
    { id: 'size', label: 'Size and weight', now: 'About 1 inch thick and 3 pounds' },
    { id: 'speed', label: 'Speed', now: 'Billions of steps every second' },
    { id: 'memory', label: 'Memory (RAM)', now: 'About 4 to 8 GB' },
    { id: 'storage', label: 'Storage', now: 'About 32 to 128 GB' },
    { id: 'input', label: 'Input and output', now: 'Keyboard, touchpad, camera, mic, screen, speakers' },
    { id: 'cost', label: 'Cost', now: 'About $300' },
    { id: 'jobs', label: 'What it was used for', now: 'Web, documents, video calls, games' },
  ],
};
