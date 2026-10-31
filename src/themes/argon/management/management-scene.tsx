const starGlints = [
  [84, 104, 1.7, 0.1],
  [182, 72, 1.2, 1.8],
  [286, 186, 2.2, 0.7],
  [398, 92, 1.3, 2.5],
  [516, 228, 1.6, 1.4],
  [632, 64, 1.2, 0.4],
  [748, 174, 2.4, 2.8],
  [864, 106, 1.3, 1.1],
  [982, 250, 1.8, 2.1],
  [1094, 78, 1.2, 0.6],
  [1218, 190, 2.1, 1.6],
  [1326, 112, 1.4, 2.4],
  [1452, 250, 1.7, 0.9],
  [1540, 84, 1.2, 1.9],
  [124, 372, 1.3, 2.3],
  [346, 326, 1.1, 0.5],
  [578, 408, 1.8, 1.7],
  [804, 338, 1.2, 2.6],
  [1046, 420, 1.6, 0.2],
  [1284, 348, 1.1, 1.3],
  [1490, 444, 1.4, 2.2],
] as const;

const fireflies = [
  [94, 676, 0.2],
  [158, 730, 1.5],
  [468, 704, 2.3],
  [523, 748, 0.8],
  [724, 838, 1.9],
  [1116, 758, 0.5],
  [1298, 824, 1.2],
] as const;

const embers = [
  [300, 704, 2.2, 0.2, 2.1],
  [326, 678, 1.5, 1.2, 2.5],
  [350, 712, 1.9, 2.1, 1.8],
  [378, 686, 1.3, 0.8, 2.8],
  [398, 718, 1.7, 1.7, 2.2],
  [416, 676, 1.1, 2.5, 2.6],
] as const;

