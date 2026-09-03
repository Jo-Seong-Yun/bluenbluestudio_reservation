import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { Button, ErrorText } from "@/components/ui";
import { moveProduct, togglePublished } from "../../actions";

export const metadata: Metadata = { title: "상품 관리" };

export default async function ProductsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, price, duration_min, is_published, sort_order")
    .order("sort_order")
    .order("created_at");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">상품 관리</h1>
          <p className="text-muted mt-1 text-sm">
            손님이 예약할 수 있는 촬영 상품이에요. 순서는 손님 화면에 보이는
            차례입니다.
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>상품 추가</Button>
        </Link>
      </div>

      {error ? (
        <ErrorText>불러오지 못했습니다: {error.message}</ErrorText>
      ) : null}

      {products && products.length === 0 ? (
        <div className="border-border text-muted rounded-xl border border-dashed px-6 py-16 text-center">
          <p>아직 상품이 없어요.</p>
          <p className="mt-1 text-sm">
            &quot;상품 추가&quot;를 눌러 첫 촬영 상품을 만들어보세요.
          </p>
        </div>
      ) : null}

      <ul className="space-y-2">
        {(products ?? []).map((product, index) => (
          <li
            key={product.id}
            className="border-border bg-surface flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <MoveButton
                id={product.id}
                direction="up"
                disabled={index === 0}
                label="위로"
              />
              <MoveButton
                id={product.id}
                direction="down"
                disabled={index === (products?.length ?? 0) - 1}
                label="아래로"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{product.name}</span>
                {product.is_published ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    공개 중
                  </span>
                ) : (
                  <span className="bg-surface-subtle text-muted rounded-full px-2 py-0.5 text-xs">
                    비공개
                  </span>
                )}
              </div>
              <p className="text-muted mt-0.5 text-sm">
                {product.duration_min}분 · {product.price.toLocaleString()}원 ·{" "}
                <span className="font-mono text-xs">/{product.slug}</span>
              </p>
            </div>

            <form action={togglePublished}>
              <input type="hidden" name="id" value={product.id} />
              <input
                type="hidden"
                name="isPublished"
                value={String(!product.is_published)}
              />
              <Button variant="ghost" type="submit">
                {product.is_published ? "비공개로" : "공개하기"}
              </Button>
            </form>

            <Link href={`/admin/products/${product.id}`}>
              <Button variant="ghost">수정</Button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MoveButton({
  id,
  direction,
  disabled,
  label,
}: {
  id: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveProduct}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="text-muted hover:bg-surface-subtle hover:text-foreground flex h-5 w-6 items-center justify-center rounded text-xs disabled:opacity-25 disabled:hover:bg-transparent"
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </form>
  );
}
