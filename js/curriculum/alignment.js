// Which MA DLCS standards each lesson addresses.
//   anchor:  the lesson produces work a teacher can assess against this standard.
//   support: students meet or practice the idea here, but this lesson alone isn't evidence of it.
//   evidence: what a teacher would actually look at.
// Lesson 5 has one entry per project track.
import { STANDARDS, standardByCode } from './standards.js';

export const ALIGNMENT = {
  l1: { anchor: ['6-8.CS.a.4'], support: ['6-8.CS.a.2', '6-8.CT.a.3'], evidence: 'Judges which household machines hide a computer and names the input, processing, and output of each; sorts devices by job and hardware from software.' },
  l2: { anchor: ['6-8.CS.a.3'], support: ['6-8.CS.a.7', '6-8.CT.a.3'], evidence: 'Labels the internal parts, places each in its slot, and explains two parts\' jobs; orders the steps for fixing a black screen.' },
  l3: { anchor: ['6-8.CS.a.3', '6-8.CS.a.1'], support: ['6-8.CT.c.2'], evidence: 'Traces a key press and a game launch through the parts, including the operating system\'s role; explains memory versus storage in the reflection.' },
  l4: { anchor: ['6-8.CT.c.1', '6-8.CT.c.2'], support: ['6-8.DTC.a.2'], evidence: 'Makes target numbers in binary, decodes an ASCII message, draws from bits, mixes RGB colors, and orders file types by size.' },
  'l5:design': { anchor: ['6-8.CS.a.3', '6-8.CS.a.5'], support: ['6-8.CS.a.4'], evidence: 'A complete design for a chosen purpose within budget, with an explanation of every part, a trade-off, and changes after partner feedback.' },
  'l5:history': { anchor: ['6-8.DTC.c.2', '6-8.DTC.c.3', '6-8.DTC.c.5'], support: ['6-8.CS.a.3'], evidence: 'A report with notes in the student\'s own words, a then-and-now comparison, and three sources checked for trust and cited in MLA.' },
};

/** For lesson 5 without a track, both tracks' standards. */
export function alignmentFor(lessonId, track) {
  if (ALIGNMENT[lessonId]) return ALIGNMENT[lessonId];
  if (track && ALIGNMENT[`${lessonId}:${track}`]) return ALIGNMENT[`${lessonId}:${track}`];
  const parts = Object.entries(ALIGNMENT).filter(([k]) => k.startsWith(`${lessonId}:`)).map(([, v]) => v);
  const uniq = (xs) => [...new Set(xs)];
  const anchor = uniq(parts.flatMap((p) => p.anchor));
  return { anchor, support: uniq(parts.flatMap((p) => p.support)).filter((c) => !anchor.includes(c)), evidence: parts.map((p) => p.evidence).join(' Or: ') };
}

/** For each standard, the lessons that anchor or support it. */
export function coverage() {
  return STANDARDS.map((s) => {
    const anchor = [];
    const support = [];
    for (const [id, a] of Object.entries(ALIGNMENT)) {
      if (a.anchor.includes(s.code)) anchor.push(id);
      if (a.support.includes(s.code)) support.push(id);
    }
    return { ...s, anchor, support };
  });
}

export { standardByCode };
