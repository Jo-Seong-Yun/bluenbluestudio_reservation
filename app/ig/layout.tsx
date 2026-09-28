import { Instrument_Sans, Instrument_Serif } from "next/font/google";

// 인스타그램 광고 랜딩페이지 전용 글꼴 — 본 사이트(Noto Sans KR)와는
// 완전히 다른 디자인 언어를 쓰는 별도 캠페인 페이지라 이 라우트
// 안에서만 CSS 변수로 물려준다.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export default function IgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${instrumentSans.variable} ${instrumentSerif.variable} bg-black`}>
      {children}
    </div>
  );
}
