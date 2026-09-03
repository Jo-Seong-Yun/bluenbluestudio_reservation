"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, PRODUCT_IMAGE_BUCKET } from "@/lib/images";
import { ErrorText } from "@/components/ui";

/**
 * 상품 이미지 업로드.
 *
 * 브라우저에서 Supabase Storage로 바로 올린다. 파일이 서버를 거치지 않아
 * 빠르고, 업로드 권한은 Storage RLS(로그인한 사용자만 쓰기)가 지킨다.
 *
 * DB에는 공개 URL이 아니라 파일 경로만 저장한다. 나중에 도메인이나
 * 프로젝트가 바뀌어도 저장된 값이 그대로 쓸 수 있다.
 */
export function ImageUploader({
  label,
  hint,
  value,
  onChange,
  max,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = max !== undefined && value.length >= max;

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        if (max !== undefined && value.length + uploaded.length >= max) break;

        // 파일명에 한글이나 공백이 있으면 Storage 경로에서 문제가 되므로
        // 확장자만 남기고 새 이름을 만든다.
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { cacheControl: "31536000", upsert: false });

        if (uploadError) throw uploadError;
        uploaded.push(path);
      }

      onChange([...value, ...uploaded]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `올리지 못했습니다: ${cause.message}`
          : "올리지 못했습니다.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      {hint ? <p className="text-muted mb-2 text-xs">{hint}</p> : null}

      {value.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((path) => (
            <li key={path} className="relative">
              {/* Storage 이미지는 크기를 미리 알 수 없어 next/image 대신 img를 쓴다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicImageUrl(path)}
                alt=""
                className="border-border h-24 w-24 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== path))}
                aria-label="이미지 빼기"
                className="border-border bg-surface absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs shadow-sm"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!atLimit ? (
        // 실제 버튼 대신 label을 버튼처럼 꾸민다. label 안에 button을 넣으면
        // 클릭이 파일 선택창으로 이어지지 않는다.
        <label
          className={`border-border bg-surface hover:bg-surface-subtle inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            uploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple={max !== 1}
            disabled={uploading}
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = "";
            }}
            className="hidden"
          />
          {uploading ? "올리는 중…" : "사진 고르기"}
        </label>
      ) : null}

      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>
    </div>
  );
}
