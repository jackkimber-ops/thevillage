// Same marks as the website (apps/website/src/app/[locale]/ContactIcons.tsx): ways to reach the studio as icons.
// Drawn inline (no external images or scripts); each sits in a round button with its name underneath.

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ICONS = {
  Zalo: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path {...P} d="M12 3.5c-5 0-8.5 3.2-8.5 7.3 0 2.3 1.1 4.3 3 5.6L5.8 20l4-1.9c.7.1 1.4.2 2.2.2 5 0 8.5-3.2 8.5-7.4S17 3.5 12 3.5Z" />
      <text x="12" y="13.3" textAnchor="middle" fontSize="5.6" fontWeight="700" fill="currentColor" fontFamily="Arial, sans-serif">Zalo</text>
    </svg>
  ),
  WhatsApp: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path {...P} d="M4.2 19.8l1.1-3.9A8.3 8.3 0 1 1 8.4 19l-4.2.8Z" />
      <path {...P} d="M9.2 8.3c.3-.6.6-.6.9-.6h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.5c0 .4-.3.8-.7 1-1.2.6-2.9.2-4.6-1.2-1.7-1.4-2.8-3.3-2.7-4.7 0-.3.1-.6.2-.8Z" />
    </svg>
  ),
  Messenger: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path {...P} d="M12 3.5c-4.8 0-8.5 3.5-8.5 8 0 2.4 1 4.5 2.8 6v3l2.8-1.5c.9.3 1.9.4 2.9.4 4.8 0 8.5-3.5 8.5-8s-3.7-7.9-8.5-7.9Z" />
      <path {...P} d="m7.5 13.8 3-3.3 2.1 2 3.9-2.2-3 3.3-2.1-2-3.9 2.2Z" />
    </svg>
  ),
  Email: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect {...P} x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path {...P} d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </svg>
  ),
  Facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M13.4 20.5v-7h2.4l.4-2.8h-2.8V8.9c0-.8.2-1.4 1.4-1.4h1.5V5a19 19 0 0 0-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v2.1H8.1v2.8h2.4v7h2.9Z" />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect {...P} x="4" y="4" width="16" height="16" rx="4.5" />
      <circle {...P} cx="12" cy="12" r="3.7" />
      <circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" />
    </svg>
  ),
} as const;

export type IconName = keyof typeof ICONS;

/** A row of round icon buttons, each with its name underneath. */
export function IconLinks({ links, label }: { links: Array<{ name: IconName; href: string }>; label: string }) {
  return (
    <ul className="icon-links" aria-label={label}>
      {links.map((l) => (
        <li key={l.name}>
          <a href={l.href} target={l.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">
            <span className="icon-circle">{ICONS[l.name]}</span>
            <span className="icon-name">{l.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
