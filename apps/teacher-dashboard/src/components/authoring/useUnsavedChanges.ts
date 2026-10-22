import { useEffect } from 'react';
/** Protect page closure and workspace links, while the parent guards tab/lesson buttons. */
export function useUnsavedChanges(
  dirty: boolean,
  onDirty: (value: boolean) => void,
) {
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest('a');
      if (
        !link ||
        !link.href ||
        link.hasAttribute('download') ||
        (link.target && link.target !== '_self')
      )
        return;
      const destination = new URL(link.href, window.location.href);
      const rawHref = link.getAttribute('href') ?? '';
      // HashRouter routes begin with #/. Ordinary page anchors keep this draft open.
      if (
        !['http:', 'https:'].includes(destination.protocol) ||
        destination.href === window.location.href ||
        (rawHref.startsWith('#') && !rawHref.startsWith('#/'))
      )
        return;
      if (
        !window.confirm('عندك تغييرات غير محفوظة. واش بغيتي تغادر بلا حفظ؟')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty]);
}
