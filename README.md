# Into the Computer

A five-lesson unit for sixth grade that goes from "what is a computer?" down to bits and binary, and ends with a final project. Students work with their hands the whole way: they sort, label, build a computer case, follow a signal through the machine, flip switches to count in binary, decode a secret message, and draw with 1s and 0s. There is no code editor.

It is a sibling of Pixel Trail, with the same structure and feel. It runs on Google Apps Script, with all its data in a Google Sheet you own, and students sign in with their school Google accounts.

## The unit

| Lesson | Time | Big question | What students do |
| --- | --- | --- | --- |
| 1. What is a computer? | 35 min | What makes something a computer, and not just a machine? | Guess and sort, learn the four jobs, sort devices by job and hardware from software, find hidden computers in a house, sort again |
| 2. Inside the computer | 35 min | Why is a computer built from separate parts instead of one big part? | Open a case, meet seven parts (with 3D models), label them, build a computer in an empty case, match cables to ports, fix a black screen |
| 3. How the parts work together | 35 min | Why does a computer need both memory and storage, when both hold information? | Follow a key press, put "opening a game" in order, match parts to jobs in a kitchen, the power-off test, a speed lab |
| 4. Bits and bytes | 40 min | Why do computers only need two states to store anything? | Flip switches, count in binary, make a byte, decode a secret message, draw from bits, mix colors from numbers, order files by size |
| 5. Final project | 3 class periods | Why do computers come in so many shapes and sizes? | **Design a computer** for a purpose on a $2,500 budget and explain every part, or **write a history report** in Google Docs, Slides, Canva, or a video, with 3 sources in MLA |

Each lesson is a walkthrough: one step on screen at a time, with one short instruction (26 words at most), the explanation folded under **Why?**, and a read-aloud button. Short check questions sit between steps and must be answered to move on; you see whether each was right on the first try. Each lesson ends with the big question, a short reflection, and optional stretch goals, then the student submits and keeps going. They never wait for you to approve.

The app remembers the step each student reached, so they pick up where they left off. Lesson 5 shows a "Day 1, Day 2, Day 3" marker on its steps.

## Putting it on Apps Script

**Use your school Google account for all of this.** The app relies on Google telling it who is signed in, and that only works for people in your school's Google domain.

The files you need are in the [`dist`](dist/) folder. There are five.

1. Create a new Google Sheet. Name it something like **Into the Computer Data**. This Sheet will hold all the data.
2. In the Sheet, choose **Extensions → Apps Script**. A new tab opens with the Apps Script editor.
3. In the editor, click **Code.gs** on the left. Delete everything in it, then paste in everything from [`dist/Code.gs`](dist/Code.gs).
4. Click the **+** next to **Files**, choose **HTML**, and name it `Index` (no ".html"; the editor adds it). Paste in everything from [`dist/Index.html`](dist/Index.html).
5. Do the same for `Styles` (from [`dist/Styles.html`](dist/Styles.html)) and `App` (from [`dist/App.html`](dist/App.html)). App.html is one very long line; that's expected.
6. Click the gear (**Project Settings**) on the left and tick **Show "appsscript.json" manifest file in editor**. Go back to the editor, click **appsscript.json**, and replace everything in it with [`dist/appsscript.json`](dist/appsscript.json). If you aren't on Eastern time, change `America/New_York`.
7. Click **Save** (the disk icon).
8. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**. Set **Execute as: Me** and **Who has access: Anyone within** your school. Click **Deploy**.
9. Google asks you to approve permissions: the Sheet, your email address, and Google Classroom. Approve them. If you see "Google hasn't verified this app," choose **Advanced**, then go to the project. This is your own script.
10. Copy the **Web app** link. That link is the app. Give it to students.

You're the teacher automatically because you deployed it. Open the link and you'll see **Your classes**.

### Updating later

If you get new versions of the files, paste them in the same way, then use **Deploy → Manage deployments**, click the pencil, choose **Version: New version**, and **Deploy**. The link stays the same. Saving alone doesn't change what students see.

### Ask your IT team to allow these

Students' Chromebooks need to reach:

