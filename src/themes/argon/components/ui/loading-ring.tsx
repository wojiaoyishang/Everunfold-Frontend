/** Decorative perimeter feedback; the owning control supplies the accessible status. */
export function LoadingRing({ active }: { active: boolean }) {
  return (
    <svg
      className="ui-loading-ring"
      data-active={active}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="ui-loading-ring-track" cx="20" cy="20" r="18" />
      <circle className="ui-loading-ring-line" cx="20" cy="20" r="18" />
    </svg>
  );
}
