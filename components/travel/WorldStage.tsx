"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Topology } from "topojson-specification";
import type { Messages } from "@/lib/messages";
import { type WorldMode, type WorldPalette, type WorldScene, createWorldScene } from "@/lib/travel/world-scene";

type WorldStageProps = {
  visited: ReadonlySet<string>;
  mode: WorldMode;
  zoom: number;
  focus: { code: string; tick: number } | null;
  names: Map<string, string>;
  label: string;
  text: Messages["travel"];
  onToggle: (code: string) => void;
  onZoom: (zoom: number) => void;
};

const SWATCHES: Record<keyof WorldPalette, string> = {
  ocean: "var(--globe-ocean)",
  land: "var(--globe-land)",
  border: "var(--globe-border)",
  visited: "var(--globe-visited)",
  visitedBorder: "var(--globe-visited-border)",
  hover: "var(--globe-hover)",
  grid: "var(--globe-grid)",
  glow: "var(--globe-glow)",
  shade: "var(--globe-shade)",
  ink: "var(--text)",
};
const SWATCH_KEYS = Object.keys(SWATCHES) as (keyof WorldPalette)[];
const TOOLTIP_OFFSET = 16;

export default function WorldStage({
  visited,
  mode,
  zoom,
  focus,
  names,
  label,
  text,
  onToggle,
  onZoom,
}: WorldStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<WorldScene | null>(null);
  const handlersRef = useRef({ onToggle, onZoom });
  const revealedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    handlersRef.current = { onToggle, onZoom };
  }, [onToggle, onZoom]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const swatches = swatchRef.current;
    if (!frame || !canvas || !swatches) return;

    let scene: WorldScene | null = null;
    let cancelled = false;

    const readPalette = (): WorldPalette => {
      const colors = {} as WorldPalette;
      SWATCH_KEYS.forEach((key, index) => {
        colors[key] = getComputedStyle(swatches.children[index]).color;
      });
      return colors;
    };
    const fit = () => scene?.resize(frame.clientWidth, frame.clientHeight);
    const repaint = () => scene?.setPalette(readPalette());

    const sizeWatcher = new ResizeObserver(fit);
    const themeWatcher = new MutationObserver(repaint);
    const systemTheme = matchMedia("(prefers-color-scheme: dark)");

    import("world-atlas/countries-110m.json").then((atlas) => {
      if (cancelled) return;
      scene = createWorldScene(
        canvas,
        atlas.default as unknown as Topology,
        {
          onToggle: (code) => handlersRef.current.onToggle(code),
          onZoom: (next) => handlersRef.current.onZoom(next),
          onHover: (code, x, y) => {
            setHovered(code);
            const tooltip = tooltipRef.current;
            if (tooltip) tooltip.style.translate = `${x + TOOLTIP_OFFSET}px ${y + TOOLTIP_OFFSET}px`;
          },
        },
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      sceneRef.current = scene;
      fit();
      repaint();
      sizeWatcher.observe(frame);
      themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      systemTheme.addEventListener("change", repaint);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sizeWatcher.disconnect();
      themeWatcher.disconnect();
      systemTheme.removeEventListener("change", repaint);
      scene?.destroy();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const reveal = !revealedRef.current && visited.size > 0;
    if (reveal) revealedRef.current = true;
    sceneRef.current?.setVisited(visited, reveal);
  }, [ready, visited]);

  useEffect(() => {
    if (ready) sceneRef.current?.setMode(mode);
  }, [ready, mode]);

  useEffect(() => {
    if (ready) sceneRef.current?.setZoom(zoom);
  }, [ready, zoom]);

  useEffect(() => {
    if (ready && focus) sceneRef.current?.focus(focus.code);
  }, [ready, focus]);

  return (
    <div ref={frameRef} className="relative size-full">
      <span ref={swatchRef} aria-hidden="true" className="hidden">
        {SWATCH_KEYS.map((key) => (
          <span key={key} style={{ color: SWATCHES[key] } as CSSProperties} />
        ))}
      </span>

      {!ready && (
        <div role="status" className="absolute inset-0 grid place-items-center">
          <span className="sr-only">{text.stage.loading}</span>
          <span aria-hidden="true" className="size-[88%] rounded-full bg-surface-muted motion-safe:animate-pulse" />
        </div>
      )}

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={label}
        className="stage-fade absolute inset-0 size-full touch-none outline-none select-none"
      />

      <div
        ref={tooltipRef}
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-0 z-10 max-w-56 rounded-lg bg-text px-3 py-2 text-background shadow-lg shadow-neutral-950/20 transition-opacity duration-150 ease-out ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-label">{hovered ? names.get(hovered) : ""}</p>
        <p className="text-caption opacity-80">
          {hovered && visited.has(hovered) ? text.tooltip.visited : text.tooltip.mark}
        </p>
      </div>
    </div>
  );
}
