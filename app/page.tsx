import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20">
      <p className="text-accent text-sm font-medium tracking-widest uppercase">
        {SITE.nameEn}
      </p>

      <h1 className="mt-3 text-4xl leading-tight font-bold sm:text-5xl">
        {SITE.name}
      </h1>

      <p className="text-muted mt-6 max-w-xl text-lg leading-relaxed">
        {SITE.description}
      </p>

      <div className="mt-10">
        <Link
          href="/booking"
          className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center rounded-full px-6 py-3 text-base font-medium transition-colors"
        >
          예약하기
        </Link>
      </div>

      <div className="border-border mt-16 border-t pt-8">
        <p className="text-muted text-sm">
          예약이 어려우시면 인스타그램 DM으로도 문의해주세요.
        </p>
      </div>
    </main>
  );
}
