// The parts store for the "Design a computer" project: real parts at real prices, in US dollars,
// rounded. Prices were checked in November 2026, when a memory shortage had pushed RAM and graphics
// card prices far above normal. Parts marked `estimate` had no current price to check, so they use
// a typical recent price. The budget is set so the best of everything doesn't fit.
export const BUDGET = 3000;
export const PRICES_CHECKED = 'November 2026';

export const PURPOSES = [
  { id: 'gaming', emoji: '🎮', label: 'Gaming PC', text: 'Plays new games smoothly with lots of detail.' },
  { id: 'school', emoji: '🎒', label: 'School laptop', text: 'Light, long battery, ready for every class.' },
  { id: 'video', emoji: '🎬', label: 'Video studio', text: 'Edits long videos without waiting.' },
  { id: 'rover', emoji: '🚀', label: 'Mars rover brain', text: 'Drives itself, senses rocks, survives dust.' },
  { id: 'pets', emoji: '🐶', label: 'Smart pet feeder', text: 'Feeds a pet on time and sends photos.' },
  { id: 'own', emoji: '💡', label: 'My own idea', text: 'Something else. You describe it.' },
];

// Each category: pick one option, or several when `many` is set. `none` options cost nothing.
export const CATEGORIES = [
  { id: 'cpu', label: 'Processor (CPU)', emoji: '🧠', model: 'cpu', slot: 'cpu', options: [
    { id: 'i3-14100', label: 'Intel Core i3-14100', price: 120, spec: '4 cores, up to 4.7 GHz', note: 'Fine for web pages and documents. Needs an Intel motherboard.', estimate: true },
    { id: 'r5-9600x', label: 'AMD Ryzen 5 9600X', price: 185, spec: '6 cores, up to 5.4 GHz', note: 'Good for games and most apps.' },
    { id: 'r7-9800x3d', label: 'AMD Ryzen 7 9800X3D', price: 430, spec: '8 cores, up to 5.2 GHz, extra game memory', note: 'One of the fastest CPUs for games.' },
    { id: 'r9-9950x', label: 'AMD Ryzen 9 9950X', price: 550, spec: '16 cores, up to 5.7 GHz', note: 'For huge jobs like video editing.' },
  ] },
  { id: 'ram', label: 'Memory (RAM)', emoji: '📋', model: 'ram', slot: 'ram', options: [
    { id: 'ram-8', label: '8 GB DDR5 RAM', price: 150, spec: '8 GB', note: 'Enough for a few apps at once.', estimate: true },
    { id: 'ram-16', label: '16 GB DDR5 RAM', price: 280, spec: '16 GB (2 sticks of 8 GB)', note: 'Good for games and many tabs.' },
    { id: 'ram-32', label: '32 GB DDR5 RAM', price: 460, spec: '32 GB (2 sticks of 16 GB)', note: 'For video editing and big projects.' },
    { id: 'ram-64', label: '64 GB DDR5 RAM', price: 1000, spec: '64 GB (2 sticks of 32 GB)', note: 'More than almost anyone needs.' },
  ] },
  { id: 'storage', label: 'Storage', emoji: '🗄️', model: 'ssd', slot: 'storage', options: [
    { id: 'hdd-2', label: 'Seagate BarraCuda 2 TB hard drive', price: 70, spec: '2 TB, spinning disk', note: 'Cheap and roomy, but slow to load things.' },
    { id: 'ssd-1', label: 'ADATA Legend 710 1 TB SSD', price: 150, spec: '1 TB, no moving parts', note: 'Fast, and survives bumps.' },
    { id: 'ssd-2', label: 'ADATA Legend 710 2 TB SSD', price: 250, spec: '2 TB, no moving parts', note: 'Fast, with room for big games.' },
    { id: 'ssd-4', label: 'WD Black SN850X 4 TB SSD', price: 785, spec: '4 TB, extra fast', note: 'Room for hours of video.' },
  ] },
  { id: 'graphics', label: 'Graphics', emoji: '🎨', model: 'gpu', slot: 'graphics', options: [
    { id: 'gpu-none', label: 'Built into the CPU', price: 0, spec: 'Uses the CPU', note: 'Fine for video and simple games.' },
    { id: 'rtx-5060', label: 'NVIDIA GeForce RTX 5060', price: 460, spec: '8 GB of graphics memory', note: 'Smooth games at good detail.' },
    { id: 'rtx-5070', label: 'NVIDIA GeForce RTX 5070', price: 900, spec: '12 GB of graphics memory', note: 'Great detail in new games.' },
    { id: 'rtx-5080', label: 'NVIDIA GeForce RTX 5080', price: 2250, spec: '16 GB of graphics memory', note: 'Top pictures. Needs an 850 W power supply.' },
  ] },
  { id: 'board', label: 'Motherboard', emoji: '🟩', model: 'motherboard', slot: 'board', options: [
    { id: 'b760m', label: 'ASUS Prime B760M-A (Intel)', price: 130, spec: 'Standard size, for Intel CPUs', note: 'The board an Intel CPU needs.', estimate: true },
    { id: 'b650', label: 'MSI B650 Gaming Plus WiFi (AMD)', price: 160, spec: 'Standard size, Wi-Fi built in', note: 'Has the slots most AMD computers need.', estimate: true },
    { id: 'b650i', label: 'ASRock B650I Lightning WiFi (AMD)', price: 200, spec: 'Mini size, Wi-Fi built in', note: 'Small, for small cases. Few slots.', estimate: true },
    { id: 'x870e', label: 'ASUS ROG Strix X870E-E (AMD)', price: 450, spec: 'Extra slots and ports', note: 'Lots of room to upgrade.', estimate: true },
  ] },
  { id: 'power', label: 'Power', emoji: '🔌', model: 'psu', slot: 'power', options: [
    { id: 'battery', label: 'Laptop battery', price: 90, spec: 'About 10 hours', note: 'Goes anywhere. Too weak for a graphics card.', estimate: true },
    { id: 'rm650e', label: 'Corsair RM650e power supply', price: 90, spec: '650 W, plugs into the wall', note: 'Enough for most computers.', estimate: true },
    { id: 'rm850e', label: 'Corsair RM850e power supply', price: 125, spec: '850 W, plugs into the wall', note: 'Needed for the biggest graphics cards.', estimate: true },
    { id: 'solar', label: 'Solar panel and battery kit', price: 300, spec: 'Charges from sunlight', note: 'For places with no outlets.', estimate: true },
  ] },
  { id: 'case', label: 'Case and cooling', emoji: '📦', model: 'cooler', slot: 'case', options: [
    { id: 'case-laptop', label: 'Thin laptop body', price: 150, spec: 'Light, folds shut', note: 'Easy to carry. Needs a laptop battery.', estimate: true },
    { id: 'h5-flow', label: 'NZXT H5 Flow tower case', price: 95, spec: 'Tower, 2 fans', note: 'Stays cool. Sits on a desk.', estimate: true },
    { id: 'nr200p', label: 'Cooler Master NR200P mini case', price: 100, spec: 'Mini size', note: 'Small, but only fits a mini motherboard.', estimate: true },
    { id: 'case-rugged', label: 'Rugged sealed case', price: 150, spec: 'Dustproof and waterproof', note: 'Survives weather and bumps.', estimate: true },
  ] },
  { id: 'screen', label: 'Screen', emoji: '🖥️', slot: 'screen', options: [
    { id: 'screen-none', label: 'No screen', price: 0, spec: 'None', note: 'For computers nobody looks at.' },
    { id: 'pi-touch', label: 'Raspberry Pi Touch Display 2', price: 60, spec: '7 inch, touch', note: 'Input and output in one.', estimate: true },
    { id: 'screen-laptop', label: 'Laptop screen', price: 160, spec: '14 inch', note: 'Built into a laptop body.', estimate: true },
    { id: 'monitor-27', label: '27-inch monitor', price: 250, spec: '27 inch, sharp 1440p picture', note: 'Lots of room to see detail.', estimate: true },
  ] },
  { id: 'extras', label: 'Input, output, and sensors', emoji: '🎛️', many: true, slot: 'extras', options: [
    { id: 'keys', label: 'Logitech MK270 keyboard and mouse', price: 30, spec: 'Input', note: 'For typing and pointing.', estimate: true },
    { id: 'camera', label: 'Logitech C920 webcam', price: 60, spec: 'Input', note: 'Takes photos and video.', estimate: true },
    { id: 'mic', label: 'USB microphone', price: 30, spec: 'Input', note: 'Hears voices and sounds.', estimate: true },
    { id: 'speakers', label: 'Creative Pebble speakers', price: 30, spec: 'Output', note: 'Plays sound.', estimate: true },
    { id: 'sensors', label: 'Sensor kit', price: 40, spec: 'Input: heat, distance, light', note: 'Lets it sense the world.', estimate: true },
    { id: 'gps', label: 'GPS module', price: 30, spec: 'Input: location', note: 'Knows where it is.', estimate: true },
    { id: 'motors', label: 'Motors and wheels kit', price: 120, spec: 'Output: movement', note: 'Lets it move things.', estimate: true },
    { id: 'wifi', label: 'Wi-Fi and Bluetooth card', price: 25, spec: 'Input and output', note: 'Talks to other devices.', estimate: true },
  ] },
];

