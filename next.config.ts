import type { NextConfig } from "next";

/**
 * GitHub Pages 미리보기용 정적 빌드 스위치.
 *
 * `STATIC_EXPORT=1` 일 때만 정적 export로 전환한다.
 * 평소 개발과 Vercel 배포는 이 분기를 타지 않는다.
 *
 * ⚠️ 임시 설정이다. Phase 2~3에서 Supabase 연동과 서버 측 슬롯 계산이
 * 들어가면 정적 export로는 동작하지 않는다. 그때 이 분기와
 * `.github/workflows/pages.yml`을 함께 지우고 Vercel만 남긴다.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        // Pages는 https://<user>.github.io/<repo>/ 하위에서 서빙된다
        basePath: "/bluenbluestudio_reservation",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