- `script.google.com` and `*.googleusercontent.com`: the app itself.
- `fonts.googleapis.com` and `fonts.gstatic.com`: fonts. If these are blocked, the app uses standard fonts.
- `sketchfab.com`, `static.sketchfab.com`, and `media.sketchfab.com`: the 3D models. If these are blocked, the "See it in 3D" box shows a note, and every lesson still works.

Your Workspace admin may also need to allow the Google Classroom API for Apps Script.

## Classes and Google Classroom

On **Your classes**, press **Import from Google Classroom**, tick your sections, and press **Import**. Each section becomes a class, with students shown as first name and last initial. Import again any time to add new students. It never removes anyone and never changes anything in Classroom. You can also make a class by hand and paste in a list of names and school emails.

On a class's **Google Classroom** tab:

- **Assignments.** Make the five assignments ahead of time. You can change each name, and set the points, an optional due date, and whether to post them now or save them as drafts. Google only lets an app send grades to assignments that app made, so make them here and not in Classroom. Each links back to the app.
- **Send grades.** One button sends every approved score that changed, scaled to the assignment's points. A rubric score of 9 out of 12 on a 100-point assignment sends 75.
- **Return.** Students see grades in Classroom only after you return the work there. The app can't return work for you.

Only the teacher who deployed the app can use Classroom from it, because it runs with your Google access. To add another teacher (without Classroom), type their email and name as a new row in the **Teachers** tab of the Sheet.

## Reviewing work

Submitted work appears under **Waiting for review** on the class's **Progress** tab. The review page shows each step with what the student did, whether each check question was right on the first try, the reflection, and the stretch goals they ticked. For the design project, it shows their parts list and total. For the history report, it shows their sources and a button to open their report.

Score the three-row rubric (1 to 4 each), write feedback, and **Approve** or **Send back for changes**. Scores and feedback are visible only to you and that student. Approved work is locked; **Reopen** unlocks it. Students keep moving either way.

The **Gradebook** tab shows every score, and **Export CSV** downloads it.

## The class display

Press **Project this class** for a page to put on the board. It shows:

- The lesson most of the class is on, as a row of steps, with each student's character at the step they've reached and anyone who submitted today at the finish.
- The big question of the day.
- A timer. Press **Set up today** to set the end time, what to work on, a different question, or the standards to show.
- Recent badges and ranks.
- The day's Massachusetts standards, word for word.

It never shows scores, feedback, or whether work was approved.

## XP, ranks, badges, and characters

Classmates can see each other's characters, ranks, and badges on the **My class** page. None of it ever comes from grades, or even from whether you approved the work.

