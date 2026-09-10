import {
  PendingOverlay,
  PendingOverlayProvider,
} from "@/components/pending-overlay";

/**
 * 관리자 화면(app/admin/(dashboard)/layout.tsx)과 같은 "처리 중" 오버레이를
 * 손님 예약 화면에도 그대로 적용한다. 손님 화면엔 고정 헤더가 없어서
 * 덮을 영역만 다르다 — 화면 전체(=이 relative 컨테이너)를 덮는다.
 */
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PendingOverlayProvider>
      <div className="relative flex flex-1 flex-col">
        {children}
        <PendingOverlay />
      </div>
    </PendingOverlayProvider>
  );
}