/** High-density sky photography plus an original animated vector campsite. */
export function ManagementScene() {
  return (
    <div className="management-scene" aria-hidden="true">
      <div className="management-star-sky" />
      <div className="management-scene-wash" />
      <svg
        className="management-landscape"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMinYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="management-ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#37394f" />
            <stop offset="1" stopColor="#242638" />
          </linearGradient>
          <linearGradient id="management-ridge-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#282b3d" />
            <stop offset="1" stopColor="#171a28" />
          </linearGradient>
          <linearGradient id="management-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#242333" />
            <stop offset="0.5" stopColor="#151720" />
            <stop offset="1" stopColor="#090d12" />
          </linearGradient>
          <radialGradient id="management-fire-glow">
            <stop offset="0" stopColor="#ffd48a" stopOpacity="0.95" />
            <stop offset="0.2" stopColor="#ff9e44" stopOpacity="0.62" />
            <stop offset="0.54" stopColor="#e65931" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ce4828" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="management-flame-outer"
            x1="0"
            y1="1"
            x2="0"
            y2="0"
          >
            <stop offset="0" stopColor="#c83b29" />
            <stop offset="0.5" stopColor="#f56a2d" />
            <stop offset="1" stopColor="#ffd668" />
          </linearGradient>
          <linearGradient id="management-flame-mid" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f58a2e" />
            <stop offset="0.56" stopColor="#ffc14f" />
            <stop offset="1" stopColor="#fff1a1" />
          </linearGradient>
          <linearGradient
            id="management-flame-core"
            x1="0"
            y1="1"
            x2="0"
            y2="0"
          >
            <stop offset="0" stopColor="#ffc452" />
            <stop offset="1" stopColor="#fff9cf" />
          </linearGradient>
          <filter
            id="management-soft-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter
            id="management-fire-blur"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>

        <g className="management-star-glints">
          {starGlints.map(([cx, cy, radius, delay], index) => (
            <circle
              className="management-star"
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={radius}
              fill={index % 6 === 0 ? "#ffe4b4" : "#fff"}
              style={{
                animationDelay: `${delay}s`,
                animationDuration: `${2.8 + (index % 5) * 0.55}s`,
              }}
            />
          ))}
        </g>

        <g className="management-shooting-stars">
          <path
            className="management-shooting-star management-shooting-star-one"
            d="M1130 164 1260 118"
            fill="none"
            stroke="#fff9e9"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            className="management-shooting-star management-shooting-star-two"
            d="M382 322 478 288"
            fill="none"
            stroke="#dce8ff"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </g>

        <path
          className="management-ridge-far"
          d="M0 682 126 574l103 70 129-139 126 124 102-68 163 119 146-130 149 123 143-92 126 84 147-136V1000H0Z"
          fill="url(#management-ridge-far)"
        />
        <path
          className="management-ridge-mid"
          d="M0 744c109-66 203-69 293-24 94 47 183 42 281-17 124-75 224-72 327-10 116 70 214 69 322 7 105-60 214-62 377 8v292H0Z"
          fill="url(#management-ridge-mid)"
        />
        <path
          d="M0 810c284-40 544-34 784 14 250 50 514 54 816-17v193H0Z"
          fill="url(#management-ground)"
        />

        <g className="management-forest" fill="#0e121a">
          <path d="m47 809 20-89 21 89H74l18 49H43l18-49Z" />
          <path d="m105 826 16-70 17 70h-11l13 37h-39l13-37Z" />
          <path d="m171 799 24-107 25 107h-16l20 59h-56l20-59Z" />
          <path d="m236 822 15-67 16 67h-11l12 36h-37l13-36Z" />
          <path d="m437 815 19-85 20 85h-13l16 45h-45l16-45Z" />
          <path d="m490 844 13-58 14 58h-10l11 31h-31l11-31Z" />
          <path d="m1358 804 23-101 23 101H1389l18 53h-52l18-53Z" />
          <path d="m1418 835 15-66 16 66h-11l12 35h-36l13-35Z" />
          <path d="m1484 812 20-88 21 88h-14l17 49h-47l17-49Z" />
        </g>

        <g className="management-tent">
          <path d="M55 846 191 626 326 846Z" fill="#1b1c2b" />
          <path d="M191 626 326 846H191Z" fill="#11141e" />
          <path d="M191 626 109 846H191Z" fill="#302b3c" fillOpacity="0.78" />
          <path d="m191 710 45 136h-90Z" fill="#472d2a" fillOpacity="0.72" />
          <path
            d="M191 626v220M72 828h237"
            fill="none"
            stroke="#706282"
            strokeOpacity="0.32"
            strokeWidth="2"
          />
          <path
            d="M75 835h19M286 835h19"
            stroke="#8c7586"
            strokeLinecap="round"
            strokeOpacity="0.46"
            strokeWidth="3"
          />
        </g>

        <g className="management-log-seat">
          <rect
            x="42"
            y="856"
            width="134"
            height="27"
            rx="13"
            fill="#544032"
            transform="rotate(-8 42 856)"
          />
          <path
            d="M59 857c21 4 68 3 103-3"
            fill="none"
            stroke="#8d6c4c"
            strokeOpacity="0.52"
            strokeWidth="3"
          />
        </g>

        <ellipse
          className="management-fire-glow"
          cx="354"
          cy="786"
          rx="254"
          ry="216"
          fill="url(#management-fire-glow)"
        />
        <ellipse
          cx="354"
          cy="859"
          rx="143"
          ry="34"
          fill="#080b11"
          fillOpacity="0.68"
        />

        <g className="management-campfire">
          <g fill="#5d5b63">
            <ellipse
              cx="251"
              cy="850"
              rx="23"
              ry="12"
              transform="rotate(-15 251 850)"
            />
            <ellipse
              cx="287"
              cy="868"
              rx="27"
              ry="13"
              transform="rotate(8 287 868)"
            />
            <ellipse
              cx="423"
              cy="865"
              rx="29"
              ry="13"
              transform="rotate(-7 423 865)"
            />
            <ellipse
              cx="457"
              cy="845"
              rx="22"
              ry="11"
              transform="rotate(15 457 845)"
            />
          </g>
          <g fill="#634331">
            <rect
              x="281"
              y="831"
              width="138"
              height="17"
              rx="8"
              transform="rotate(24 281 831)"
            />
            <rect
              x="282"
              y="832"
              width="139"
              height="17"
              rx="8"
              transform="rotate(-24 282 832)"
            />
          </g>
          <g className="management-fire">
            <path
              className="management-fire-flame management-fire-flame-outer"
              d="M354 824c-73-1-78-56-56-97 7 34 27 40 31 17 5-39-18-69-10-112 40 27 63 65 59 102 17-20 24-44 20-72 40 43 54 91 27 129-13 19-35 31-71 33Z"
              fill="url(#management-flame-outer)"
            />
            <path
              className="management-fire-flame management-fire-flame-inner"
              d="M353 823c-41 0-53-28-45-57 11 23 27 17 27-4 0-23-11-39-4-62 21 22 32 43 28 66 12-10 19-25 18-42 22 27 28 55 10 78-8 11-18 18-34 21Z"
              fill="url(#management-flame-core)"
            />
            <path
              className="management-fire-flame management-fire-flame-tip"
              d="M352 750c-14 20-10 38 1 52 13-17 18-33-1-52Z"
              fill="url(#management-flame-mid)"
            />
            <g fill="#ffd481">
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
          </g>
        </g>

        <g
          className="management-smoke"
          fill="none"
          stroke="#d3c8d5"
          strokeLinecap="round"
        >
          <path
            d="M353 704c-39-40 12-62-1-99-12-34-49-43-31-88"
            strokeOpacity="0.13"
            strokeWidth="20"
          />
          <path
            d="M371 697c28-37-6-61 11-94 14-28 45-34 34-71"
            strokeOpacity="0.08"
            strokeWidth="14"
          />
        </g>

        <g className="management-fireflies" fill="#ffd786">
          {fireflies.map(([cx, cy, delay]) => (
            <circle
              className="management-firefly"
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="2"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </g>

        <g
          fill="none"
          stroke="#77857f"
          strokeLinecap="round"
          strokeOpacity="0.34"
        >
          <path d="M18 918c36-18 62-20 100-9" strokeWidth="3" />
          <path d="M43 929c25-9 44-10 69-3" strokeWidth="2" />
          <path d="M500 912c36-18 62-20 100-9" strokeWidth="3" />
          <path d="M1085 938c42-21 73-23 117-10" strokeWidth="3" />
          <path d="M1240 952c31-12 58-13 89-5" strokeWidth="2" />
          <path d="M1460 922c23-11 45-12 67-4" strokeWidth="2" />
        </g>

        <circle
          cx="353"
          cy="728"
          r="12"
          fill="#ffb95a"
          fillOpacity="0.16"
          filter="url(#management-soft-glow)"
        />
      </svg>
    </div>
  );
}
