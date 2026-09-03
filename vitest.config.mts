import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 시간 계산 테스트가 서버(UTC) 환경을 가정하도록 고정한다.
    // 로컬이 KST라서 통과하고 Vercel(UTC)에서 깨지는 상황을 막는다.
    env: { TZ: "UTC" },
    include: ["lib/**/*.test.ts"],
  },
});
