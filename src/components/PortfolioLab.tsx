import { useState } from "react";
import type { Locale, SiteContent } from "../content/site";
import {
  DesktopExperience,
  EditorialExperience,
  FluxExperience,
  LatticeExperience,
  ScrollStoryExperience,
  TerminalExperience,
} from "./Experiences";
import { CanvasGrimoireExperience } from "./CanvasGrimoireExperience";

type ModeId = SiteContent["modes"][number]["id"];

type Props = {
  locale: Locale;
  content: SiteContent;
  alternateHref: string;
  alternateLabel: string;
};

function Experience({ mode, content, locale }: { mode: ModeId; content: SiteContent; locale: Locale }) {
  if (mode === "editorial") return <EditorialExperience content={content} />;
  if (mode === "terminal") return <TerminalExperience content={content} locale={locale} />;
  if (mode === "desktop") return <DesktopExperience content={content} />;
  if (mode === "story") return <ScrollStoryExperience content={content} />;
  if (mode === "flux") return <FluxExperience content={content} />;
  if (mode === "grimoire") return <CanvasGrimoireExperience content={content} locale={locale} />;
  return <LatticeExperience content={content} />;
}

export default function PortfolioLab({
  locale,
  content,
  alternateHref,
  alternateLabel,
}: Props) {
  const [mode, setMode] = useState<ModeId>("lattice");
  const activeMode = content.modes.find((item) => item.id === mode) ?? content.modes[0];

  const selectMode = (nextMode: ModeId) => {
    setMode(nextMode);
    requestAnimationFrame(() => document.getElementById("experience")?.scrollIntoView({ block: "start" }));
  };

  return (
    <div className="portfolio-lab" data-pattern={mode}>
      <aside className="pattern-switcher" aria-label={content.labels.designLab}>
        <div className="pattern-current">
          <span>07 / DESIGN LAB</span>
          <strong>{activeMode.name}</strong>
          <p>{activeMode.description}</p>
        </div>
        <div className="pattern-options" role="group" aria-label={content.labels.chooseDirection}>
          {content.modes.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={mode === item.id}
              onClick={() => selectMode(item.id)}
            >
              <span>0{index + 1}</span>
              <strong>{item.name}</strong>
            </button>
          ))}
        </div>
        <div className="pattern-language">
          <span>{locale === "ja" ? "日本語" : "English"}</span>
          <a href={alternateHref}>{alternateLabel}</a>
        </div>
      </aside>
      <main id="experience">
        <Experience mode={mode} content={content} locale={locale} />
      </main>
    </div>
  );
}
