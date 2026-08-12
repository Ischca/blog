import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import type { Locale, SiteContent } from "../content/site";
import { CosmosField } from "./CosmosField";
import type { CosmosStatus } from "./CosmosField";

type ExperienceProps = { content: SiteContent };
type ViewId = "home" | "work" | "career" | "products" | "contact";

const socialLinks = [
  { label: "GitHub", href: "https://github.com/Ischca" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shota-watanabe-16547a20b/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/shotawatanabe" },
  { label: "X", href: "https://twitter.com/ischca_dev" },
];

function Identity({ suffix }: { suffix?: string }) {
  return (
    <div className="experience-identity">
      <span aria-hidden="true" />
      <strong>Ischca</strong>
      {suffix && <small>{suffix}</small>}
    </div>
  );
}

function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={className} aria-label="Social links">
      {socialLinks.map((link) => (
        <a href={link.href} target="_blank" rel="noreferrer" key={link.label}>
          {link.label}<span aria-hidden="true">↗</span>
        </a>
      ))}
    </nav>
  );
}

function ViewContent({ view, content }: { view: ViewId; content: SiteContent }) {
  if (view === "work") {
    return (
      <div className="view-content view-work">
        <header><span>01 / {content.sections.workKicker}</span><h2>{content.sections.workTitle}</h2><p>{content.sections.workIntro}</p></header>
        <div className="view-work-list">
          {content.work.map((item, index) => (
            <article key={item.title}>
              <span>0{index + 1}</span><h3>{item.title}</h3><p>{item.summary}</p>
              <dl><div><dt>{content.labels.fit}</dt><dd>{item.fit}</dd></div><div><dt>{content.labels.stack}</dt><dd>{item.stack}</dd></div></dl>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (view === "career") {
    return (
      <div className="view-content view-career">
        <header><span>02 / {content.sections.careerKicker}</span><h2>{content.sections.careerTitle}</h2><p>{content.sections.careerIntro}</p></header>
        <div className="view-career-list">
          {content.career.map((item, index) => (
            <article key={`${item.company}-${item.period}`}>
              <span>0{index + 1}</span><time>{item.period}</time><h3>{item.company}</h3><small>{item.role}</small><p>{item.summary}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (view === "products") {
    return (
      <div className="view-content view-products">
        <header><span>03 / {content.sections.productsKicker}</span><h2>{content.sections.productsTitle}</h2><p>{content.sections.productsIntro}</p></header>
        <div className="view-product-list">
          {content.products.map((product, index) => (
            <article key={product.name}>
              <span>0{index + 1}</span><small>{product.kind}</small><h3>{product.name}</h3><p>{product.description}</p>
              <nav aria-label={`${product.name} links`}><a href={product.website} target="_blank" rel="noreferrer">{content.labels.website} ↗</a><a href={product.github} target="_blank" rel="noreferrer">GitHub ↗</a></nav>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (view === "contact") {
    return (
      <div className="view-content view-contact">
        <header><span>04 / {content.sections.contactKicker}</span><h2>{content.sections.contactTitle}</h2></header>
        <SocialLinks className="view-socials" />
      </div>
    );
  }
  return (
    <div className="view-content view-home">
      <span>{content.hero.eyebrow}</span>
      <h1><span>{content.hero.line1}</span><span>{content.hero.line2}</span></h1>
      <p>{content.hero.introduction}</p>
      <dl>
        <div><dt>{content.hero.experienceLabel}</dt><dd>{content.hero.experienceValue}</dd></div>
        <div><dt>{content.hero.focusLabel}</dt><dd>{content.hero.focusValue}</dd></div>
        <div><dt>{content.hero.communicationLabel}</dt><dd>{content.hero.communicationValue}</dd></div>
      </dl>
    </div>
  );
}

type LatticeSelection =
  | { kind: "home"; index: 0 }
  | { kind: "work"; index: number }
  | { kind: "career"; index: number }
  | { kind: "product"; index: number }
  | { kind: "contact"; index: 0 };

function LatticePanel({ selection, content }: { selection: LatticeSelection; content: SiteContent }) {
  if (selection.kind === "work") {
    const item = content.work[selection.index];
    return <><span>WORK / 0{selection.index + 1}</span><h2>{item.title}</h2><p>{item.summary}</p><dl><div><dt>{content.labels.fit}</dt><dd>{item.fit}</dd></div><div><dt>{content.labels.stack}</dt><dd>{item.stack}</dd></div><div><dt>{content.labels.scope}</dt><dd>{item.scope}</dd></div><div><dt>{content.labels.outcome}</dt><dd>{item.outcome}</dd></div></dl></>;
  }
  if (selection.kind === "career") {
    const item = content.career[selection.index];
    return <><span>CAREER / 0{selection.index + 1}</span><h2>{item.company}</h2><strong>{item.role} · {item.period}</strong><p>{item.summary}</p><ul>{item.details.map((detail) => <li key={detail}>{detail}</li>)}</ul><small>{item.stack}</small></>;
  }
  if (selection.kind === "product") {
    const item = content.products[selection.index];
    return <><span>PRODUCT / 0{selection.index + 1}</span><h2>{item.name}</h2><strong>{item.kind}</strong><p>{item.description}</p><dl><div><dt>{content.labels.product}</dt><dd>{item.purpose}</dd></div><div><dt>{content.labels.stack}</dt><dd>{item.stack}</dd></div></dl><nav><a href={item.website} target="_blank" rel="noreferrer">{content.labels.website} ↗</a><a href={item.github} target="_blank" rel="noreferrer">GitHub ↗</a></nav></>;
  }
  if (selection.kind === "contact") {
    return <><span>CONTACT / 04</span><h2>{content.sections.contactTitle}</h2><SocialLinks className="lattice-socials" /></>;
  }
  return <><span>PROFILE / 00</span><h1>{content.hero.line1}<br />{content.hero.line2}</h1><p>{content.hero.introduction}</p><dl><div><dt>{content.hero.experienceLabel}</dt><dd>{content.hero.experienceValue}</dd></div><div><dt>{content.hero.focusLabel}</dt><dd>{content.hero.focusValue}</dd></div><div><dt>{content.hero.communicationLabel}</dt><dd>{content.hero.communicationValue}</dd></div></dl></>;
}

export function LatticeExperience({ content }: ExperienceProps) {
  const [selection, setSelection] = useState<LatticeSelection>({ kind: "home", index: 0 });
  const nodes = useMemo(() => [
    { label: "PROFILE", code: "00", x: 46, y: 45, selection: { kind: "home", index: 0 } as LatticeSelection },
    ...content.work.map((item, index) => ({ label: item.title, code: `1${index}`, x: 16 + index * 11, y: 18 + index * 21, selection: { kind: "work", index } as LatticeSelection })),
    ...content.career.map((item, index) => ({ label: item.company, code: `2${index}`, x: 55 + (index % 2) * 18, y: 15 + index * 14, selection: { kind: "career", index } as LatticeSelection })),
    ...content.products.map((item, index) => ({ label: item.name, code: `3${index}`, x: 19 + index * 58, y: 82, selection: { kind: "product", index } as LatticeSelection })),
    { label: "CONTACT", code: "40", x: 88, y: 48, selection: { kind: "contact", index: 0 } as LatticeSelection },
  ], [content]);

  return (
    <section className="experience lattice-experience">
      <header className="lattice-header"><Identity suffix="LATTICE / 01" /><span>SELECT A NODE TO EXPLORE</span></header>
      <div className="lattice-map" aria-label="Portfolio map">
        <div className="lattice-crosshair" aria-hidden="true" />
        {nodes.map((node) => {
          const selected = selection.kind === node.selection.kind && selection.index === node.selection.index;
          return <button key={`${node.code}-${node.label}`} type="button" className={`lattice-node lattice-node-${node.selection.kind}`} style={{ "--node-x": `${node.x}%`, "--node-y": `${node.y}%` } as CSSProperties} aria-pressed={selected} onClick={() => setSelection(node.selection)}><span>{node.code}</span><strong>{node.label}</strong></button>;
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.article className="lattice-panel" key={`${selection.kind}-${selection.index}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} aria-live="polite">
          <LatticePanel selection={selection} content={content} />
        </motion.article>
      </AnimatePresence>
      <footer className="lattice-footer"><span>11 NODES ONLINE</span><span>ISCHCA / SOFTWARE ENGINEER</span></footer>
    </section>
  );
}

const viewIds: ViewId[] = ["home", "work", "career", "products", "contact"];

export function EditorialExperience({ content }: ExperienceProps) {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const view = viewIds[active];
  const move = (delta: number) => setActive((active + delta + viewIds.length) % viewIds.length);

  return (
    <section className="experience editorial-experience" tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowRight") move(1); if (event.key === "ArrowLeft") move(-1); }}>
      <header className="editorial-header"><Identity suffix="ISSUE 01" /><nav aria-label="Pages">{viewIds.map((item, index) => <button type="button" key={item} aria-pressed={active === index} onClick={() => setActive(index)}>0{index + 1} {item}</button>)}</nav></header>
      <div className="editorial-marquee" aria-hidden="true"><span>BACKEND · DATA · PRODUCTS · CLOUD · </span><span>BACKEND · DATA · PRODUCTS · CLOUD · </span></div>
      <AnimatePresence mode="wait">
        <motion.div className="editorial-page" key={view} initial={reduced ? false : { x: "14%", opacity: 0, rotate: 1 }} animate={{ x: 0, opacity: 1, rotate: 0 }} exit={reduced ? undefined : { x: "-10%", opacity: 0, rotate: -1 }} transition={{ duration: 0.42 }}>
          <span className="editorial-folio">PAGE / 0{active + 1}</span><ViewContent view={view} content={content} />
        </motion.div>
      </AnimatePresence>
      <footer className="editorial-controls"><button type="button" onClick={() => move(-1)}>← PREV</button><span>{String(active + 1).padStart(2, "0")} / 05</span><button type="button" onClick={() => move(1)}>NEXT →</button></footer>
    </section>
  );
}

function TerminalOutput({ view, content }: { view: ViewId; content: SiteContent }) {
  return <div className="terminal-output"><ViewContent view={view} content={content} /></div>;
}

export function TerminalExperience({ content, locale }: ExperienceProps & { locale: Locale }) {
  const [view, setView] = useState<ViewId>("home");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>(["boot portfolio.kernel", "ready — type help or choose a command"]);
  const commands: Array<{ command: string; view: ViewId }> = viewIds.map((item) => ({ command: item === "home" ? "about" : item, view: item }));

  const run = (raw: string) => {
    const command = raw.trim().toLowerCase();
    const match = commands.find((item) => item.command === command);
    if (command === "help") setHistory((items) => [...items, `$ ${command}`, "available: about, work, career, products, contact, clear"]);
    else if (command === "clear") setHistory([]);
    else if (match) { setView(match.view); setHistory((items) => [...items, `$ ${command}`, `opened /${match.view}`]); }
    else setHistory((items) => [...items, `$ ${command}`, `command not found: ${command || "(empty)"}`]);
    setInput("");
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => { event.preventDefault(); run(input); };

  return (
    <section className="experience terminal-experience">
      <header className="terminal-topbar"><Identity suffix="TTY / 03" /><span>locale={locale}</span><span>session=public</span></header>
      <div className="terminal-shell">
        <aside className="terminal-history" aria-label="Command history">{history.map((line, index) => <p key={`${line}-${index}`} data-command={line.startsWith("$")}>{line}</p>)}</aside>
        <main className="terminal-main">
          <nav className="terminal-commands" aria-label="Commands">{commands.map((item) => <button type="button" key={item.command} onClick={() => run(item.command)} aria-pressed={view === item.view}>./{item.command}</button>)}</nav>
          <AnimatePresence mode="wait"><motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TerminalOutput view={view} content={content} /></motion.div></AnimatePresence>
        </main>
      </div>
      <form className="terminal-prompt" onSubmit={submit}><label htmlFor="portfolio-command">visitor@ischca:~$</label><input id="portfolio-command" value={input} onChange={(event) => setInput(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); run(input); } }} autoComplete="off" spellCheck={false} placeholder="help" /><button type="submit">RUN ↵</button></form>
    </section>
  );
}

type WindowId = ViewId;
type WindowState = { open: boolean; x: number; y: number; z: number };

export function DesktopExperience({ content }: ExperienceProps) {
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>({
    home: { open: true, x: 32, y: 74, z: 2 }, work: { open: true, x: 360, y: 130, z: 3 }, career: { open: false, x: 150, y: 100, z: 1 }, products: { open: false, x: 440, y: 90, z: 1 }, contact: { open: false, x: 260, y: 180, z: 1 },
  });
  const drag = useRef<{ id: WindowId; startX: number; startY: number; x: number; y: number } | null>(null);
  const topZ = useRef(3);

  const focus = (id: WindowId) => {
    topZ.current += 1;
    setWindows((items) => ({ ...items, [id]: { ...items[id], open: true, z: topZ.current } }));
  };
  const close = (id: WindowId) => setWindows((items) => ({ ...items, [id]: { ...items[id], open: false } }));
  const pointerDown = (id: WindowId, event: ReactPointerEvent<HTMLElement>) => {
    focus(id); event.currentTarget.setPointerCapture(event.pointerId); const state = windows[id]; drag.current = { id, startX: event.clientX, startY: event.clientY, x: state.x, y: state.y };
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return; const current = drag.current; setWindows((items) => ({ ...items, [current.id]: { ...items[current.id], x: Math.max(0, current.x + event.clientX - current.startX), y: Math.max(54, current.y + event.clientY - current.startY) } }));
  };

  return (
    <section className="experience desktop-experience" onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }}>
      <header className="desktop-menubar"><Identity suffix="PORTFOLIO OS" /><span>File</span><span>View</span><span>Window</span><time>10:16</time></header>
      <div className="desktop-wallpaper" aria-hidden="true"><strong>Ischca</strong><span>BUILD / FIX / EVOLVE</span></div>
      <div className="desktop-icons">{viewIds.map((id, index) => <button type="button" key={id} onDoubleClick={() => focus(id)} onClick={() => focus(id)}><span>0{index + 1}</span><strong>{id}</strong></button>)}</div>
      <div className="desktop-windows">
        {viewIds.map((id, index) => windows[id].open && (
          <article className={`desktop-window desktop-window-${id}`} key={id} style={{ left: windows[id].x, top: windows[id].y, zIndex: windows[id].z }} onPointerDown={() => focus(id)}>
            <header onPointerDown={(event) => pointerDown(id, event)}><div><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => close(id)} aria-label={`Close ${id}`} /><span /><span /></div><strong>{String(index + 1).padStart(2, "0")}_{id}.portfolio</strong></header>
            <div className="desktop-window-content"><ViewContent view={id} content={content} /></div>
          </article>
        ))}
      </div>
      <nav className="desktop-dock" aria-label="Applications">{viewIds.map((id, index) => <button type="button" key={id} onClick={() => focus(id)} aria-pressed={windows[id].open}><span>0{index + 1}</span><strong>{id}</strong></button>)}</nav>
    </section>
  );
}

function StoryScene({ view, content }: { view: ViewId; content: SiteContent }) {
  return <ViewContent view={view} content={content} />;
}

export function ScrollStoryExperience({ content }: ExperienceProps) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const markers = Array.from(document.querySelectorAll<HTMLElement>(".story-marker"));
    const observer = new IntersectionObserver((entries) => { const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (current) setActive(Number((current.target as HTMLElement).dataset.scene ?? 0)); }, { rootMargin: "-20% 0px -45%", threshold: [0.1, 0.35, 0.7] });
    markers.forEach((marker) => observer.observe(marker)); return () => observer.disconnect();
  }, []);
  const view = viewIds[active];
  return (
    <section className="experience story-experience">
      <div className="story-sticky" data-scene={active}>
        <header className="story-header"><Identity suffix="SCROLL FILM / 05" /><span>SCENE 0{active + 1} / 05</span></header>
        <div className="story-light" aria-hidden="true" />
        <AnimatePresence mode="wait"><motion.div className="story-frame" key={view} initial={{ opacity: 0, scale: 1.04, filter: "blur(16px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.55 }}><StoryScene view={view} content={content} /></motion.div></AnimatePresence>
        <nav className="story-nav" aria-label="Scenes">{viewIds.map((item, index) => <button type="button" key={item} aria-current={active === index ? "step" : undefined} onClick={() => document.getElementById(`story-${item}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}><span>0{index + 1}</span><strong>{item}</strong></button>)}</nav>
      </div>
      <div className="story-track">{viewIds.map((item, index) => <article className="story-marker" id={`story-${item}`} data-scene={index} key={item}><span>SCENE 0{index + 1}</span><strong>{item}</strong></article>)}</div>
    </section>
  );
}


export function FluxExperience({ content }: ExperienceProps) {
  const [active, setActive] = useState(0); const [pressed, setPressed] = useState(false); const [lab, setLab] = useState(false); const [cosmos, setCosmos] = useState<CosmosStatus>({ backend: "initializing", particles: 0, fps: 0, pipeline: "selecting renderer" }); const view = viewIds[active];
  const fieldRef = useRef<HTMLElement>(null);
  const cosmosHeadline = useMemo<[string, string]>(() => [content.hero.line1, content.hero.line2], [content.hero.line1, content.hero.line2]);
  const point = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const y = (event.clientY - rect.top) / rect.height;
    event.currentTarget.style.setProperty("--flux-x", String(x)); event.currentTarget.style.setProperty("--flux-y", String(y));
    event.currentTarget.style.setProperty("--flux-cx", `${x * 100}%`); event.currentTarget.style.setProperty("--flux-cy", `${y * 100}%`);
    event.currentTarget.style.setProperty("--flux-dx", `${(x - 0.5) * 40}px`); event.currentTarget.style.setProperty("--flux-dy", `${(y - 0.5) * 40}px`);
    event.currentTarget.style.setProperty("--flux-rx", `${(0.5 - y) * 2.2}deg`); event.currentTarget.style.setProperty("--flux-ry", `${(x - 0.5) * 3}deg`);
  };
  const moveView = (delta: number) => setActive((current) => (current + delta + viewIds.length) % viewIds.length);
  return (
    <section ref={fieldRef} className="experience flux-experience" data-view={active} data-energy={pressed ? "repel" : "attract"} tabIndex={0} onPointerMove={point} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onKeyDown={(event) => { const digit = Number(event.key); if (digit >= 1 && digit <= 5) setActive(digit - 1); if (event.key === "ArrowRight") moveView(1); if (event.key === "ArrowLeft") moveView(-1); if (event.key.toLowerCase() === "d") setLab((open) => !open); }}>
      <CosmosField active={active} headline={cosmosHeadline} careerCount={content.career.length} productCount={content.products.length} onStatus={setCosmos} />
      <header className="flux-header"><Identity suffix="COMPUTATIONAL COSMOS" /><span>MOVE · HOLD · DRAG · D / LAB</span></header>
      <nav className="flux-orbit" aria-label="Views">{viewIds.map((item, index) => <span className="flux-node-slot" key={item} style={{ "--orbit-angle": `${index * 72 - 90}deg` } as CSSProperties}><motion.button type="button" drag dragConstraints={fieldRef} dragElastic={0.18} dragMomentum={false} whileDrag={{ scale: 1.35 }} onClick={() => setActive(index)} aria-pressed={active === index}><span>0{index + 1}</span><strong>{item}</strong><i aria-hidden="true" /></motion.button></span>)}</nav>
      <div className="flux-panel-space"><AnimatePresence mode="wait"><motion.article className="flux-panel" key={view} initial={{ opacity: 0, y: 6, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -4, filter: "blur(2px)" }} transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}><span className="flux-panel-index" aria-hidden="true">0{active + 1}</span><ViewContent view={view} content={content} /></motion.article></AnimatePresence></div>
      <button type="button" className="flux-lab-toggle" aria-expanded={lab} onClick={(event) => { event.stopPropagation(); setLab((open) => !open); }}>D</button>
      <AnimatePresence>{lab && <motion.aside className="flux-lab" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} aria-live="polite"><span>LIVE RENDER PIPELINE</span><dl><div><dt>BACKEND</dt><dd>{cosmos.backend}</dd></div><div><dt>PARTICLES</dt><dd>{cosmos.particles.toLocaleString()}</dd></div><div><dt>FPS</dt><dd>{cosmos.fps || "—"}</dd></div><div><dt>PASS</dt><dd>{cosmos.pipeline}</dd></div><div><dt>TARGET</dt><dd>{view === "home" ? "SDF TYPOGRAPHY" : view === "career" ? "ORBITAL SYSTEM" : view === "products" ? "BINARY PLANETS" : view.toUpperCase()}</dd></div><div><dt>FORCE</dt><dd>{pressed ? "REPULSION" : "GRAVITY"}</dd></div></dl><small>Press D to close</small></motion.aside>}</AnimatePresence>
      <footer className="flux-footer"><span>0{active + 1} / {view}</span><span>{cosmos.backend} · {cosmos.particles ? cosmos.particles.toLocaleString() : "…"} PARTICLES</span><span>{pressed ? "repelling" : "particles follow your gravity"}</span></footer>
    </section>
  );
}
