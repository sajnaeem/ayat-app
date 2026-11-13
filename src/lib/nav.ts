/** Lets the "Go to" screen move an open page view to another page. */
type Fn = (page: number) => void;
const listeners = new Set<Fn>();

export function onPageJump(fn: Fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function jumpToPage(page: number) {
  listeners.forEach((fn) => fn(page));
}
