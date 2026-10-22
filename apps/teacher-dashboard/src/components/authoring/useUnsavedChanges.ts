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
      const link = (event.target as HTMLElement).closest('a');
      if (
        link &&
        link.target !== '_blank' &&
        link.href &&
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
