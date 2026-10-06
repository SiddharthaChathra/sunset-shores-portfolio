import type { ProjectEmblem } from "@/content/projects";

/** Line-art emblem used as a framed cover when no screenshot is available. */
export function EmblemArt({ emblem, color, title }: { emblem: ProjectEmblem; color: string; title: string }) {
  const ink = "#1C2733";
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" role="img" aria-label={`${title} emblem`}>
      <defs>
        <pattern id={`g-${emblem}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke={ink} strokeOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#g-${emblem})`} />
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {emblem === "radar" && (
          <g transform="translate(160 108)">
            <path d="M-56 30 A64 64 0 0 1 56 -30" stroke={color} strokeWidth="3" />
            <path d="M-36 18 A40 40 0 0 1 34 -20" />
            <path d="M-16 8 A18 18 0 0 1 14 -10" />
            <path d="M0 0 L46 -52" stroke={color} strokeWidth="2.4" />
            <circle r="4" fill={ink} />
            <path d="M-20 60 L0 0 L20 60 Z" />
            <path d="M-34 60 H34" strokeWidth="2.4" />
            <circle cx="40" cy="-60" r="3" fill={color} stroke="none" />
          </g>
        )}
        {emblem === "globe" && (
          <g transform="translate(160 100)">
            <circle r="62" />
            <ellipse rx="26" ry="62" />
            <ellipse rx="62" ry="22" />
            <path d="M-62 0 H62 M0 -62 V62" strokeOpacity="0.5" />
            {[
              [-40, -30],
              [30, -42],
              [48, 18],
              [-22, 40],
              [8, 4],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="1.5" />
            ))}
            <path d="M-40 -30 L8 4 L30 -42 M8 4 L48 18 M8 4 L-22 40" stroke={color} strokeWidth="1.4" />
          </g>
        )}
        {emblem === "heart" && (
          <g transform="translate(160 100)">
            <path
              d="M0 46 C-60 6 -58 -42 -24 -46 C-10 -48 -2 -38 0 -30 C2 -38 10 -48 24 -46 C58 -42 60 6 0 46 Z"
              fill={color}
              fillOpacity="0.16"
              stroke={color}
              strokeWidth="2.4"
            />
            <ellipse rx="96" ry="26" strokeOpacity="0.5" />
            <path d="M-120 2 H-44 L-34 -18 L-22 26 L-10 -30 L2 14 L10 2 H120" stroke={ink} strokeWidth="2" />
          </g>
        )}
        {emblem === "plane" && (
          <g transform="translate(160 104)">
            <circle r="40" />
            <ellipse rx="16" ry="40" strokeOpacity="0.6" />
            <ellipse rx="40" ry="14" strokeOpacity="0.6" />
            <ellipse rx="86" ry="34" strokeDasharray="4 6" stroke={color} />
            <g transform="translate(70 -26) rotate(-18)">
              <path d="M-18 0 L18 -8 L-6 10 Z" fill="white" stroke={ink} />
              <path d="M18 -8 L-2 4 L-6 10" stroke={color} />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
