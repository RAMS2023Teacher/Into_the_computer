// Massachusetts Grades 6-8 Digital Literacy and Computer Science standards, quoted verbatim from the
// 2016 framework PDF (https://www.doe.mass.edu/frameworks/dlcs.pdf). Do not reword these: teachers
// cite this text. tests/curriculum.test.mjs checks each one against tests/fixtures/ma-dlcs-6-8.txt.
export const STANDARDS = [
  { code: '6-8.CS.a.1', strand: 'Computing Systems', topic: 'Computing Devices', text: 'Describe the main functions of an operating system.' },
  { code: '6-8.CS.a.2', strand: 'Computing Systems', topic: 'Computing Devices', text: 'Recognize that there is a wide range of application software.' },
  { code: '6-8.CS.a.3', strand: 'Computing Systems', topic: 'Computing Devices', text: 'Identify and describe the function of the main internal parts of a basic computing device [e.g., motherboard, hard drive, Central Processing Unit (CPU)].' },
  { code: '6-8.CS.a.4', strand: 'Computing Systems', topic: 'Computing Devices', text: 'Identify and describe the use of sensors, actuators, and control systems in an embedded system (e.g., a robot, an e-textile, installation art, smart room).' },
  { code: '6-8.CS.a.5', strand: 'Computing Systems', topic: 'Computing Devices', text: 'Individually and collaboratively design and demonstrate the use of a device (e.g., robot, e-textile) to accomplish a task.' },
  { code: '6-8.CS.a.7', strand: 'Computing Systems', topic: 'Computing Devices', text: 'Identify steps involved in diagnosing and solving routine hardware and software problems (e.g., power, connections, application window or toolbar, cables, ports, network resources, video, sound) that occur during everyday computer use.' },
  { code: '6-8.CT.a.3', strand: 'Computational Thinking', topic: 'Abstraction', text: 'Use decomposition to define and apply a hierarchical classification scheme to a complex system, such as the human body, animal classification, or in computing.' },
  { code: '6-8.CT.c.1', strand: 'Computational Thinking', topic: 'Data', text: 'Demonstrate that numbers can be represented in different base systems (e.g., binary, octal, and hexadecimal) and text can be represented in different ways [e.g., American Standard Code for Information Interchange (ASCII)].' },
  { code: '6-8.CT.c.2', strand: 'Computational Thinking', topic: 'Data', text: 'Describe how computers store, manipulate, and transfer data types and files (e.g., integers, real numbers, Boolean Operators) in a binary system.' },
  { code: '6-8.DTC.a.2', strand: 'Digital Tools and Collaboration', topic: 'Digital Tools', text: 'Identify the kinds of content associated with different file types and why different file types exist (e.g., formats for word processing, images, music, three-dimensional drawings.).' },
  { code: '6-8.DTC.c.2', strand: 'Digital Tools and Collaboration', topic: 'Research', text: 'Evaluate quality of digital sources for reliability, including currency, relevancy, authority, accuracy, and purpose of digital information.' },
  { code: '6-8.DTC.c.3', strand: 'Digital Tools and Collaboration', topic: 'Research', text: 'Gather, organize, and analyze information from digital sources by quoting, paraphrasing, and/or summarizing.' },
  { code: '6-8.DTC.c.5', strand: 'Digital Tools and Collaboration', topic: 'Research', text: 'Use digital citation tools to cite sources using a school- or district-adopted format [e.g., Modern Language Association (MLA)], including proper citation for all text and non-text sources (e.g., images, audio, video).' },
];

export const standardByCode = (code) => STANDARDS.find((s) => s.code === code);
export const shortCode = (code) => code.replace('6-8.', '');
