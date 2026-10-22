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
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
/** Exact supplied Latin wordmark; preserve its raised plus and original spacing. */
export function Wordmark({
  size = 34,
  tone = 'dark',
  subtitle,
}: {
  size?: number;
  tone?: 'dark' | 'light';
  subtitle?: string;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-2">
      <img
        src={
          tone === 'light' ? '/brand/wordmark-white.png' : '/brand/wordmark.png'
        }
        alt="oustadi plus"
        className="max-w-full object-contain"
        style={{ width: size * 4.7, height: size * 1.2 }}
      />
      {subtitle ? (
        <span
          className={`text-xs font-semibold ${tone === 'light' ? 'text-white/75' : 'text-muted'}`}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
