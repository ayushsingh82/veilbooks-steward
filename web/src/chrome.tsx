import type { ReactNode } from "react";

/** Shared layout for the Veilbooks apps. The same file lives in Desk, Steward and Rail; each app passes its own text. */
export type Kind = "desk" | "steward" | "rail";

/** An orange square with a white pixel mark. The mark differs per app; the part that blinks is the live bit. */
export function Logo({ kind, size = 28 }: { kind: Kind; size?: number }) {
  return (
    <svg className="vb-logo" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={`Veilbooks ${kind}`} shapeRendering="crispEdges">
      <rect width="32" height="32" fill="#ff5a00" />
      {kind === "desk" && (
        <>
          {/* a sealed page: lines of text with one hidden behind a bar */}
          <rect x="7" y="6" width="18" height="3" fill="#fff" />
          <rect x="7" y="12" width="18" height="3" fill="#fff" />
          <rect x="7" y="18" width="18" height="3" fill="#fff" opacity="0.35" />
          <rect className="blink" x="7" y="24" width="10" height="3" fill="#fff" />
        </>
      )}
      {kind === "steward" && (
        <>
          {/* a limit line with a bar that stays under it */}
          <rect x="5" y="9" width="22" height="2" fill="#fff" opacity="0.5" />
          <rect x="7" y="18" width="5" height="8" fill="#fff" />
          <rect x="14" y="14" width="5" height="12" fill="#fff" />
          <rect className="blink" x="21" y="12" width="5" height="14" fill="#fff" />
        </>
      )}
      {kind === "rail" && (
        <>
          {/* two rails with sleepers, one lit */}
          <rect x="6" y="7" width="3" height="19" fill="#fff" />
          <rect x="23" y="7" width="3" height="19" fill="#fff" />
          <rect x="9" y="10" width="14" height="2.5" fill="#fff" />
          <rect x="9" y="17" width="14" height="2.5" fill="#fff" />
          <rect className="blink" x="9" y="24" width="14" height="2.5" fill="#fff" />
        </>
      )}
    </svg>
  );
}

export interface NavItem {
  label: string;
  href?: string;
  /** For single-page apps with tabs. */
  onClick?: () => void;
  active?: boolean;
}

export function Navbar({ kind, name, items, cta }: { kind: Kind; name: string; items: NavItem[]; cta?: { label: string; onClick: () => void } }) {
  return (
    <header className="vb-nav">
      <div className="vb-wrap">
        <a className="vb-brand" href="#top">
          <Logo kind={kind} />
          <b>{name}</b>
        </a>
        <nav className="vb-tabs">
          {items.map((i) =>
            i.onClick ? (
              <button key={i.label} className={`tab${i.active ? " on" : ""}`} onClick={i.onClick}>{i.label}</button>
            ) : (
              <a key={i.label} href={i.href}>{i.label}</a>
            ),
          )}
          {cta && <button className="vb-cta" onClick={cta.onClick}>{cta.label}</button>}
        </nav>
      </div>
    </header>
  );
}

export function Hero({ kicker, title, accent, lead, chips, children }: { kicker: string; title: string; accent: string; lead: string; chips: { text: string; hot?: boolean }[]; children?: ReactNode }) {
  return (
    <div className="vb-hero" id="top">
      <p className="vb-kicker">{kicker}</p>
      <h1>{title} <em>{accent}</em></h1>
      <p className="lead">{lead}</p>
      {children}
      <div className="vb-chips">{chips.map((c) => <span key={c.text} className={`vb-chip${c.hot ? " hot" : ""}`}>{c.text}</span>)}</div>
    </div>
  );
}

export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <div className="vb-steps">
      {steps.map((s, i) => (
        <div className="vb-step" key={s.title}>
          <i>{String(i + 1).padStart(2, "0")}</i>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </div>
      ))}
    </div>
  );
}

const SUITE: [string, string][] = [
  ["Veilbooks Rail", "https://github.com/ayushsingh82/veilbooks-rail"],
  ["Veilbooks Desk", "https://github.com/ayushsingh82/veilbooks-desk"],
  ["Veilbooks Steward", "https://github.com/ayushsingh82/veilbooks-steward"],
  ["Veilbooks Core", "https://github.com/ayushsingh82/veilbooks-core"],
];

export function Footer({ kind, name, blurb, links }: { kind: Kind; name: string; blurb: string; links: { title: string; items: [string, string][] }[] }) {
  return (
    <footer className="vb-foot">
      <div className="vb-wrap">
        <div className="col">
          <a className="vb-brand" href="#top" style={{ padding: 0 }}><Logo kind={kind} /><b>{name}</b></a>
          <p>{blurb}</p>
          <div className="vb-pulse" aria-hidden><span /><span /><span /><span /><span /></div>
        </div>
        {links.map((c) => (
          <div className="col" key={c.title}>
            <h4>{c.title}</h4>
            {c.items.map(([label, href]) => <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{label}</a>)}
          </div>
        ))}
        <div className="col">
          <h4>The suite</h4>
          {SUITE.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}
        </div>
      </div>
      <div className="vb-wrap vb-legal">Testnet demo on QoreChain (qorechain-diana). All keys and funds are test-only. Apache-2.0.</div>
    </footer>
  );
}
