import { Suspense } from "react";
import { ClientRoot } from "@/ui/ClientRoot";
import { Hero } from "@/ui/sections/Hero";
import { About } from "@/ui/sections/About";
import { Projects } from "@/ui/sections/Projects";
import { Experience } from "@/ui/sections/Experience";
import { Certificates } from "@/ui/sections/Certificates";
import { Skills } from "@/ui/sections/Skills";
import { Contact } from "@/ui/sections/Contact";

/**
 * Sections below the hero sit in their own Suspense boundaries: the server HTML is identical, but React
 * hydrates each boundary as a separate low-priority pass, so the hero paints before the rest hydrates.
 */
export default function Home() {
  return (
    <ClientRoot>
      <Hero />
      {[About, Projects, Experience, Certificates, Skills, Contact].map((Section, i) => (
        <Suspense key={i} fallback={null}>
          <Section />
        </Suspense>
      ))}
    </ClientRoot>
  );
}
