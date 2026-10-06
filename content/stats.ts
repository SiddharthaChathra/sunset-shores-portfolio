import certificatesJson from "./generated/certificates.json";
import type { CertificateEntry } from "./types";
import { experience } from "./experience";
import { projects } from "./projects";

export const certificates = certificatesJson as CertificateEntry[];
export const certificateList = certificates.filter((c) => c.type === "certificate");
export const internshipCertificates = certificates.filter((c) => c.type === "internship");

/** About stats, counted from the data (never hard-coded). */
export const aboutStats = [
  { label: "Internships", value: experience.length },
  { label: "Projects", value: projects.length },
  { label: "Certificates", value: certificateList.filter((c) => !c.locked).length },
];
