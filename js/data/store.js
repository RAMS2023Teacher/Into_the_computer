// Talks to the server. Everything goes through its single api() function, which decides who may do
// what from the Google sign-in. On your own computer, `npm start` answers the same calls.

/** One trip to the server. */
function send(method, args) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.script) { reject(new Error('This page has to be opened from its Apps Script link.')); return; }
    window.google.script.run
      .withFailureHandler((e) => reject(new Error(e?.message || 'Could not reach the server. Check your connection.')))
      .withSuccessHandler((text) => {
        let res;
        try { res = JSON.parse(text); } catch (_) { reject(new Error('The server sent an answer the app could not read.')); return; }
        if (res.ok) resolve(res.data);
        else reject(new Error(res.error));
      })
      .api(method, JSON.stringify(args));
  });
}

// Every trip to Apps Script costs about a second, whatever it carries. So calls made at the same
// moment travel together as one batch, and recent answers to read-only calls are reused.
const MAX_BATCH = 12;
let queue = [];
function flush() {
  const jobs = queue;
  queue = [];
  for (let i = 0; i < jobs.length; i += MAX_BATCH) {
    const group = jobs.slice(i, i + MAX_BATCH);
    if (group.length === 1) {
      const [j] = group;
      send(j.method, j.args).then(j.resolve, j.reject);
      continue;
    }
    send('batch', [group.map((j) => [j.method, j.args])]).then(
      (results) => group.forEach((j, k) => (results[k].ok ? j.resolve(results[k].data) : j.reject(new Error(results[k].error)))),
      (e) => group.forEach((j) => j.reject(e)),
    );
  }
}
function call(method, ...args) {
  return new Promise((resolve, reject) => {
    if (!queue.length) setTimeout(flush, 0);
    queue.push({ method, args, resolve, reject });
  });
}

// Reads that are safe to reuse for a few seconds. Anything else might change data, so it clears them.
const READS = new Set(['session', 'listClasses', 'getClass', 'listStudents', 'classBoard', 'myWorks', 'classWork', 'getClassPlan', 'gradeSyncStatus', 'getWorkFull', 'listGoogleCourses']);
const FRESH_MS = 15000;
const cache = new Map();
let generation = 0;
function cachedCall(method, ...args) {
  if (!READS.has(method)) {
    generation++;
    cache.clear();
    return call(method, ...args).finally(() => { generation++; cache.clear(); });
  }
  const key = `${method} ${JSON.stringify(args)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
  const born = generation;
  const promise = call(method, ...args);
  cache.set(key, { at: Date.now(), promise });
  promise.then(
    () => { if (generation !== born) cache.delete(key); },
    () => cache.delete(key),
  );
  return promise;
}

export const METHODS = [
  // Teacher
  'listClasses', 'getClass', 'createClass', 'renameClass', 'deleteClass', 'listStudents', 'addStudents', 'renameStudent', 'removeStudent',
  'classBoard', 'classWork', 'getWorkFull', 'saveGrade', 'reopenWork', 'giveAward', 'removeAward', 'getClassPlan', 'saveClassPlan',
  'listGoogleCourses', 'importCourses', 'gradeSyncStatus', 'createAssignments', 'pushGrades', 'setModelsOff',
  // Student
  'myWorks', 'saveWork', 'submitWork', 'updateProfile',
];

export function createStore() {
  const store = {
    // A whole class shares one account's quota (about 30 requests at once), so students save at
    // most this often while they work, plus whenever they leave a lesson or submit.
    saveEvery: 30000,
    lastEmail: '',
    async session() {
      const s = await cachedCall('session');
      if (!s || !s.role) {
        store.lastEmail = s?.email || '';
        return null;
      }
      return s;
    },
    forget() { generation++; cache.clear(); },
  };
  for (const m of METHODS) store[m] = (...args) => cachedCall(m, ...args);
  return store;
}
