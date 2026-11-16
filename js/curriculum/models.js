// 3D models shown with "See it in 3D", in Sketchfab's own viewer, each with a credit line.
// Most are Creative Commons Attribution (CC BY 4.0). A model marked `embedOnly` has no Creative
// Commons license: it may be shown in Sketchfab's viewer, which Sketchfab allows for any model that
// can be embedded, but not downloaded or reused, so its credit has no license label.
// A model loads only when a student presses the button, so pages stay quick on Chromebooks.
// The teacher can switch any model off on the 3D models page (stored in the Settings tab).
export const MODELS = {
  desktop: { uid: 'd1d8282c9916438091f11aeb28787b66', name: 'Gaming Desktop PC', author: 'Yolala3d', shows: 'A whole desktop computer' },
  // Chosen by the teacher. It is detailed (about 575,000 faces), so it may load slowly on Chromebooks.
  components: { uid: 'bd6fb0ed93f3475b890a099fedecf351', name: 'Computer Parts ( Built PC )', author: 'DanielCardonaArt', shows: 'The parts of a built computer', embedOnly: true },
  motherboard: { uid: '3bc94057328243d4b341a55f59160f8a', name: 'MotherBoard + Components', author: 'DanielCardonaArt', shows: 'A motherboard with parts plugged in' },
  cpu: { uid: '26d2147e082648949b9c703c514e6901', name: 'Unmarked processor (CPU) + Socket', author: '0004707', shows: 'A CPU and the socket it sits in' },
  ram: { uid: 'ab2b1c25c31b44c1a757911734bdf942', name: 'Random Access Memory - RAM Stick - PC', author: 'empty_mirror', shows: 'A stick of RAM' },
  ssd: { uid: 'ad215e54c381456895e21db5062f8714', name: 'SSD Solid-State Drive', author: 'isnainul', shows: 'A solid-state drive' },
  hdd: { uid: 'e9244f56e0724dd097570e29bae4b7c6', name: 'WD Green 1TB Hard Disk HDD', author: 'MG990', shows: 'A hard disk drive' },
  gpu: { uid: 'e5c384afae914d548a591f722e1878fc', name: 'MSI RTX 3080 Graphics card', author: 'kaif.3d', shows: 'A graphics card' },
  psu: { uid: '69ccd1be3a77497cb2acc9e39e7c52b3', name: 'PSU Power Supply Unit', author: 'dhafintaufiqi21', shows: 'A power supply' },
  cooler: { uid: '23e225925e174a9f929d995cd9bd22e2', name: 'Noctua NH-D15 CPU cooler', author: 'SzaBa', shows: 'A CPU cooler with fans' },
  keyboard: { uid: '63aec0874c184b53becb74b792588e69', name: 'IBM Model M Keyboard', author: 'timblewee', shows: 'A classic keyboard' },
  pi: { uid: '2d308283fc0f4d27b81f17a2793c5c4d', name: 'Raspberry Pi 3', author: 'josaco', shows: 'A whole computer the size of a card' },
  thermostat: { uid: '189925fd070148ada70bde6317d87ed8', name: 'Google Nest Thermostat (3rd Gen)', author: 'PolyDavid', shows: 'A smart thermostat, a hidden computer' },
  agc: { uid: '17dd8ff638da4b18b607d2a6184f2a69', name: 'Project Colossus - Apollo Guidance Computer', author: 'BillyBobCornCob', shows: 'The Apollo Guidance Computer' },
  apple2: { uid: 'b5d316548d634f16a72dd503db0aa01b', name: 'Apple II Computer', author: 'dark_igorek', shows: 'The Apple II' },
  pet: { uid: '9513e7c2386346daa10eb80aafe335c5', name: 'Commodore PET 2001', author: 'denisstephane', shows: 'The Commodore PET' },
  ibmpc: { uid: '1b4a4e75e3d34842925e2735888a6298', name: 'IBM 5150', author: 'lazercar', shows: 'The IBM PC' },
  c64: { uid: '3da4b1bade284fdb94d34573e9ff7002', name: 'Commodore 64 || Computer', author: 'dark_igorek', shows: 'The Commodore 64' },
  mac: { uid: '896ea439b67b4606a23fb8b93be6af6d', name: 'Macintosh 128K', author: 'kreems', shows: 'The first Macintosh' },
  amiga: { uid: '9c21f636edd44371ac81ce1c3ff6c987', name: 'Commodore Amiga 500 || Computer', author: 'dark_igorek', shows: 'The Amiga 500' },
};

export const LICENSE = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };

/** The embed address, with Sketchfab's extra buttons and tracking turned down as far as it allows. */
export function embedUrl(key) {
  const m = MODELS[key];
  if (!m) return '';
  const opts = 'autostart=1&preload=1&dnt=1&ui_infos=0&ui_watermark_link=0&ui_help=0&ui_settings=0&ui_vr=0&ui_ar=0&ui_inspector=0&ui_annotations=0&ui_hint=2';
  return `https://sketchfab.com/models/${m.uid}/embed?${opts}`;
}
export const pageUrl = (key) => (MODELS[key] ? `https://sketchfab.com/3d-models/${MODELS[key].uid}` : '');
