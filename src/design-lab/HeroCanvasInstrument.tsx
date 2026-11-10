import { useEffect, useRef } from "react";
import { VIEWBOX, backdropPoints, edges, nodes } from "../lib/homeGraph";
import { edgeState, litWithin, useAperture, usePresence, type Lens } from "./graphFocus";
import "./HeroCanvasInstrument.css";

/*
  Concept B hero: the "viewfinder" (design exploration, not selected or approved).

  The same network as the production hero, drawn twice: a dim, softly blurred copy for context,
  and a sharp copy that shows only inside a circular focus window, with a reticle around it. The
  window follows the pointer or a tap. Without a pointer it sweeps slowly, which is the one
  automatic motion; it has a pause control, stops when the hero is off screen or the tab is hidden,
  and does not run under reduced motion (the window then rests, a complete static frame).
  The graphic is decorative (aria-hidden). The keyboard and screen-reader path is the Explore list
  next to it: focusing a link moves the window to that node.
  The "in focus" line is derived from the nodes inside the window. It is a live read-out of the
  site structure, hidden from assistive technology so it is not announced as it changes.
*/

const RADIUS = 215;
const REST: Lens = { x: 360, y: 250 };
const byId = new Map(nodes.map((n) => [n.id, n]));
const IDLE_MS = 4000;

interface LayerProps {
  sharp: boolean;
  initial: Set<string>;
  onNodeClick?: (event: React.MouseEvent<Element>) => void;
}

function Layer({ sharp, initial, onNodeClick }: LayerProps) {
  return (
    <>
      {edges.map(([a, b]) => {
        const from = byId.get(a)!;
        const to = byId.get(b)!;
        return (
          <line
            key={`${a}>${b}`}
            className="edge"
            data-edge={sharp ? `${a}>${b}` : undefined}
            data-lit={sharp ? edgeState(a, b, initial) : undefined}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
          />
        );
      })}
      {nodes.map((node) => {
        const r = node.kind === "hub" ? 16 : node.kind === "area" ? 11 : 7;
        const circle = <circle cx={node.x} cy={node.y} r={r} />;
        if (!sharp) {
          return (
            <g key={node.id} className="node" data-kind={node.kind}>
              {circle}
            </g>
          );
        }
        const body = circle;
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
    </>
  );
}

export default function HeroCanvasInstrument() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const lastUser = useRef(0);
  const { motionAllowed, running, userPaused, togglePause } = usePresence(rootRef);
  const initial = litWithin(REST, RADIUS);

  const apply = (lens: Lens, lit: Set<string>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const move = `translate(${lens.x}px, ${lens.y}px)`;
    svg.querySelectorAll<SVGElement>("[data-follow]").forEach((el) => (el.style.transform = move));
    svg.querySelectorAll<SVGElement>("[data-node]").forEach((el) => {
      el.dataset.lit = String(lit.has(el.dataset.node!));
    });
    svg.querySelectorAll<SVGElement>("[data-label]").forEach((el) => {
      el.dataset.lit = String(lit.has(el.dataset.label!));
    });
    svg.querySelectorAll<SVGElement>("[data-edge]").forEach((el) => {
      const [a, b] = el.dataset.edge!.split(">");
      el.dataset.lit = edgeState(a, b, lit);
    });
    if (readoutRef.current) {
      const names = nodes.filter((n) => lit.has(n.id)).map((n) => n.label);
      readoutRef.current.textContent = names.length ? names.join(" · ") : "Nothing in focus";
    }
  };

  const { onNodeClick } = useAperture(rootRef, svgRef, {
    apply,
    radius: RADIUS,
    rest: REST,
    onUserMove: () => {
      lastUser.current = Date.now();
    },
  });

  // The idle sweep: a slow, small drift of the window while nobody is pointing at the hero.
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      if (Date.now() - lastUser.current > IDLE_MS) {
        const s = (now - start) / 1000;
        const lens = { x: REST.x + Math.sin(s * 0.33) * 150, y: REST.y + Math.cos(s * 0.23) * 90 };
        apply(lens, litWithin(lens, RADIUS));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // `apply` only reads refs, so it is safe to leave out of the dependencies.
  }, [running]);

  const rest = `translate(${REST.x}px, ${REST.y}px)`;
  const reticle = RADIUS + 12;

  return (
    <div ref={rootRef} className="viewfinder" data-motion={motionAllowed ? "on" : "off"}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id="focus-window">
            <circle data-follow="" className="window" r={RADIUS} style={{ transform: rest }} />
          </clipPath>
        </defs>

        <g className="base">
          <g className="backdrop">
            {backdropPoints.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />
            ))}
          </g>
          <Layer sharp={false} initial={initial} />
        </g>

        <g className="sharp" clipPath="url(#focus-window)">
          <Layer sharp initial={initial} onNodeClick={onNodeClick} />
        </g>

        {/* Labels sit outside the window's clip, so a label is never cut off, and show only for the points in focus. */}
        <g className="labels">
          {nodes.map((node) => {
            const flip = node.x > 520;
            const r = node.kind === "hub" ? 16 : node.kind === "area" ? 11 : 7;
            return (
              <text
                key={node.id}
                data-label={node.id}
                data-lit={String(initial.has(node.id))}
                x={flip ? node.x - r - 10 : node.x + r + 10}
                y={node.y + 10}
                textAnchor={flip ? "end" : "start"}
              >
                {node.label}
              </text>
            );
          })}
        </g>

        <g data-follow="" className="reticle" style={{ transform: rest }}>
          <circle r={RADIUS} className="ring" />
          <circle r={reticle} className="ring-outer" />
          <path
            className="tick"
            d={`M0 ${-RADIUS} v-14 M0 ${RADIUS} v14 M${-RADIUS} 0 h-14 M${RADIUS} 0 h14`}
          />
          <path className="cross" d="M-9 0 h18 M0 -9 v18" />
        </g>
      </svg>

      <p ref={readoutRef} className="readout" aria-hidden="true">
        {nodes
          .filter((n) => initial.has(n.id))
          .map((n) => n.label)
          .join(" · ")}
      </p>

      {motionAllowed && (
        <button type="button" className="btn btn-quiet pause" onClick={togglePause}>
          {userPaused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
