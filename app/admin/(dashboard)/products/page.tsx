import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, ErrorText } from "@/components/ui";
import { moveProduct, togglePublished } from "../../actions";

export const metadata: Metadata = { title: "상품관리" };

export default async function ProductsPage() {
  // 로그인 확인은 app/admin/(dashboard)/layout.tsx 가 이미 한다.
  // 여기서 또 하면 Supabase 인증 서버를 왕복 호출을 한 번 더 하게 되어
  // 화면마다 그만큼 느려진다.

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
          <h1 className="text-2xl font-bold">상품관리</h1>
          <p className="text-muted mt-1 text-sm">
            고객이 예약할 수 있는 촬영 상품 (순서는 예약화면의 순서와 동일함)
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
          <p>아직 상품이 없습니다.</p>
          <p className="mt-1 text-sm">
            &quot;상품 추가&quot;를 눌러 첫 촬영 상품을 만들어보세요.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {(products ?? []).map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            canMoveUp={index > 0}
            canMoveDown={index < (products?.length ?? 0) - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  canMoveUp,
  canMoveDown,
}: {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    duration_min: number;
    is_published: boolean;
  };
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="border-border bg-surface flex aspect-square flex-col rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        {product.is_published ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            공개 중
          </span>
        ) : (
          <span className="bg-surface-subtle text-muted rounded-full px-2 py-0.5 text-xs font-medium">
            비공개
          </span>
        )}

        <div className="flex flex-col gap-0.5">
          <MoveButton
            id={product.id}
            direction="up"
            disabled={!canMoveUp}
            label="위로"
          />
          <MoveButton
            id={product.id}
            direction="down"
            disabled={!canMoveDown}
            label="아래로"
          />
        </div>
      </div>

      <div className="mt-auto">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="text-muted mt-0.5 truncate text-sm">
          {product.duration_min}분 · {product.price.toLocaleString()}원
        </p>

        <div className="mt-3 flex gap-1.5">
          <Link href={`/admin/products/${product.id}`} className="flex-1">
            <Button variant="ghost" className="w-full">
              수정
            </Button>
          </Link>
          <form action={togglePublished} className="flex-1">
            <input type="hidden" name="id" value={product.id} />
            <input
              type="hidden"
              name="isPublished"
              value={String(!product.is_published)}
            />
            <Button variant="ghost" type="submit" className="w-full">
              {product.is_published ? "비공개로" : "공개하기"}
            </Button>
          </form>
        </div>
      </div>
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
