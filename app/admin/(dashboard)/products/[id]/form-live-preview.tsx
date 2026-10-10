"use client";
import { useEffect, useRef } from "react";
import type { FormPreviewData } from "@/app/admin/form-preview/preview-client";
/** A separate browsing context uses the real mobile viewport, without scrolling the editor. */
export function FormLivePreview({
  data,
  src = "/admin/form-preview",
  desktop = false,
}: {
  data: FormPreviewData;
  src?: string;
  desktop?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    function send() {
      frame.current?.contentWindow?.postMessage(
        { type: "booking-form-preview", payload: data },
        window.location.origin,
      );
    }
    function ready(event: MessageEvent) {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "booking-form-preview-ready"
      )
        send();
    }
    send();
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [data]);
  return (
    <div className="overflow-auto">
      <iframe
        ref={frame}
        title="고객 신청서 미리보기"
        src={src}
        className="h-[760px] rounded-2xl border bg-white"
        style={{
          width: desktop ? 1000 : 390,
          maxWidth: desktop ? undefined : "100%",
        }}
      />
    </div>
  );
}
