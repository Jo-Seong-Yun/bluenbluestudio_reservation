"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui";
import { cropImageToBlob } from "@/lib/crop-image";

/**
 * 사진을 올리기 전에 간단히 자르고(안쪽을 끌어 위치 이동) 크기를
 * 조절(모서리를 끌어 영역 크기 변경)하는 모달.
 *
 * 대표 이미지·예시 사진·상세 설명 삽입 이미지가 전부 이 컴포넌트를
 * 같이 쓴다. 용도마다 원하는 비율이 달라 비율은 고정하지 않는다.
 * `file`이 있으면 열리고 null이면 닫힌다.
 */
export function ImageCropDialog({
  file,
  title = "사진 편집",
  onConfirm,
  onCancel,
}: {
  file: File | null;
  /** 여러 장을 순서대로 편집할 때 "사진 편집 (2/5)"처럼 진행 상황을 보여준다. */
  title?: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [working, setWorking] = useState(false);

  const imgSrc = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (imgSrc) URL.revokeObjectURL(imgSrc);
    };
  }, [imgSrc]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (file && !dialog.open) dialog.showModal();
    if (!file && dialog.open) dialog.close();
  }, [file]);

  function onImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget;
    const initial = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height),
      width,
      height,
    );
    setCrop(initial);
    setCompletedCrop({
      unit: "px",
      x: (initial.x / 100) * width,
      y: (initial.y / 100) * height,
      width: (initial.width / 100) * width,
      height: (initial.height / 100) * height,
    });
  }

  async function confirmCrop() {
    if (!imgRef.current || !completedCrop || !file || working) return;
    setWorking(true);
    try {
      const blob = await cropImageToBlob(
        imgRef.current,
        completedCrop,
        file.type || "image/jpeg",
      );
      onConfirm(blob);
    } finally {
      setWorking(false);
    }
  }

  function useOriginal() {
    if (!file) return;
    onConfirm(file);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onCancel={onCancel}
      className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-lg rounded-xl border p-0 backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
        <p className="font-bold">{title}</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="닫기"
          className="text-muted hover:text-foreground text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-5">
        {imgSrc ? (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt=""
              onLoad={onImageLoad}
              className="max-h-[55vh] w-full object-contain"
            />
          </ReactCrop>
        ) : null}
        <p className="text-muted mt-3 text-xs">
          안쪽을 끌면 위치가, 모서리를 끌면 크기가 바뀌어요.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-inherit px-5 py-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="button" variant="ghost" onClick={useOriginal}>
          원본 그대로
        </Button>
        <Button type="button" onClick={confirmCrop} disabled={working}>
          {working ? "처리 중…" : "이 크기로 사용"}
        </Button>
      </div>
    </dialog>
  );
}
