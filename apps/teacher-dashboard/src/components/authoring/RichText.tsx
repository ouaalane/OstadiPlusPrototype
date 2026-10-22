import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import type { ReactNode } from 'react';
export function RichText({ text }: { text: string }) {
  useI18n();
  if (!text.trim())
    return <p className="text-sm text-muted">{t('لا نص بعد.')}</p>;
  const lines = text.split('\n');
  return (
    <div dir="auto" className="space-y-2 text-sm leading-7 text-body">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        if (trimmed.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{inlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <p
              key={index}
              className="border-s-3 border-brand bg-brand-softer/60 px-3 py-1.5 text-muted"
            >
              {inlineMarkdown(trimmed.slice(2))}
            </p>
          );
        }
        return <p key={index}>{inlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

/** Renders **bold** and *italic* spans. */
function inlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
