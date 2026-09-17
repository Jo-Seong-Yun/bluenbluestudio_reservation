import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20">
      <div className="animate-fade-up flex items-center gap-2">
        <span className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full" />
        <p className="text-accent text-sm font-medium tracking-widest uppercase">
          {SITE.nameEn}
        </p>
      </div>

      <h1 className="animate-fade-up animate-fade-up-1 mt-3 text-4xl leading-tight font-black tracking-tight sm:text-6xl">
        {SITE.name}
      </h1>

      <p className="text-muted animate-fade-up animate-fade-up-2 mt-6 max-w-xl text-lg leading-relaxed">
        {SITE.description}
      </p>

      <div className="animate-fade-up animate-fade-up-3 mt-10">
        <Link
          href="/booking"
          className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center rounded-full px-6 py-3 text-base font-medium transition-colors"
        >
          예약하기
        </Link>
      </div>
    </main>
  );
}
