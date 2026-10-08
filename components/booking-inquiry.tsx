import { MessageCircle } from "lucide-react";
import { inquiryUrl } from "@/lib/booking/inquiry";
export function BookingInquiry({ href }: { href?: string | null }) {
  const url = inquiryUrl(href);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="booking-inquiry-floating"
      aria-label="문의하기 (새 창)"
    >
      <MessageCircle size={20} aria-hidden="true" />
      문의하기
    </a>
  );
}
