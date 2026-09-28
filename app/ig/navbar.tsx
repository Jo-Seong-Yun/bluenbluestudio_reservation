import { ChevronDown } from "lucide-react";

/** 로고 자리에 쓰는 별 모양(sunburst) 마크. */
function SunburstIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 0l2.4 8.1L21 3.5l-4.6 6.6L24 12l-7.6 2.4L21 20.5l-6.6-4.6L12 24l-2.4-8.1L3 20.5l4.6-6.6L0 12l7.6-2.4L3 3.5l6.6 4.6L12 0z" />
    </svg>
  );
}

const NAV_LINKS = ["Customer Stories", "Resources", "Pricing"];

export function Navbar() {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-6 py-4 bg-transparent">
      <div className="flex items-center">
        <SunburstIcon className="h-6 w-6 text-white" />
      </div>

      <div
        className="hidden items-center gap-8 md:flex font-[family-name:var(--font-instrument-sans)] text-sm font-medium"
      >
        <button
          type="button"
          className="flex items-center gap-1 text-white/80 transition-colors hover:text-white"
        >
          Products
          <ChevronDown className="h-4 w-4" />
        </button>
        {NAV_LINKS.map((label) => (
          <a
            key={label}
            href="#"
            className="text-white/80 transition-colors hover:text-white"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-4 font-[family-name:var(--font-instrument-sans)]">
        <a
          href="#"
          className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
        >
          Book A Demo
        </a>
        <a
          href="#"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
        >
          Get Started
        </a>
      </div>
    </nav>
  );
}
