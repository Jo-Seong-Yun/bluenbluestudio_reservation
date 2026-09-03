import { z } from "zod";

/**
 * 상품 입력 검증.
 * 폼(클라이언트)과 서버 액션 양쪽에서 같은 규칙을 쓴다.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productSchema = z.object({
  name: z.string().trim().min(1, "상품 이름을 입력해주세요.").max(100),
  slug: z
    .string()
    .trim()
    .max(60)
    .refine((value) => value === "" || SLUG_PATTERN.test(value), {
      message: "주소는 영문 소문자, 숫자, 하이픈만 쓸 수 있어요. 예: profile",
    }),
  durationMin: z.coerce
    .number()
    .int("분 단위 정수로 입력해주세요.")
    .min(10, "촬영 시간은 10분 이상이어야 해요.")
    .max(720, "촬영 시간은 12시간을 넘을 수 없어요."),
  bufferAfterMin: z.coerce
    .number()
    .int()
    .min(0, "정리 시간은 0분 이상이어야 해요.")
    .max(240),
  price: z.coerce.number().int().min(0, "가격은 0원 이상이어야 해요."),
  maxPeople: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100)])
    .transform((value) => (value === "" ? null : value)),
  summary: z.string().trim().max(200).optional().default(""),
  description: z.string().max(20_000).optional().default(""),
  isPublished: z.coerce.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

/**
 * 이름에서 URL용 주소를 만든다.
 * 한글 이름은 영문으로 옮길 방법이 마땅치 않으므로, 남는 글자가 없으면
 * 무작위 문자열을 붙인다. 사장님이 직접 고칠 수도 있다.
 */
export function toSlug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (cleaned) return cleaned.slice(0, 60);
  return `p-${Math.random().toString(36).slice(2, 8)}`;
}
