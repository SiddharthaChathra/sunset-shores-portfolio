/** Skills by category. Levels, never percentages. Owner should confirm levels (see PROGRESS.md). */

export type SkillLevel = "Proficient" | "Working knowledge" | "Learning";

export interface SkillCategory {
  id: string;
  name: string;
  summary: string;
  evidence: string;
  skills: { name: string; level: SkillLevel }[];
}

export const LEVEL_SCORE: Record<SkillLevel, number> = {
  Proficient: 3,
  "Working knowledge": 2,
  Learning: 1,
};

export const skillCategories: SkillCategory[] = [
  {
    id: "networking",
    name: "Networking",
    summary: "Protocols, addressing and troubleshooting from the wire up.",
    evidence: "NetSentinel · Cisco Networking Basics & Devices courses · Computer Networks coursework",
    skills: [
      { name: "TCP/IP & OSI model", level: "Proficient" },
      { name: "Subnetting & routing", level: "Proficient" },
      { name: "DNS, DHCP, ARP", level: "Proficient" },
      { name: "Network troubleshooting", level: "Proficient" },
      { name: "TCP/UDP, ICMP, sockets", level: "Working knowledge" },
      { name: "Cisco device basic configuration", level: "Working knowledge" },
    ],
  },
  {
    id: "cloud-devops",
    name: "Cloud & DevOps",
    summary: "Shipping and operating services on managed cloud.",
    evidence: "AWS Cloud Practitioner Essentials · AINNOVATION Azure challenge · Dockerised projects with CI",
    skills: [
      { name: "AWS fundamentals", level: "Working knowledge" },
      { name: "Microsoft Azure", level: "Working knowledge" },
      { name: "Git & GitHub", level: "Proficient" },
      { name: "Linux & Bash", level: "Working knowledge" },
      { name: "Docker", level: "Working knowledge" },
      { name: "CI pipelines", level: "Working knowledge" },
    ],
  },
  {
    id: "ml-data",
    name: "ML & Data",
    summary: "From raw data to evaluated models and clear dashboards.",
    evidence: "NoviTech AI and Data Analyst internships · Heart Disease Detection",
    skills: [
      { name: "Pandas & NumPy", level: "Proficient" },
      { name: "Scikit-learn", level: "Proficient" },
      { name: "Data cleaning & EDA", level: "Proficient" },
      { name: "Power BI & Matplotlib", level: "Working knowledge" },
      { name: "LLMs, RAG & prompt engineering", level: "Working knowledge" },
      { name: "TensorFlow, OpenCV, LSTM", level: "Learning" },
    ],
  },
  {
    id: "languages",
    name: "Languages",
    summary: "The languages he reaches for first.",
    evidence: "Internships, coursework and project code",
    skills: [
      { name: "Python", level: "Proficient" },
      { name: "SQL", level: "Working knowledge" },
      { name: "TypeScript / JavaScript", level: "Working knowledge" },
      { name: "C", level: "Working knowledge" },
    ],
  },
  {
    id: "web",
    name: "Web",
    summary: "Full-stack apps with typed APIs and real databases.",
    evidence: "JobSentinel · NetSentinel · Travora AI · Heart Disease Detection",
    skills: [
      { name: "Next.js & React", level: "Proficient" },
      { name: "REST APIs", level: "Proficient" },
      { name: "HTML & Tailwind CSS", level: "Proficient" },
      { name: "Node.js, Express & NestJS", level: "Working knowledge" },
      { name: "PostgreSQL, Supabase, MongoDB", level: "Working knowledge" },
    ],
  },
];

export function categoryScore(c: SkillCategory): number {
  const total = c.skills.reduce((s, k) => s + LEVEL_SCORE[k.level], 0);
  return total / (c.skills.length * 3);
}
