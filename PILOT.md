# First deployment checklist

Into the Computer has been tested against a model of Apps Script, not the real thing. This list covers what only a real deployment can show, in the order to try it. Set it up using the [README](README.md#putting-it-on-apps-script) first.

## 1. On your own, before any students (about 30 minutes)

Use your school account on a school Chromebook, the same kind students use.

- [ ] Open the web app link. You should see **Your classes**, not a blank page or an error.
- [ ] Press **Import from Google Classroom**. If it asks for permissions or says the Classroom API is off, your Workspace admin may need to allow it.
- [ ] Import a test course, or make a class by hand and add a second school account you can sign in with (or a colleague who agrees to help).
- [ ] Open **Lessons** and try lesson 2 as a preview. Drag a card, and also tap a card and then tap where it goes.
- [ ] On **3D models**, press **Preview** on a few. If a model never appears, ask IT to allow `sketchfab.com`, `static.sketchfab.com`, and `media.sketchfab.com`. Lessons work without them.
- [ ] Press a read-aloud 🔊 button and check you hear it.
- [ ] As the test student, do lesson 1 and submit it. Close the tab halfway through once, reopen the link, and check that it picks up at the same step.
- [ ] As the teacher, review it: score the rubric, write feedback, and approve. Check that the student sees the score and feedback on their home page, and that a classmate's **My class** page shows no score.
- [ ] On the class's **Google Classroom** tab, create the five assignments as **drafts** in a test course. Post one in Classroom, then press **Send grades** and check the grade appears in the Classroom gradebook. Press **Return** there.
- [ ] Press **Project this class** and check it fills a projector screen.
- [ ] Try lesson 5's history project as the test student. Check that the Kiddle and Wikipedia links open on a student Chromebook; school filters sometimes block one of them.

## 2. A small group (one class period, 3 to 5 students)

- [ ] Have 3 to 5 students work through lesson 1 at the same time.
- [ ] Watch for "Couldn't save" or "The class is saving a lot right now" messages, and note how often they appear.
- [ ] Ask whether anything was confusing on screen, and which step took longest.
- [ ] Afterwards, open the Apps Script editor and choose **Executions** on the left. Each row is one request. Note how long a typical `api` call takes.
- [ ] Search the Executions log for `LOCK_SLOW` or `LOCK_TIMEOUT`. If they appear, saves are waiting in line behind each other.

## 3. A full class

- [ ] Run one full period with everyone signed in.
- [ ] Check **Executions** again for errors, `LOCK_SLOW`, and `LOCK_TIMEOUT`.
- [ ] If two classes run at the same time, everyone shares your account's limits. Try that only after a single class runs cleanly.

## What to report back

If something goes wrong, these details make it fixable:

- What you or the student saw, word for word, and which lesson and step.
- How many students were signed in at the time.
- From **Executions**: any failed rows (open one to see the error), how long a typical `api` call took, and how many `LOCK_SLOW` or `LOCK_TIMEOUT` lines appeared.
- Whether it was on a Chromebook, and in which browser.

The setting most likely to need tuning is how often students save while they work (`saveEvery` in `js/data/store.js`, 30 seconds now). They also save when they leave a lesson or submit.
