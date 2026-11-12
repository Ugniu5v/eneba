import Link from "next/link";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Eneba — home"
      className="group inline-flex shrink-0 items-center gap-2.5"
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:rotate-[12deg]"
      >
        <path
          d="M18.8 2.2c-7.7 0-14.1 5.8-14.1 13.1 0 3.4 1.4 6.5 3.9 8.9 2.2 2.1 5.3 3.4 9.3 3.4 7.7 0 14.1-5.8 14.1-13.1S26.6 2.2 18.8 2.2Z"
          fill="#F7D046"
          transform="rotate(-18 18.8 14.9)"
        />
        <path
          d="M28.8 13.1c-5.5-5.4-13.9-5.9-18.7-1.1-2.4 2.4-2.4 6.2.2 8.8 1.6 1.6 3.8 2.4 6.1 2.4 5.4 0 10.7-3.3 14.3-7.1-1.5-1.2-2.8-2.2-1.9-3Z"
          fill="#F26BB5"
          transform="rotate(10 19.5 17)"
        />
        <path
          d="M36.3 21.4c-3.7-3.6-9-5.5-14.1-4.8-3.3.5-5.2 2.6-4.9 5.4.2 2.2 2.4 3.8 5.1 4.1 5.4.6 10.9-2.8 14.8-5.5-.3.8-.6.9-.9.8Z"
          fill="#57D7C7"
          transform="rotate(-8 27 20)"
        />
        <path
          d="M23.3 37.8c5.1-1.5 9.2-5 11.8-9.4 1.5-2.6 1.1-5.4-.9-6.8-1.9-1.3-4.4-.7-6.1 1.5-2.8 3.6-3.8 8.9-4.8 14.7Z"
          fill="#8C64FF"
          transform="rotate(7 28 29)"
        />
        <circle cx="20.1" cy="21.1" r="3.5" fill="#FFF8F0" />
      </svg>
      <span
        className={`font-extrabold lowercase tracking-[-0.055em] ${
          footer ? "text-[28px]" : "text-[24px] sm:text-[26px]"
        }`}
      >
        eneba
      </span>
    </Link>
  );
}
