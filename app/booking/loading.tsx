import { LoadingOverlay } from "@/components/loading-overlay";

/**
 * 예약 화면 사이를 이동할 때(다음 화면의 데이터를 불러오는 동안)
 * Next.js가 이 화면을 자동으로 보여준다. app/admin/(dashboard)/
 * loading.tsx와 같은 방식.
 */
export default function BookingLoading() {
  return <LoadingOverlay />;
}
