import type { CSSProperties } from "react";
import { celebrationFireworksStyles } from "./celebration-fireworks-styles";

/** A finite, non-interactive celebration; callers own the success state. */
export function CelebrationFireworks({ active = false }: { active?: boolean }) {
  return (
    <div className="ui-fireworks" data-active={active} aria-hidden="true">
      <style>{celebrationFireworksStyles}</style>
      {[0, 1, 2].map((burst) => (
        <span className="ui-fireworks-burst" key={burst}>
          {Array.from({ length: 14 }, (_, index) => {
            const angle = (index / 14) * Math.PI * 2 + burst * 0.15;
            return (
              <span
                className="ui-fireworks-spark"
                key={index}
                style={
                  {
                    "--spark-x": Math.cos(angle).toFixed(3),
                    "--spark-y": Math.sin(angle).toFixed(3),
                    "--spark-scale": index % 2 ? 0.75 : 1,
                  } as CSSProperties
                }
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}
