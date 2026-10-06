/**
 * Siri-style assistant orb in the Sunset Shores palette: three soft light blobs (pink, orange, teal,
 * plus a violet core) swirl inside a dark glass sphere, with a glossy highlight and a slow rim sweep.
 * Pure CSS (styles in app/globals.css → `.siri-orb`), so it costs nothing on the low tier.
 * `active` speeds the swirl up (panel open / assistant thinking).
 */
export function SiriOrb({ active = false, className = "" }: { active?: boolean; className?: string }) {
  return (
    <span aria-hidden className={`siri-orb ${className}`} data-active={active ? "" : undefined}>
      <span className="siri-rim" />
      <span className="siri-core">
        <span className="siri-blob siri-blob-1" />
        <span className="siri-blob siri-blob-2" />
        <span className="siri-blob siri-blob-3" />
        <span className="siri-blob siri-blob-4" />
        <span className="siri-gloss" />
      </span>
    </span>
  );
}
