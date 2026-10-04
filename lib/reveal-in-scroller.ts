const FIXED_HEADER_CLEARANCE = 96;
const EDGE_GAP = 8;

function findScrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    const scrolls = overflowY === "auto" || overflowY === "scroll";
    if (scrolls && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

export function revealInScroller(element: HTMLElement): void {
  const scroller = findScrollParent(element);
  const bounds = scroller?.getBoundingClientRect();
  const visibleTop = bounds ? bounds.top : FIXED_HEADER_CLEARANCE;
  const visibleBottom = bounds ? bounds.bottom : window.innerHeight;
  const rect = element.getBoundingClientRect();
  if (rect.bottom <= visibleBottom) return;

  const toShowBottom = rect.bottom - visibleBottom + EDGE_GAP;
  const toAlignTop = rect.top - visibleTop - EDGE_GAP;
  const distance = Math.min(toShowBottom, toAlignTop);
  if (distance <= 0) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  (scroller ?? window).scrollBy({ top: distance, behavior: reduceMotion ? "auto" : "smooth" });
}
