import Image from "next/image";
import { ChevronDown } from "lucide-react";

const NAV_LINKS = ["Customer Stories", "Resources", "Pricing"];

export function Navbar() {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-6 py-4 bg-transparent">
      <div className="flex items-center">
        <Image
          src="/ig-logo-white.png"
          alt="푸르른 스튜디오"
          width={1054}
          height={542}
          priority
          className="h-8 w-auto"
        />
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
