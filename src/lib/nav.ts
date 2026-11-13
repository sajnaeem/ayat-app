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

/** Shows the feed (Home tab), closing any screens opened on top: used after choosing a place to read. */
export function showFeed(router: { canDismiss: () => boolean; dismissAll: () => void; navigate: (href: '/') => void }) {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}
