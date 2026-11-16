// Sample data for trying the app on your own computer: a class imported from a pretend Google
// Classroom, with students at different points in the unit. It goes through the real server code.
import { LESSONS, stepsFor, checksFor } from '../js/curriculum/lessons.js';
import { solve } from '../js/activities/logic.js';

export const OWNER = 'teacher@school.test';

const person = (id, fullName, emailAddress) => ({ userId: id, profile: { name: { fullName }, emailAddress } });
const PEOPLE = [
  ['u1', 'Ava Lopez', 'ava@school.test'], ['u2', 'Ben Tran', 'ben@school.test'], ['u3', 'Cy Park', 'cy@school.test'],
  ['u4', 'Dee Fox', 'dee@school.test'], ['u5', 'Eli Rossi', 'eli@school.test'], ['u6', 'Fay Singh', 'fay@school.test'],
  ['u7', 'Gus Walker', 'gus@school.test'], ['u8', 'Hana Kim', 'hana@school.test'],
];

/** A pretend Google Classroom, so importing and sending grades can be tried locally. */
export const classroom = () => ({
  courses: [{ id: 'gc1', name: 'Digital Literacy 6', section: 'Block 2' }, { id: 'gc2', name: 'Digital Literacy 6', section: 'Block 5' }],
  rosters: { gc1: PEOPLE.map((p) => person(...p)), gc2: [person('u9', 'Ivy Chen', 'ivy@school.test'), person('u10', 'Jon Ruiz', 'jon@school.test')] },
  // Every assignment the app makes in Block 2 has a submission for each student.
  madeSubs: { gc1: PEOPLE.map(([id], i) => ({ id: `sub${i + 1}`, userId: id })) },
});

/** A student's answers for the first `upTo` steps of a lesson, done the way a student would. */
function answersFor(lesson, track, upTo) {
  const answers = {};
  if (lesson.tracks && track) answers.choose = { pick: track, text: '' };
  const done = stepsFor(lesson, track).slice(0, upTo);
  done.forEach((st) => { if (!answers[st.id]) answers[st.id] = solve(st.activity, { answers }); });
  // Check questions after the finished steps were answered, all but one on the first try.
  answers._checks = {};
  checksFor(lesson, track).forEach((c, i) => { if (done.some((st) => st.id === c.after)) answers._checks[`${c.after}-${i}`] = i !== 1; });
  return answers;
}

const AVATARS = {
  'ava@school.test': { skin: 2, hairColor: 0, hair: 'puffs', outfit: 1, hat: 'cap', held: 'none', pet: 'mouse', cape: 'none', aura: 'none', title: 'none' },
  'dee@school.test': { skin: 0, hairColor: 3, hair: 'long', outfit: 2, hat: 'hardhat', held: 'floppy', pet: 'none', cape: 'none', aura: 'spark', title: 'flipper' },
  'fay@school.test': { skin: 4, hairColor: 1, hair: 'short', outfit: 0, hat: 'cap', held: 'chip', pet: 'none', cape: 'none', aura: 'none', title: 'none' },
};

export function seed(server) {
  const teacher = server.as(OWNER);
  teacher('importCourses', ['gc1']);
  const cls = teacher('listClasses')[0];
  const ids = Object.fromEntries(teacher('listStudents', cls.id).map((s) => [s.email, s.id]));
  // email: [[lesson, how far, submit?, track]]
  const plan = {
    'ava@school.test': [['l1', 99, true], ['l2', 99, true], ['l3', 3]],
    'ben@school.test': [['l1', 99, true], ['l2', 2]],
    'cy@school.test': [['l1', 99, true], ['l2', 4]],
    'dee@school.test': [['l1', 99, true], ['l2', 99, true], ['l3', 99, true], ['l4', 99, true], ['l5', 5, false, 'design']],
    'eli@school.test': [['l1', 4]],
    'fay@school.test': [['l1', 99, true], ['l2', 99, true], ['l3', 99, true], ['l4', 99, true], ['l5', 6, false, 'history']],
    'hana@school.test': [['l1', 99, true], ['l2', 99, true], ['l3', 1]],
  };
  const works = {};
  for (const [email, list] of Object.entries(plan)) {
    const student = server.as(email);
    if (AVATARS[email]) student('updateProfile', { avatar: AVATARS[email] });
    for (const [lessonId, far, submit, track] of list) {
      const lesson = LESSONS.find((l) => l.id === lessonId);
      const steps = stepsFor(lesson, track);
      const upTo = Math.min(far, steps.length);
      const quizzes = checksFor(lesson, track);
      const patch = {
        answers: answersFor(lesson, track, upTo), track: track || '', step_at: upTo, done_count: upTo, done_total: steps.length,
        quiz_right: submit ? quizzes.length - 1 : 0, quiz_total: submit ? quizzes.length : 0, stretch_done: submit && email === 'ava@school.test' ? 2 : 0,
        reflection: submit ? 'A microwave has a computer inside. The buttons are input, it counts down the time, and the heat and beep are output.' : '',
      };
      works[`${email}:${lessonId}`] = student(submit ? 'submitWork' : 'saveWork', lessonId, patch);
    }
  }
  teacher('saveGrade', works['ava@school.test:l1'].id, { scores: { jobs: 4, hardsoft: 4, reflect: 3 }, feedback: 'Great sorting! Next time, add one more example in your reflection.', status: 'approved' });
  teacher('saveGrade', works['cy@school.test:l1'].id, { scores: { jobs: 3, hardsoft: 2, reflect: 1 }, feedback: 'Please add the input, processing, and output of your device to your reflection.', status: 'returned' });
  teacher('giveAward', ids['ava@school.test'], 'helper', 'Helped Ben find the RAM slots');
  teacher('giveAward', ids['dee@school.test'], 'curious', '');
  return cls;
}
