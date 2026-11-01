import Image from "next/image";

const stars = [
  [282, 174, 2.1, 0.2],
  [504, 328, 1.5, 1.4],
  [718, 142, 2.5, 2.2],
  [948, 382, 1.4, 0.7],
  [1186, 214, 2.1, 1.8],
  [1428, 408, 1.6, 2.8],
  [1684, 164, 2.6, 0.5],
  [1912, 332, 1.5, 2.1],
  [2152, 196, 2.2, 1.1],
  [2354, 414, 1.4, 2.6],
  [382, 558, 1.4, 1.7],
  [812, 612, 1.8, 0.3],
  [1264, 548, 1.3, 2.4],
  [1740, 634, 1.7, 1.5],
  [2230, 586, 1.4, 0.9],
] as const;

const embers = [
  [872, 1298, 1.8, 0.2, 2.1],
  [889, 1272, 1.3, 1.1, 2.6],
  [908, 1302, 1.4, 2, 1.9],
  [926, 1284, 1.1, 0.7, 2.8],
] as const;

const fireflies = [
  [684, 1178, 0.2],
  [1042, 1168, 1.6],
  [1160, 1250, 2.7],
  [560, 1304, 1.1],
] as const;

/** The supplied night-camp painting with a restrained animated overlay. */
export function ManagementScene() {
  return (
    <div className="management-scene" aria-hidden="true">
      <div className="management-scene-frame">
        <div className="management-scene-track">
          {/* The source Canvas already applies one uniform blur to the complete scene. */}
          <Image
            className="management-star-sky"
            src="/reference/everunfold-night-camp.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            unoptimized
          />
          <div className="management-scene-wash" />
          <svg
            className="management-motion-layer"
            viewBox="0 0 2560 1600"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <radialGradient id="management-fire-overlay">
                <stop offset="0" stopColor="#ffd285" stopOpacity="0.34" />
                <stop offset="0.3" stopColor="#ff9c43" stopOpacity="0.15" />
                <stop offset="1" stopColor="#df6a31" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g className="management-stars">
              {stars.map(([cx, cy, radius, delay], index) => (
                <circle
                  className="management-star"
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={index % 5 === 0 ? "#ffe4b5" : "#eef5ff"}
                  style={{
                    animationDelay: `${delay}s`,
                    animationDuration: `${2.7 + (index % 6) * 0.48}s`,
                  }}
                />
              ))}
            </g>

            <path
              className="management-shooting-star management-shooting-star-one"
              d="M1810 328 2016 252"
              fill="none"
              stroke="#eff7ff"
              strokeLinecap="round"
              strokeWidth="2.2"
            />

            <ellipse
              className="management-fire-glow"
              cx="900"
              cy="1348"
              rx="176"
              ry="102"
              fill="url(#management-fire-overlay)"
            />
            <g fill="#ffd78a">
              {embers.map(([cx, cy, radius, delay, duration]) => (
                <circle
                  className="management-fire-spark"
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  style={{
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                  }}
                />
              ))}
            </g>
            <g className="management-fireflies" fill="#ffd786">
              {fireflies.map(([cx, cy, delay]) => (
                <circle
                  className="management-firefly"
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r="2.2"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
