export type CertCategory = "Cloud" | "AI" | "Data" | "Networking";

export interface CertificateEntry {
  id: string;
  title: string;
  issuer: string;
  /** ISO date (YYYY-MM-DD) or null when unknown. */
  date: string | null;
  dateLabel: string;
  /** Public URL of the original file, or null when locked (file not provided yet). */
  file: string | null;
  thumb: string | null;
  texture: string | null;
  /** 1600px rendering of the first page for the lightbox. */
  preview: string | null;
  kind: "pdf" | "image" | null;
  type: "certificate" | "internship";
  category: CertCategory;
  locked: boolean;
  /** Aspect ratio (w/h) of the rendered first page. */
  aspect: number;
}
