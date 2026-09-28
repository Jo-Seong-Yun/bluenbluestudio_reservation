import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

// 인스타그램 광고 랜딩페이지 전용 글꼴 — 카피가 한글로 바뀌면서 라틴
// 전용이던 Instrument Sans/Serif 대신 한글을 지원하는 Noto Sans/Serif
// KR로 바꿨다. 이 라우트 안에서만 CSS 변수로 물려준다.
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

export default function IgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${notoSansKR.variable} ${notoSerifKR.variable} bg-black`}>
      {children}
    </div>
  );
}
