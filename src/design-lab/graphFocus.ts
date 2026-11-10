import { useEffect, useRef, useState, type RefObject } from "react";
import { VIEWBOX, nodes } from "../lib/homeGraph";

/*
  Shared behaviour for the design-lab hero islands (Concepts B and C): the same network as the
  production hero (src/lib/homeGraph.ts), the same pointer, tap and keyboard rules, and the same
  motion rules. Used only by the demo-only /design-lab/ pages, never by the real homepage.
  The production island (src/components/home/HeroCanvas.tsx) is left unchanged and is Concept A's hero.
*/

export interface Lens {
  x: number;
  y: number;
}

const byId = new Map(nodes.map((node) => [node.id, node]));

/** The ids of the nodes inside a circular aperture of the given radius (in viewBox units). */
export function litWithin(lens: Lens, radius: number): Set<string> {
  return new Set(
    nodes.filter((n) => Math.hypot(n.x - lens.x, n.y - lens.y) < radius).map((n) => n.id),
  );
}

/** Whether an edge has both ends, one end or no end in the aperture. */
export function edgeState(a: string, b: string, lit: Set<string>): "true" | "half" | "false" {
  const count = Number(lit.has(a)) + Number(lit.has(b));
  return count === 2 ? "true" : count === 1 ? "half" : "false";
}

/**
 * Reduced motion, the visitor's pause choice, and whether the hero is on screen and the tab is
 * visible. Motion only runs while `running` is true, and never when reduced motion is requested.
 */
export function usePresence(rootRef: RefObject<HTMLElement | null>) {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);

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
  }, [rootRef]);

  const motionAllowed = mounted && !reduced;
  const running = motionAllowed && !userPaused && visible && !tabHidden;
  return { motionAllowed, running, userPaused, togglePause: () => setUserPaused((p) => !p) };
}

interface ApertureOptions {
  /** Moves whatever shows the aperture. Called with the lens in viewBox units. */
  apply: (lens: Lens, lit: Set<string>) => void;
  /** The aperture radius in viewBox units. */
  radius: number;
  /** Where the aperture rests when nothing points at the hero. */
  rest: Lens;
  /** Called when the visitor points at the hero, so an idle sweep can stand down. */
  onUserMove?: () => void;
}

/**
 * Pointer and keyboard control of the aperture:
 *  - the pointer (or a tap) moves it; a tap on a node that is already in focus follows its link,
 *    so a touch visitor has no hover-only step;
 *  - focusing or hovering a link in the Explore list (`[data-node-link]`, outside the island) moves
 *    it to that node, which is the keyboard and screen-reader path;
 *  - leaving the hero returns it to rest (touch keeps the tapped state).
 * The aperture is moved imperatively, so pointer moves never re-render React.
 */
export function useAperture(
  rootRef: RefObject<HTMLElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  options: ApertureOptions,
) {
  const litAtDown = useRef(false);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const place = (lens: Lens) => {
      const { apply, radius } = latest.current;
      apply(lens, litWithin(lens, radius));
    };
    const toViewBox = (clientX: number, clientY: number): Lens => {
      const rect = svg.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * VIEWBOX.width,
        y: ((clientY - rect.top) / rect.height) * VIEWBOX.height,
      };
    };

    let frame = 0;
    const schedule = (clientX: number, clientY: number) => {
      latest.current.onUserMove?.();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(toViewBox(clientX, clientY)));
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      place(latest.current.rest);
    };

    const onMove = (e: PointerEvent) => schedule(e.clientX, e.clientY);
    const onDownCapture = (e: PointerEvent) => {
      const group = (e.target as Element).closest<SVGElement>("[data-node]");
      litAtDown.current = group?.dataset.lit === "true";
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "touch") reset();
    };
    root.addEventListener("pointerdown", onDownCapture, true);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);

    const handlers: Array<[HTMLElement, string, () => void]> = [];
    document.querySelectorAll<HTMLElement>("[data-node-link]").forEach((link) => {
      const node = byId.get(link.dataset.nodeLink!);
      if (!node) return;
      const on = () => place({ x: node.x, y: node.y });
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
  }, [rootRef, svgRef]);

  /** Tap to focus, tap again to follow: a link that was not in focus on pointer-down is not followed. */
  const onNodeClick = (event: { preventDefault: () => void }) => {
    if (!litAtDown.current) event.preventDefault();
  };
  return { onNodeClick };
}
