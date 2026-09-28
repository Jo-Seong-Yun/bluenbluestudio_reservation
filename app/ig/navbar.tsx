import Image from "next/image";

export function Navbar() {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center px-6 py-4 bg-transparent">
      <Image
        src="/ig-logo-white.png"
        alt="푸르른 스튜디오"
        width={1054}
        height={542}
        priority
        className="h-8 w-auto"
      />
    </nav>
  );
}
