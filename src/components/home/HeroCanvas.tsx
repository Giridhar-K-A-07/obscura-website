import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_LENS,
  LENS_RADIUS,
  VIEWBOX,
  backdropPoints,
  edges,
  isLit,
  nodes,
} from "../../lib/homeGraph";
import "./HeroCanvas.css";

/*
  Interactive Data Canvas (Master Brief §7.5, option A).

  The graph is server-rendered as plain SVG, so a complete static frame is visible with no
  JavaScript. Hydration (client:idle, so it never competes with the hero text) adds:
    - a pointer/tap "aperture": nodes and edges inside it light up and show their labels;
    - a second tap on a lit node follows its link;
    - gentle drift and pointer parallax, with a visible pause control;
    - pausing when the tab is hidden or the hero is off-screen.
  The SVG is decorative (aria-hidden). The keyboard and screen-reader equivalent is the
  "Explore" list rendered by Hero.astro: focusing a link there lights its node here.
*/

const byId = new Map(nodes.map((n) => [n.id, n]));

function litSet(lens: { x: number; y: number }): Set<string> {
  return new Set(nodes.filter((n) => isLit(n, lens)).map((n) => n.id));
}

function edgeState(a: string, b: string, lit: Set<string>): "true" | "half" | "false" {
  const count = Number(lit.has(a)) + Number(lit.has(b));
  return count === 2 ? "true" : count === 1 ? "half" : "false";
}

export default function HeroCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Whether the node under the last pointer-down was already lit (decides tap-to-follow).
  const litAtDown = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);

  const initial = litSet(DEFAULT_LENS);
  const motionAllowed = mounted && !reduced;
  const running = !userPaused && visible && !tabHidden;

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onMedia = (e: MediaQueryListEvent) => setReduced(e.matches);
    media.addEventListener("change", onMedia);
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      media.removeEventListener("change", onMedia);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
    };
  }, []);

  // Apply the aperture imperatively so pointer moves never re-render React.
  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const apply = (lens: { x: number; y: number }, lit: Set<string>) => {
      const lensEl = svg.querySelector<SVGElement>(".lens");
      if (lensEl) lensEl.style.transform = `translate(${lens.x}px, ${lens.y}px)`;
      svg.querySelectorAll<SVGElement>("[data-node]").forEach((el) => {
        el.dataset.lit = String(lit.has(el.dataset.node!));
      });
      svg.querySelectorAll<SVGElement>("[data-edge]").forEach((el) => {
        const [a, b] = el.dataset.edge!.split(">");
        el.dataset.lit = edgeState(a, b, lit);
      });
    };

    const toViewBox = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * VIEWBOX.width,
        y: ((clientY - rect.top) / rect.height) * VIEWBOX.height,
      };
    };

    let frame = 0;
    const schedule = (clientX: number, clientY: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const lens = toViewBox(clientX, clientY);
        apply(lens, litSet(lens));
        const rect = root.getBoundingClientRect();
        root.style.setProperty("--px", String(((clientX - rect.left) / rect.width - 0.5) * 2));
        root.style.setProperty("--py", String(((clientY - rect.top) / rect.height - 0.5) * 2));
      });
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      root.style.removeProperty("--px");
      root.style.removeProperty("--py");
      apply(DEFAULT_LENS, litSet(DEFAULT_LENS));
    };

    const onMove = (e: PointerEvent) => schedule(e.clientX, e.clientY);
    const onDownCapture = (e: PointerEvent) => {
      const group = (e.target as Element).closest<SVGElement>("[data-node]");
      litAtDown.current = group?.dataset.lit === "true";
    };
    // Touch fires pointerleave right after pointerup; keep the tapped state instead.
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "touch") reset();
    };
    root.addEventListener("pointerdown", onDownCapture, true);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);

    // Keyboard and screen-reader path: the Explore list lives outside this component.
    const links = document.querySelectorAll<HTMLElement>("[data-node-link]");
    const light = (id: string) => {
      const node = byId.get(id);
      if (node) apply({ x: node.x, y: node.y }, litSet({ x: node.x, y: node.y }));
    };
    const handlers: Array<[HTMLElement, string, () => void]> = [];
    links.forEach((link) => {
      const id = link.dataset.nodeLink!;
      const on = () => light(id);
      for (const type of ["focus", "mouseenter"]) {
        link.addEventListener(type, on);
        handlers.push([link, type, on]);
      }
      for (const type of ["blur", "mouseleave"]) {
        link.addEventListener(type, reset);
        handlers.push([link, type, reset]);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointerdown", onDownCapture, true);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      handlers.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
    };
  }, []);

  // Tap to focus, tap again to follow (no hover-only behaviour on touch).
  const onNodeClick = (event: React.MouseEvent<Element>) => {
    if (!litAtDown.current) event.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className="hero-canvas"
      data-motion={motionAllowed ? "on" : "off"}
      data-running={String(running)}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="hero-lens">
            <stop offset="0" stopColor="var(--color-aperture)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--color-aperture)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="lens-wrap">
          <circle
            className="lens"
            r={LENS_RADIUS + 40}
            fill="url(#hero-lens)"
            style={{ transform: `translate(${DEFAULT_LENS.x}px, ${DEFAULT_LENS.y}px)` }}
          />
        </g>

        <g className="drift">
          <g className="layer-far">
            <g className="backdrop">
              {backdropPoints.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />
              ))}
            </g>
            {edges.map(([a, b]) => {
              const from = byId.get(a)!;
              const to = byId.get(b)!;
              return (
                <line
                  key={`${a}>${b}`}
                  className="edge"
                  data-edge={`${a}>${b}`}
                  data-lit={edgeState(a, b, initial)}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              );
            })}
          </g>
          <g className="layer-near">
            {nodes.map((node) => {
              const flip = node.x > 520;
              const r = node.kind === "hub" ? 16 : node.kind === "area" ? 11 : 7;
              const body = (
                <>
                  <circle cx={node.x} cy={node.y} r={r} />
                  <text
                    x={flip ? node.x - r - 10 : node.x + r + 10}
                    y={node.y + 10}
                    textAnchor={flip ? "end" : "start"}
                  >
                    {node.label}
                  </text>
                </>
              );
              return (
                <g
                  key={node.id}
                  className="node"
                  data-node={node.id}
                  data-kind={node.kind}
                  data-lit={String(initial.has(node.id))}
                >
                  {node.href ? (
                    <a href={node.href} tabIndex={-1} onClick={onNodeClick}>
                      {body}
                    </a>
                  ) : (
                    body
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {motionAllowed && (
        <button
          type="button"
          className="btn btn-quiet motion-toggle"
          onClick={() => setUserPaused((p) => !p)}
        >
          {userPaused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
