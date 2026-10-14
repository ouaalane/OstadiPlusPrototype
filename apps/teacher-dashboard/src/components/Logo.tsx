export function LogoMark({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({
  size = 34,
  tone = 'dark',
  subtitle,
}: {
  size?: number;
  tone?: 'dark' | 'light';
  subtitle?: string;
}) {
  const color = tone === 'light' ? '#FFFFFF' : 'var(--color-ink)';
  const subColor = tone === 'light' ? 'rgba(255,255,255,0.75)' : 'var(--color-muted)';
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className="truncate font-bold"
          style={{
            color,
            fontSize: size * 0.5,
            letterSpacing: '-0.01em',
            fontFamily: 'var(--font-num)',
          }}
          dir="ltr"
        >
          OstadiPlus
        </span>
        {subtitle ? (
          <span className="mt-1 truncate text-[11px] font-semibold" style={{ color: subColor }}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
