export function DiscoveryArt() {
  return (
    <div className="discovery-art">
      <svg
        viewBox="0 0 540 390"
        role="img"
        aria-label="An open notebook surrounded by ideas, a pencil, and a friendly star"
      >
        <defs>
          <pattern id="dots" width="19" height="19" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#75958a" opacity=".24" />
          </pattern>
          <linearGradient id="bookPage" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fffef7" />
            <stop offset="1" stopColor="#f1eee4" />
          </linearGradient>
        </defs>
        <circle cx="288" cy="205" r="157" fill="#dbe9d8" />
        <circle cx="288" cy="205" r="156" fill="url(#dots)" />
        <ellipse
          cx="276"
          cy="211"
          rx="222"
          ry="108"
          transform="rotate(-23 276 211)"
          fill="none"
          stroke="#9aafa0"
          strokeWidth="1.4"
          strokeDasharray="5 8"
        />
        <path
          d="M98 310c71 42 249 52 339 12"
          fill="none"
          stroke="#b9ccbb"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g transform="translate(111 177) rotate(-9 150 70)">
          <path
            d="M0 9q76-23 151 8Q229-15 307 6l-8 140q-76-17-147 8Q79 130 7 150Z"
            fill="#536750"
            stroke="#536750"
            strokeWidth="10"
            strokeLinejoin="round"
          />
          <path
            d="M0 0q76-23 151 8Q229-24 307-3l-8 140q-76-17-147 8Q79 121 7 141Z"
            fill="url(#bookPage)"
            stroke="#263d32"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <path d="M151 8v137" stroke="#c7cabb" strokeWidth="2" />
          <path
            d="M25 27q49-11 99 4M27 46q49-11 96 4M28 65q43-10 75-1M29 104q47-9 92 4"
            stroke="#c6c9bc"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <rect
            x="184"
            y="27"
            width="79"
            height="58"
            rx="8"
            transform="rotate(-2 184 27)"
            fill="#e3ddf1"
          />
          <path
            d="m199 59 13 13 29-30"
            stroke="#77649c"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M182 104q43-11 90-3M183 119q34-8 69-3"
            stroke="#c6c9bc"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path d="m124 7-2 48 12-9 11 11 2-51" fill="#e7a38c" />
        </g>
        <g className="art-star" transform="translate(339 45) rotate(12 49 47)">
          <path
            d="m49 0 16 24 28-1-9 28 10 24-29 1-17 24-15-25-28-1 10-25L6 24l28 1Z"
            fill="#dfdd83"
            stroke="#394a36"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <ellipse cx="38" cy="45" rx="3" ry="5" fill="#354434" />
          <ellipse cx="60" cy="45" rx="3" ry="5" fill="#354434" />
          <path
            d="M41 58q8 8 16-1"
            fill="none"
            stroke="#354434"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(77 78) rotate(-18 35 35)">
          <rect width="67" height="67" rx="20" fill="#d3c6e8" stroke="#75638e" strokeWidth="2" />
          <path
            d="M23 22h24v24H23Z"
            fill="none"
            stroke="#75638e"
            strokeWidth="2.7"
            strokeLinejoin="round"
          />
          <path
            d="m23 22 12-9 24 1-12 8M47 22l12-8v23l-12 9M35 13v9"
            fill="none"
            stroke="#75638e"
            strokeWidth="2.7"
            strokeLinejoin="round"
          />
        </g>
        <g transform="translate(432 186) rotate(26)">
          <path
            d="M0 0h19v107L9 131 0 107Z"
            fill="#eeb29a"
            stroke="#755647"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M0 101h19M10 1v98" stroke="#bb785c" strokeWidth="2" />
          <path d="m3 111 7 18 6-18" fill="#e9d9b8" />
          <path d="m7 122 3 7 3-7" fill="#435442" />
          <path d="M0 0v-12q10-8 19 0V0Z" fill="#e0d6be" stroke="#755647" strokeWidth="2" />
        </g>
        <path d="m219 61 5 11 12 1-9 9 2 12-11-6-11 5 3-12-9-9 12-1Z" fill="#e8af90" />
        <path
          d="m466 95 2 10m-7-5 12 1M95 229l3 12m-8-5 12-1M355 340l3 12m-8-6 13-1"
          stroke="#6d8473"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="162" cy="52" r="4" fill="#82987d" />
        <circle cx="463" cy="292" r="5" fill="#b9a7d4" />
      </svg>
      <span className="art-note note-top">A mind full of possibilities.</span>
      <span className="art-note note-bottom">
        <span className="tiny-spark">✦</span> There’s more than one way to learn.
      </span>
    </div>
  );
}
