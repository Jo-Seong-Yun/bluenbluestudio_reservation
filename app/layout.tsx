import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SITE } from "@/lib/site";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} 예약`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css" />
        {/* 서식 에디터의 글꼴 선택지(본고딕/나눔고딕/나눔명조)용 — 사이트
            기본 글꼴은 위 next/font/google(Noto_Sans_KR)로 최적화해서
            쓰지만, next/font는 실제 font-family 이름을 난독화해서
            내보내므로 에디터가 그대로 쓰는 문자열('Noto Sans KR' 등)과
            안 맞아 글꼴이 하나도 안 먹었다. 이 세 글꼴만은 리터럴 이름
            그대로 쓸 수 있게 구글 폰트를 직접 불러온다(상품 상세 설명·
            이메일 본문 모두 이 이름으로 저장되어 있어 손님 화면·이메일
            미리보기(iframe)에서도 필요). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {clarityId ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${clarityId}");
          `}</Script>
        ) : null}
      </body>
    </html>
  );
}
