import { useRef } from "react";
import { VIEWBOX, backdropPoints, edges, nodes } from "../lib/homeGraph";
import { edgeState, litWithin, useAperture, usePresence, type Lens } from "./graphFocus";
import "./HeroCanvasProjection.css";

/*
  Concept C hero: the "projection" (design exploration, not selected or approved).

  The camera obscura as a picture: a round chamber with a pinhole of light at its rim, a faint cone
  of projected light falling into it, and the site's network resolving inside. A dim, upside-down
  copy of the network sits behind it, like the inverted image a pinhole projects. The pointer or a
  tap moves a soft pool of light; nodes in it light up and show their labels (the production
  hero's rule). The only automatic motion is a very slow drift of the network and a slow change in
  the cone's brightness, both with a pause control; both stop when the hero is off screen or the
  tab is hidden, and neither runs under reduced motion.
  The graphic is decorative (aria-hidden). The keyboard and screen-reader path is the Explore list
  next to it: focusing a link moves the light to that node.
*/

const RADIUS = 240;
const REST: Lens = { x: 360, y: 250 };
const DISC = { x: 400, y: 350, r: 325 } as const;
const byId = new Map(nodes.map((n) => [n.id, n]));

export default function HeroCanvasProjection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { motionAllowed, running, userPaused, togglePause } = usePresence(rootRef);
  const initial = litWithin(REST, RADIUS);

  const { onNodeClick } = useAperture(rootRef, svgRef, {
    radius: RADIUS,
    rest: REST,
    apply: (lens, lit) => {
      const svg = svgRef.current;
      if (!svg) return;
      const light = svg.querySelector<SVGElement>(".light");
      if (light) light.style.transform = `translate(${lens.x}px, ${lens.y}px)`;
      svg.querySelectorAll<SVGElement>("[data-node]").forEach((el) => {
        el.dataset.lit = String(lit.has(el.dataset.node!));
      });
      svg.querySelectorAll<SVGElement>("[data-edge]").forEach((el) => {
        const [a, b] = el.dataset.edge!.split(">");
        el.dataset.lit = edgeState(a, b, lit);
      });
    },
  });

  return (
    <div
      ref={rootRef}
      className="projection"
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
          <radialGradient id="chamber-fill" cx="50%" cy="38%" r="70%">
            <stop offset="0" stopColor="var(--color-chamber)" stopOpacity="0.95" />
            <stop offset="1" stopColor="var(--color-ink)" stopOpacity="0.9" />
          </radialGradient>
          <linearGradient id="cone-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-aperture)" stopOpacity="0.26" />
            <stop offset="1" stopColor="var(--color-aperture)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="pool">
            <stop offset="0" stopColor="var(--color-aperture)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--color-aperture)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="chamber-clip">
            <circle cx={DISC.x} cy={DISC.y} r={DISC.r - 2} />
          </clipPath>
        </defs>

        <circle className="chamber" cx={DISC.x} cy={DISC.y} r={DISC.r} fill="url(#chamber-fill)" />
        <circle className="chamber-inner" cx={DISC.x} cy={DISC.y} r={DISC.r - 16} />

        <g clipPath="url(#chamber-clip)">
          <polygon
            className="cone"
            points={`${DISC.x},10 190,${DISC.y + 20} 610,${DISC.y + 20}`}
            fill="url(#cone-fill)"
          />

          <g className="ghost" transform={`rotate(180 ${DISC.x} ${DISC.y})`}>
            {edges.map(([a, b]) => {
              const from = byId.get(a)!;
              const to = byId.get(b)!;
              return <line key={`${a}>${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
            })}
            {nodes.map((n) => (
              <circle key={n.id} cx={n.x} cy={n.y} r={n.kind === "hub" ? 14 : 9} />
            ))}
          </g>

          <circle
            className="light"
            r={RADIUS + 40}
            fill="url(#pool)"
            style={{ transform: `translate(${REST.x}px, ${REST.y}px)` }}
          />

          <g className="backdrop">
            {backdropPoints.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />
            ))}
          </g>
        </g>

        <g className="drift">
          <g>
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
            {nodes.map((node) => {
              const flip = node.x > 470;
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

        <circle className="chamber-rim" cx={DISC.x} cy={DISC.y} r={DISC.r} />
        {/* The pinhole: the one bright point, on the rim. */}
        <circle className="pinhole-halo" cx={DISC.x} cy={DISC.y - DISC.r} r={13} />
        <circle className="pinhole" cx={DISC.x} cy={DISC.y - DISC.r} r={5} />
      </svg>

      {motionAllowed && (
        <button type="button" className="btn btn-quiet pause" onClick={togglePause}>
          {userPaused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
