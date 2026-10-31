/** Decorative perimeter feedback; the owning control supplies the accessible status. */
export function LoadingRing({
  active,
  progress,
}: {
  active: boolean;
  progress?: number;
}) {
  return (
    <svg
      className="ui-loading-ring"
      data-active={active}
      data-determinate={progress !== undefined}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="ui-loading-ring-track" cx="20" cy="20" r="18" />
      <circle
        className="ui-loading-ring-line"
        cx="20"
        cy="20"
        r="18"
        pathLength="100"
        style={
          progress === undefined
            ? undefined
            : {
                strokeDasharray: "100",
                strokeDashoffset:
                  100 * (1 - Math.min(1, Math.max(0, progress))),
              }
        }
      />
    </svg>
  );
}
