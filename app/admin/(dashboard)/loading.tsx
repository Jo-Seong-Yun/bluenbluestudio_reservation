import { LoadingOverlay } from "@/components/loading-overlay";

/**
 * 관리자 메뉴 사이를 이동할 때(다음 화면의 데이터를 불러오는 동안)
 * Next.js가 이 화면을 자동으로 보여준다. layout.tsx의 main이 이미
 * relative라 헤더는 그대로 두고 그 아래만 덮인다.
 */
export default function AdminLoading() {
  return <LoadingOverlay />;
}