/** Rules a real build has to follow. Each returns a message when the build breaks it. */
const INTEL = ['i3-14100'];
const AMD_BOARDS = ['b650', 'b650i', 'x870e'];
export const RULES = [
  (p) => (p.graphics === 'rtx-5080' && p.power !== 'rm850e' ? 'An RTX 5080 needs the 850 W power supply.' : ''),
  (p) => (p.cpu && p.board && INTEL.includes(p.cpu) && p.board !== 'b760m' ? 'An Intel CPU needs the Intel motherboard.' : ''),
  (p) => (p.cpu && p.board && !INTEL.includes(p.cpu) && !AMD_BOARDS.includes(p.board) ? 'An AMD CPU needs an AMD motherboard.' : ''),
  (p) => (p.case === 'nr200p' && p.board && p.board !== 'b650i' ? 'The mini case only fits the mini motherboard.' : ''),
  (p) => (p.case === 'case-laptop' && p.power && p.power !== 'battery' ? 'A laptop body needs a laptop battery.' : ''),
  (p) => (p.power === 'battery' && p.graphics && p.graphics !== 'gpu-none' ? 'A laptop battery is too weak for a graphics card.' : ''),
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

// Computers from history students can learn about, each with websites checked in November 2026.
// Kiddle is a kid-safe encyclopedia; where it has no page of its own for a computer, the link is
// the Kiddle page that covers it. Wikipedia has more detail and harder reading.
const kiddle = (page, label) => ({ url: `https://kids.kiddle.co/${page}`, label: `Kiddle: ${label}`, kids: true });
const wiki = (page, label) => ({ url: `https://en.wikipedia.org/wiki/${page}`, label: `Wikipedia: ${label}` });
export const HISTORY = [
  { id: 'mark1', name: 'Harvard Mark I', year: 1944, emoji: '⚙️', links: [kiddle('Harvard_Mark_I', 'Harvard Mark I'), wiki('Harvard_Mark_I', 'Harvard Mark I')] },
  { id: 'colossus', name: 'Colossus', year: 1944, emoji: '🔐', links: [kiddle('Colossus_computer', 'Colossus computer'), wiki('Colossus_computer', 'Colossus computer')] },
  { id: 'eniac', name: 'ENIAC', year: 1945, emoji: '🏛️', links: [kiddle('ENIAC', 'ENIAC'), wiki('ENIAC', 'ENIAC')] },
  { id: 'agc', name: 'Apollo Guidance Computer', year: 1966, emoji: '🌕', model: 'agc', links: [kiddle('Apollo_program', 'the Apollo moon missions'), wiki('Apollo_Guidance_Computer', 'Apollo Guidance Computer')] },
  { id: 'altair', name: 'Altair 8800', year: 1975, emoji: '💡', links: [kiddle('Personal_computer', 'personal computers (look for the Altair)'), wiki('Altair_8800', 'Altair 8800')] },
  { id: 'apple2', name: 'Apple II', year: 1977, emoji: '🍎', model: 'apple2', links: [kiddle('Apple_Inc.', 'Apple (look for the Apple II)'), wiki('Apple_II', 'Apple II')] },
  { id: 'pet', name: 'Commodore PET', year: 1977, emoji: '🐾', model: 'pet', links: [kiddle('Personal_computer', 'personal computers (look for the PET)'), wiki('Commodore_PET', 'Commodore PET')] },
  { id: 'ibmpc', name: 'IBM Personal Computer', year: 1981, emoji: '💼', model: 'ibmpc', links: [kiddle('Personal_computer', 'personal computers (look for the IBM PC)'), wiki('IBM_Personal_Computer', 'IBM Personal Computer')] },
  { id: 'c64', name: 'Commodore 64', year: 1982, emoji: '🕹️', model: 'c64', links: [kiddle('Commodore_64', 'Commodore 64'), wiki('Commodore_64', 'Commodore 64')] },
  { id: 'mac', name: 'Apple Macintosh', year: 1984, emoji: '🖱️', model: 'mac', links: [kiddle('Macintosh', 'Macintosh'), wiki('Macintosh_128K', 'Macintosh 128K')] },
  { id: 'amiga', name: 'Amiga 500', year: 1987, emoji: '🎨', model: 'amiga', links: [kiddle('Amiga', 'Amiga (look for the Amiga 500)'), wiki('Amiga_500', 'Amiga 500')] },
  { id: 'gameboy', name: 'Nintendo Game Boy', year: 1989, emoji: '🎮', links: [kiddle('Game_Boy', 'Game Boy'), wiki('Game_Boy', 'Game Boy')] },
  { id: 'iphone', name: 'The first iPhone', year: 2007, emoji: '📱', links: [kiddle('IPhone_(1st_generation)', 'iPhone (1st generation)'), wiki('IPhone_(1st_generation)', 'iPhone (1st generation)')] },
];
export const historyById = (id) => HISTORY.find((c) => c.id === id) || null;

// The "now" column of the then-and-now table: a typical school Chromebook in 2026.
export const TODAY = {
  label: 'A school Chromebook today',
  rows: [
    { id: 'size', label: 'Size and weight', now: 'About 1 inch thick and 3 pounds' },
    { id: 'speed', label: 'Speed', now: 'Billions of steps every second' },
    { id: 'cost', label: 'Cost', now: 'About $300' },
    { id: 'jobs', label: 'What people use it for', now: 'Web, documents, video calls, games' },
  ],
};
