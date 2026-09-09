import type { PixelCrop } from "react-image-crop";

/**
 * 화면에 보이는 <img> 크기 기준의 크롭 영역(PixelCrop)을 실제 원본
 * 해상도로 환산해 캔버스에 그린 뒤 잘라낸 결과를 Blob으로 돌려준다.
 */
export function cropImageToBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  mimeType: string,
): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));

  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("캔버스를 사용할 수 없습니다."));

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("이미지를 만들지 못했습니다."));
      },
      mimeType,
      0.92,
    );
  });
}