| Earned for | XP |
| --- | --- |
| Submitting a lesson with every activity done | 50 (25 if some aren't done) |
| Each stretch goal (students tick them, up to 3 a lesson) | 10 |
| Each badge you give | 25 |

Ranks are sizes of data: **Bit, Nibble, Byte, Kilobyte, Megabyte, Gigabyte**. Finishing every lesson with every stretch goal reaches Megabyte; Gigabyte takes a badge or two from you as well.

Badges come from finishing lessons and stretch goals, and from you: **Helping Hand, Fix-It Pro, Great Question, Team Player,** and **Bright Idea**. Give one from the **Progress** tab.

Characters are pixel art. Skin colors are one set, all open to everyone. There are 12 unlocks: a few hats, a CPU chip and a floppy disk to hold, a circuit cape, a golden glow, a computer-mouse pet (from the Helping Hand badge), and three titles.

## Standards

Each lesson lists its Massachusetts Grades 6-8 Digital Literacy and Computer Science standards under its title, and the **Standards** page shows them all. The text is quoted from the 2016 framework PDF ([doe.mass.edu/frameworks/dlcs.pdf](https://www.doe.mass.edu/frameworks/dlcs.pdf)), and a test checks every standard against that document word for word.

| Code | Where | Text |
| --- | --- | --- |
| 6-8.CS.a.1 | Lesson 3 | Describe the main functions of an operating system. |
| 6-8.CS.a.2 | Lesson 1 | Recognize that there is a wide range of application software. |
| 6-8.CS.a.3 | Lessons 2, 3, 5 | Identify and describe the function of the main internal parts of a basic computing device [e.g., motherboard, hard drive, Central Processing Unit (CPU)]. |
| 6-8.CS.a.4 | Lessons 1, 5 | Identify and describe the use of sensors, actuators, and control systems in an embedded system (e.g., a robot, an e-textile, installation art, smart room). |
| 6-8.CS.a.5 | Lesson 5 (design) | Individually and collaboratively design and demonstrate the use of a device (e.g., robot, e-textile) to accomplish a task. |
| 6-8.CS.a.7 | Lesson 2 | Identify steps involved in diagnosing and solving routine hardware and software problems (e.g., power, connections, application window or toolbar, cables, ports, network resources, video, sound) that occur during everyday computer use. |
| 6-8.CT.a.3 | Lessons 1, 2 | Use decomposition to define and apply a hierarchical classification scheme to a complex system, such as the human body, animal classification, or in computing. |
| 6-8.CT.c.1 | Lesson 4 | Demonstrate that numbers can be represented in different base systems (e.g., binary, octal, and hexadecimal) and text can be represented in different ways [e.g., American Standard Code for Information Interchange (ASCII)]. |
| 6-8.CT.c.2 | Lessons 3, 4 | Describe how computers store, manipulate, and transfer data types and files (e.g., integers, real numbers, Boolean Operators) in a binary system. |
| 6-8.DTC.a.2 | Lesson 4 | Identify the kinds of content associated with different file types and why different file types exist (e.g., formats for word processing, images, music, three-dimensional drawings.). |
| 6-8.DTC.c.2 | Lesson 5 (history) | Evaluate quality of digital sources for reliability, including currency, relevancy, authority, accuracy, and purpose of digital information. |
| 6-8.DTC.c.3 | Lesson 5 (history) | Gather, organize, and analyze information from digital sources by quoting, paraphrasing, and/or summarizing. |
| 6-8.DTC.c.5 | Lesson 5 (history) | Use digital citation tools to cite sources using a school- or district-adopted format [e.g., Modern Language Association (MLA)], including proper citation for all text and non-text sources (e.g., images, audio, video). |

## 3D models

Twenty models from Sketchfab illustrate parts and historic computers. Each is shared under the Creative Commons Attribution license (CC BY 4.0), which allows use with credit, and the credit shows under every model. A model loads only when a student presses **See it in 3D**, so lessons stay quick on Chromebooks. On the **3D models** page you can preview each one and switch any off for everyone.

## How it protects students

- Students sign in with their school Google account. Anyone not on a class list sees a "not on a class list" page and no data.
- Everything stays in your school's Google account. The only outside service is Sketchfab, and only when a student opens a 3D model.
- The server decides who may do what from Google's sign-in, never from anything the browser claims. Students can reach only their own work and what their class may see.
- Grades, feedback, reflections, answers, and report links are visible only to that student and you. Classmates see names, characters, ranks, badges, and which step someone is on. They never see emails.
- Report links must be on Google Docs, Drive, Sites, Canva, YouTube, WeVideo, or Screencastify. To allow another site, add it to `js/shared/links.js` and rebuild.
- **Keep the Sheet private.** It holds every student's work and grades. Students never need access to it.

## Running it on your computer

You need [Node.js](https://nodejs.org) installed. In this folder:

```bash
npm install
```

```bash
npm start
```

Then open http://localhost:8080 and pick who to be: the teacher, a student, or someone not on a list. It runs the real app and the real server code on a pretend Google Sheet with eight sample students at different points in the unit, and a pretend Google Classroom so you can try importing and sending grades. **Start over with the sample data** on that page resets it.

| Command | What it does |
| --- | --- |
| `npm start` | The app on your computer with sample data, at http://localhost:8080 |
| `npm test` | Checks the lessons, the server's access rules, and the packed files |
| `npm run build` | Remakes the `dist` files after a change |

## Changing lessons

Lessons are plain data in [`js/curriculum/lessons.js`](js/curriculum/lessons.js). Each step has a title, minutes, an instruction (`say`), an explanation (`why`), and an activity. Check questions are listed under `checks`, each naming the step it follows. After a change, run `npm test`: it checks that minutes add up, word limits hold, and every activity can be finished. Then run `npm run build` and paste the new files into Apps Script.

## Credits

All lesson text, drawings, and characters are original to this project. 3D models are by their Sketchfab creators, credited in the app and listed in [`js/curriculum/models.js`](js/curriculum/models.js). Built with [esbuild](https://esbuild.github.io) (MIT) for packing.
