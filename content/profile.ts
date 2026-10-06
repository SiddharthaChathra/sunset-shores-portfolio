/** Owner profile. The résumé in /assets is the source of truth; keep this in sync. */

/** Owner toggle: set to true to show the phone number on the site. */
export const SHOW_PHONE = false;

export const profile = {
  name: "Siddhartha Chathra B S",
  shortName: "Siddhartha",
  monogram: "SC",
  /**
   * Framing for assets/profile.jpg (fractions of the photo's width/height). `face` is the centre of the
   * round avatar crop and `faceSize` its side (fraction of width); `coverTop` is where the 16:9 sunset
   * cover banner starts. Adjust if the photo is replaced.
   */
  photoFraming: { face: [0.535, 0.6] as [number, number], faceSize: 0.36, coverTop: 0.4 },
  tagline: "Engineering resilient networks, scalable cloud and automated pipelines.",
  subline: ["Networking", "Cloud", "DevOps", "Machine Learning"],
  role: "Information Science & Engineering student · Class of 2027",
  bio: [
    "Siddhartha is an Information Science & Engineering student at NMAM Institute of Technology who likes building systems that keep working when things go wrong: networks that explain their own failures, pipelines that recover after a crash, and models that are measured rather than assumed.",
    "Two internships at NoviTech R&D grounded him in machine learning and data analysis. His recent projects take that into networking and cloud: a network observability platform with 569 passing tests, and an autonomous job-discovery system that verifies every listing before it alerts him.",
  ],
  education: {
    degree: "B.Tech, Information Science & Engineering",
    school: "NMAM Institute of Technology (NMAMIT)",
    period: "Aug 2023 – May 2027 (expected)",
    cgpa: "8.26",
    graduation: "2027",
    coursework: [
      "Data Structures",
      "Web Development",
      "Machine Learning",
      "Computer Networks",
      "AWS Cloud",
    ],
  },
  sideQuest: {
    title: "Side quest: Ripple Factor Crew",
    text: "Core member of Ripple Factor Crew at NMAMIT. He has won multiple dance titles and represented his college at state and national-level competitions.",
  },
  links: {
    email: "chatrasiddharth@gmail.com",
    linkedin: "https://www.linkedin.com/in/siddhartha-chathra-b-s-8954b4325",
    github: "https://github.com/SiddharthaChathra",
    resume: "/assets/resume.pdf",
  },
  phone: SHOW_PHONE ? "+91 9113248533" : null,
  photo: "/assets/profile.jpg",
} as const;

/** Rotating loading-screen tips. Facts only, all sourced from the résumé and project data. */
export const loadingTips = [
  "Siddhartha has represented NMAMIT in dance at state and national level.",
  "NetSentinel ships with 569 passing tests and CI on every push.",
  "JobSentinel backfills anything it missed after a crash. It remembers its last good scan.",
  "He is a core member of Ripple Factor Crew at NMAMIT.",
  "CGPA 8.26 in Information Science & Engineering, graduating 2027.",
  "Two NoviTech internships: one in AI, one in data analysis.",
  "He completed Cisco's Networking Basics and Networking Devices courses in August 2026.",
  "Tip: press Ctrl / ⌘ + K anywhere to talk to Echo, the companion.",
];
