/** Featured projects: exactly these four, in this order. Never hard-code project text in components. */

export type ProjectEmblem = "radar" | "globe" | "heart" | "plane";
export type AccentKey = "accent" | "teal" | "coral";

export interface Project {
  id: string;
  index: string;
  title: string;
  oneLiner: string;
  /** What it does, in plain words. */
  description: string;
  /** The problem it solves. */
  problem: string;
  /** What makes it different from the obvious approach. */
  unique: string[];
  /** How it works / engineering detail. */
  highlights: string[];
  stack: string[];
  links: { repo?: string; live?: string };
  accentFromTheme: AccentKey;
  coverImage?: string;
  emblem: ProjectEmblem;
  date?: string;
}

export const projects: Project[] = [
  {
    id: "jobsentinel",
    index: "01",
    title: "JobSentinel AI",
    oneLiner: "Autonomous job discovery and verification for engineering freshers.",
    description:
      "Monitors permitted public job sources and company career pages, normalises every listing into one format and merges duplicates across sources. Each job passes a validation pipeline before it reaches him: only roles in India that match 2027-batch fresher eligibility move on, get scored against his résumé with an explanation, and arrive as a Telegram alert with a direct apply link.",
    problem:
      "Fresher openings are scattered across job boards and company career pages, repeated on several sites, often already closed, and sometimes outright scams that ask for a registration fee. Checking them all by hand every day is slow, and a good role is easy to miss.",
    unique: [
      "Verifies a job before telling you about it: real company, working apply link, still open, no scam signals",
      "Filters for one specific profile (India, 2027-batch fresher eligibility) and explains each résumé match score",
      "Never misses a window: after a crash it backfills everything since its last successful run",
      "AI is used only where meaning matters; URLs, dates, de-duplication and scheduling are plain deterministic code",
    ],
    highlights: [
      "Validation pipeline: real company, live apply link, still open, and scam signals such as registration fees",
      "Recovery scanning: tracks its last successful run and backfills anything missed after a crash",
      "Provider-independent AI: swappable Gemini, Claude or local-model adapters behind one interface",
      "Reliability first: deterministic code owns URLs, dates, dedup and scheduling; AI only where semantics matter",
    ],
    stack: [
      "Next.js",
      "NestJS",
      "TypeScript",
      "Supabase Postgres",
      "Tailwind",
      "shadcn/ui",
      "Zod",
      "Telegram Bot API",
    ],
    links: { repo: "https://github.com/SiddharthaChathra/jobsentinel-ai" },
    accentFromTheme: "accent",
    emblem: "radar",
  },
  {
    id: "netsentinel",
    index: "02",
    title: "NetSentinel",
    oneLiner: "Network observability and intelligent troubleshooting platform.",
    description:
      "A one-file agent for Windows or Linux (no Python needed) reports latency, packet loss, DNS, gateway and backup-protocol state every minute. The backend builds statistical baselines, detects anomalies, correlates the evidence into incidents and writes an engineer's report. Every figure shown is measured, never invented.",
    problem:
      "When a network or a backup job fails, finding the cause usually means running pings, DNS lookups and gateway checks by hand and lining up the results. Many dashboards show numbers without the evidence behind them, so you cannot tell a real problem from noise.",
    unique: [
      "Every figure is measured: baselines are withheld until there are enough samples, never filled with a plausible guess",
      "Each diagnosis states its confidence and the measurement behind it (rule-based correlation, not a black box)",
      "Backup Readiness maps NFS / SMB / iSCSI / replication checks to RPO, RTO and SLA to flag backup jobs likely to fail",
      "A grounded LLM layer (Ollama or Groq) summarises incidents and answers questions without inventing data",
    ],
    highlights: [
      "Statistical baselines (avg, median, P95, std-dev) with anomaly detection",
      "Incidents with an open → acknowledged → resolved lifecycle that auto-closes",
      "Backup-readiness scoring for NFS / SMB / iSCSI / replication against an SLA window",
      "569 passing tests with CI; reports exported as JSON, Markdown or PDF",
    ],
    stack: ["Python", "FastAPI", "Next.js 16", "TypeScript", "Supabase", "Docker"],
    links: {
      repo: "https://github.com/SiddharthaChathra/NetSentinal",
      live: "https://net-sentinal-bncz.vercel.app",
    },
    accentFromTheme: "teal",
    coverImage: "/projects/netsentinel-dashboard.webp",
    emblem: "globe",
    date: "August 2026",
  },
  {
    id: "heart-disease-detection",
    index: "03",
    title: "Heart Disease Detection",
    oneLiner: "Full-stack ML app that predicts heart-disease risk from clinical inputs.",
    description:
      "A Random Forest model trained on clinical features, served by a Flask ML service behind a Node/Express backend with authentication and MongoDB. A React (Vite) frontend walks the user through Welcome, Login, Input and Prediction pages, with animated result visualisations.",
    problem:
      "A trained model in a notebook is useless to someone who just wants an answer. This turns a heart-disease risk model into a web app anyone can use: sign in, enter routine clinical values, get a result they can read.",
    unique: [
      "Uses 11 routine clinical inputs: age, sex, chest-pain type, resting BP, cholesterol, fasting blood sugar, resting ECG, max heart rate, exercise angina, ST depression and ST slope",
      "Returns a confidence score and suggested next steps with every prediction, not just yes or no",
      "Inference reuses the exact encoders and scaler saved at training time, so live inputs are processed the same way the model learned",
      "Three independent services (React UI, Express + MongoDB auth API, Flask ML service) that can be scaled or replaced separately",
    ],
    highlights: [
      "Random Forest with 200 trees, plus preprocessing, label encoding and scaling",
      "Stratified 80/20 train-test split; encoders, scaler and model saved with joblib",
      "Flask ML service behind a Node/Express API with auth and MongoDB",
      "React + Vite UI with Framer Motion and Chart.js result charts",
    ],
    stack: ["Python", "scikit-learn", "Flask", "Node.js", "Express", "MongoDB", "React", "Chart.js"],
    links: { repo: "https://github.com/SiddharthaChathra/heartdeciesedetection" },
    accentFromTheme: "coral",
    emblem: "heart",
  },
  {
    id: "travora",
    index: "04",
    title: "Travora AI",
    oneLiner: "AI-powered travel social network and hotel discovery platform.",
    description:
      "Travellers share experiences and vlogs, discover destinations, plan trips with an AI travel assistant and browse real-time hotel data, all in one platform. Built in July 2026 with a NestJS API over Prisma and Supabase.",
    problem:
      "Planning a trip means jumping between social apps for inspiration, blogs for tips, a chatbot for an itinerary and several booking sites to compare hotel prices. None of them talk to each other.",
    unique: [
      "One place for the whole trip: travel community, stories and vlogs, an AI planning assistant and hotel discovery",
      "Compares hotel deals across platforms with real-time hotel data",
      "Personalised AI travel assistance inside the same app you share and discover in",
      "Find your travel tribe and discover hidden gems through other travellers' stories",
    ],
    highlights: [
      "Social layer for sharing travel experiences and vlogs",
      "AI travel assistant for planning trips",
      "Real-time hotel data and destination discovery",
      "NestJS + Prisma API on Supabase (Postgres + Auth), containerised with Docker",
    ],
    stack: ["Next.js", "TypeScript", "NestJS", "Prisma", "Supabase", "Tailwind CSS", "Docker"],
    links: { repo: "https://github.com/SiddharthaChathra/Travora" },
    accentFromTheme: "accent",
    emblem: "plane",
    date: "July 2026",
  },
];
