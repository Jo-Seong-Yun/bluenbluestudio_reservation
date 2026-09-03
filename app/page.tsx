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
        <span
          aria-disabled="true"
          className="border-border bg-surface text-muted inline-flex cursor-not-allowed items-center rounded-full border px-6 py-3 text-base font-medium"
        >
          예약 준비 중입니다
        </span>
      </div>

      <div className="border-border mt-16 border-t pt-8">
        <p className="text-muted text-sm">
          예약 문의는 인스타그램 DM으로 받고 있습니다. 온라인 예약은 곧
          열립니다.
        </p>
      </div>
    </main>
  );
}
