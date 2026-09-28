"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const VIDEO_SRC =
  "https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8";
const POSTER_SRC =
  "https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080";

/** HLS.js로 mux 스트림을 재생하는 배경 영상 — Safari는 네이티브 HLS를 지원해 별도 처리한다. */
function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(VIDEO_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = VIDEO_SRC;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      poster={POSTER_SRC}
      className="absolute inset-0 h-full w-full object-cover opacity-60"
    />
  );
}

export function Hero({ bookingHref }: { bookingHref: string }) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#000000] text-white">
      <HeroVideo />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div
        className="pointer-events-none absolute top-[-20%] left-[20%] h-[600px] w-[600px] rounded-full bg-blue-500/40 blur-[120px] mix-blend-screen"
      />
      <div
        className="pointer-events-none absolute right-[20%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/40 blur-[120px] mix-blend-screen"
      />

      <div className="relative z-10 mx-auto mt-20 flex max-w-5xl flex-col items-center space-y-12 px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-[family-name:var(--font-noto-serif-kr)] text-3xl leading-[1.1] text-white sm:text-5xl lg:text-[48px]"
        >
          모든 배우의 푸르른 연기생활을 위해
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          role="img"
          aria-label="푸르른 스튜디오"
          className="aspect-[1054/542] w-[220px] bg-gradient-to-b from-white via-white to-[#b4c0ff] sm:w-[360px] lg:w-[560px]"
          style={{
            WebkitMaskImage: "url(/ig-logo-white.png)",
            maskImage: "url(/ig-logo-white.png)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="max-w-xl font-[family-name:var(--font-noto-sans-kr)] text-lg leading-[1.65] text-white sm:text-[20px]"
        >
          독백·그룹 연기영상 전문 스튜디오
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col items-center gap-6 sm:flex-row"
        >
          <a
            href={bookingHref}
            className="group flex items-center gap-3 rounded-full bg-white py-2 pr-2 pl-6 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            <span
              className="font-[family-name:var(--font-noto-sans-kr)] text-lg font-medium"
              style={{ color: "#0a0400" }}
            >
              독백 연기영상 촬영신청
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3054ff] transition-colors group-hover:bg-[#2040e0]">
              <ArrowRight className="h-5 w-5 text-white" />
            </span>
          </a>

          <a
            href={bookingHref}
            className="group flex items-center gap-2 rounded-lg px-4 py-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="font-[family-name:var(--font-noto-sans-kr)]">
              촬영문의
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
