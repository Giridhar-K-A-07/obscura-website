/*
  Primary navigation and the top-level routes behind it (Master Brief §8.1, §8.2).
  One list feeds the header, so navigation markup is never duplicated across pages.
  Labels are short; the full official feature names are the page titles.
*/

export interface NavItem {
  label: string;
  href: string;
}

export const primaryNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Legacy", href: "/legacy" },
  { label: "Events", href: "/events" },
  { label: "Achievements", href: "/achievements" },
  { label: "Projects", href: "/projects" },
  { label: "Learn", href: "/learn" },
  { label: "Insights", href: "/blog" },
];

/** Whether `href` is the current page, or a section the current path sits inside. */
export function isCurrent(href: string, pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}
