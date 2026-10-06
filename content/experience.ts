export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  /** Exact dates from the internship certificate. */
  certifiedDates: string;
  objectives: string[];
  tools: string[];
  /** Certificate file stem inside assets/internships (matched in generated certificates.json). */
  certificateId: string;
}

export const experience: Experience[] = [
  {
    id: "ai-intern",
    role: "AI Intern",
    company: "NoviTech R&D Pvt Ltd",
    period: "Feb 2025 – Mar 2025",
    certifiedDates: "03 Feb 2025 – 03 Mar 2025",
    objectives: [
      "Applied regression, classification and clustering to analyse datasets and build predictive models for real-world use cases.",
      "Handled preprocessing and feature engineering: missing values, normalisation, encoding and feature selection.",
      "Built and evaluated models in Python, Scikit-learn and Jupyter using accuracy, precision, recall and confusion matrices.",
    ],
    tools: ["Python", "Scikit-learn", "Jupyter"],
    certificateId: "ai-intern-novitech",
  },
  {
    id: "data-analyst-intern",
    role: "Data Analyst Intern",
    company: "NoviTech R&D Pvt Ltd",
    period: "Jun 2025 – Jul 2025",
    certifiedDates: "25 Jun 2025 – 25 Jul 2025",
    objectives: [
      "Cleaned and pre-processed data and ran exploratory analysis with Python, Pandas and NumPy to find trends and inconsistencies.",
      "Built interactive dashboards and visualisations in Power BI and Matplotlib to support data-driven decisions.",
      "Prepared analytical reports and improved data workflows with mentors and teammates.",
    ],
    tools: ["Pandas", "NumPy", "Excel", "Power BI", "Matplotlib"],
    certificateId: "data-analyst-intern-novitech",
  },
];
