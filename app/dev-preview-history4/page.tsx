import { ReservationHistoryTable } from "../admin/(dashboard)/reservation-history/reservation-history-table";

const rows = [
  {
    id: "r1",
    code: "BNB-0001",
    status: "requested",
    shootStart: "2026-10-05T10:00:00+09:00",
    customerName: "김민지",
    customerPhone: "010-1234-5678",
    chargedAmount: null,
    estimatedAmount: 150000,
    productName: "가족사진 촬영",
    productTagColor: "sage",
    createdAt: "2026-09-20T09:00:00+09:00",
    deliverableSent: false,
  },
  {
    id: "r4",
    code: "BNB-0004",
    status: "payment_confirmed",
    shootStart: "2026-10-07T10:00:00+09:00",
    customerName: "최유진",
    customerPhone: "010-4444-5555",
    chargedAmount: 150000,
    estimatedAmount: 150000,
    productName: "가족사진 촬영",
    productTagColor: "sage",
    createdAt: "2026-09-22T09:00:00+09:00",
    deliverableSent: false,
  },
  {
    id: "r5",
    code: "BNB-0005",
    status: "completed",
    shootStart: "2026-09-27T14:00:00+09:00",
    customerName: "정하늘",
    customerPhone: "010-5555-6666",
    chargedAmount: 150000,
    estimatedAmount: 150000,
    productName: "독백 연기영상 아주 긴 상품명 테스트",
    productTagColor: "grape",
    createdAt: "2026-09-10T09:00:00+09:00",
    deliverableSent: false,
  },
  {
    id: "r7",
    code: "BNB-0007",
    status: "no_show",
    shootStart: "2026-09-15T14:00:00+09:00",
    customerName: "오지호",
    customerPhone: "010-7777-8888",
    chargedAmount: null,
    estimatedAmount: 90000,
    productName: "커플사진 촬영",
    productTagColor: "flamingo",
    createdAt: "2026-09-01T09:00:00+09:00",
    deliverableSent: false,
  },
  {
    id: "r9",
    code: "BNB-0009",
    status: "cancelled",
    shootStart: "2026-09-16T14:00:00+09:00",
    customerName: "레거시고객",
    customerPhone: "010-9999-0000",
    chargedAmount: null,
    estimatedAmount: 90000,
    productName: "옛날상품(태그없음)",
    productTagColor: null,
    createdAt: "2026-08-30T09:00:00+09:00",
    deliverableSent: false,
  },
];

export default function DevPreviewHistory4Page() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">예약내역 (미리보기 v4)</h1>
      <div className="mt-4">
        <ReservationHistoryTable rows={rows} />
      </div>
    </div>
  );
}
