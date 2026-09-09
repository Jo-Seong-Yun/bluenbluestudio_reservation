"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, Loader2 } from "lucide-react";
import { cropImageToBlob } from "@/lib/crop-image";
import { uploadProductImage } from "@/lib/storage-upload";
import { publicImageUrl } from "@/lib/images";

const MIN_WIDTH = 80;

/**
 * 에디터 안에 바로 들어가는 이미지. 선택하면(클릭) 위에 작은 툴바와
 * 모서리 손잡이가 뜬다 — 모서리를 끌면 크기, 툴바의 자르기 버튼을
 * 누르면 그 자리에서 바로 자를 수 있다. 위치 이동은 이미지를 마우스로
 * 끌어 문단 사이로 옮기는 것으로(브라우저 기본 드래그) 처리한다 —
 * 노드 자체가 draggable이라 별도 코드 없이 동작한다.
 *
 * src가 "blob:"로 시작하면 방금 골라서 아직 Storage 업로드 중인
 * 사진이라는 뜻이다(description-editor.tsx가 올리자마자 진짜 주소로
 * 바꿔치기한다) — 그동안 살짝 흐리게 보여준다.
 */
export function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);

  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string | null) ?? "";
  const width = node.attrs.width as number | null;
  const uploading = src.startsWith("blob:");

  function startResize(event: React.MouseEvent) {
    event.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const startX = event.clientX;
    // 저장된 폭(width 속성)이 있으면 그걸 기준으로 삼는다. 렌더링된
    // 크기(getBoundingClientRect)는 에디터 폭에 막혀 실제 값보다 작게
    // 보일 수 있어서, 그걸 기준으로 계산하면 늘리는 도중에 값이 도로
    // 줄어드는 것처럼 보이는 문제가 있었다.
    const startWidth = width ?? img.getBoundingClientRect().width;

    function onMove(moveEvent: MouseEvent) {
      const next = Math.max(
        MIN_WIDTH,
        Math.round(startWidth + (moveEvent.clientX - startX)),
      );
      updateAttributes({ width: next });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function toggleCrop() {
    if (!cropping && imgRef.current) {
      const { width: w, height: h } = imgRef.current.getBoundingClientRect();
      const initial = centerCrop(
        makeAspectCrop({ unit: "px", width: w * 0.9 }, w / h, w, h),
        w,
        h,
      );
      setCrop({ ...initial, unit: "px" });
    } else {
      setCrop(undefined);
    }
    setCropping((prev) => !prev);
  }

  async function applyCrop() {
    if (!imgRef.current || !crop || busy) return;
    setBusy(true);
    try {
      const blob = await cropImageToBlob(imgRef.current, crop, "image/jpeg");
      const path = await uploadProductImage(blob, "image.jpg");
      updateAttributes({ src: publicImageUrl(path), width: null });
      setCropping(false);
    } catch {
      // 실패해도 원래 이미지는 그대로 남는다 — 다시 시도할 수 있다.
    } finally {
      setBusy(false);
    }
  }

  return (
    <NodeViewWrapper className="my-2" data-drag-handle>
      <div
        className={`relative inline-block ${
          selected ? "outline-brand rounded-lg outline-2 outline-offset-2" : ""
        }`}
        style={{ width: width ? `${width}px` : undefined }}
      >
        {cropping ? (
          <ReactCrop crop={crop} onChange={(pixelCrop) => setCrop(pixelCrop)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              crossOrigin="anonymous"
              className="block max-w-full rounded-lg"
            />
          </ReactCrop>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            crossOrigin="anonymous"
            className="block max-w-full rounded-lg"
          />
        )}

        {uploading ? (
          <div className="bg-surface/70 absolute inset-0 flex items-center justify-center rounded-lg">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : null}

        {selected && !uploading ? (
          <div className="absolute -top-9 left-0 flex gap-1 rounded-md bg-neutral-900 p-1 shadow">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={toggleCrop}
              title="자르기"
              className={`flex h-6 w-6 items-center justify-center rounded text-white ${
                cropping ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              <CropIcon size={14} />
            </button>
            {cropping ? (
              <>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={applyCrop}
                  disabled={busy || !crop}
                  className="rounded px-2 text-xs text-white hover:bg-white/10 disabled:opacity-40"
                >
                  {busy ? "처리 중…" : "적용"}
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setCropping(false)}
                  className="rounded px-2 text-xs text-white hover:bg-white/10"
                >
                  취소
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {selected && !uploading && !cropping ? (
          <div
            onMouseDown={startResize}
            title="크기 조절"
            className="border-brand bg-surface absolute right-0 bottom-0 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full border-2"
          />
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}
