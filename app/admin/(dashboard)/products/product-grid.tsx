"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { togglePublished } from "../../actions";
import { ProductTagPicker } from "./product-tag-picker";
import { ProductMenu } from "./product-menu";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_min: number;
  is_published: boolean;
  tag_color: string | null;
};

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/**
 * 공개 여부는 서버 응답을 기다리지 않고 뱃지·버튼 문구부터 먼저
 * 바꾼다(useOptimistic) — 스케줄 화면의 주간 캘린더(components/
 * week-grid.tsx)와 같은 방식. 실제 저장은 뒤에서 이뤄지고, 실패하면
 * 다음 렌더링에서 원래 값으로 되돌아간다.
 */
function ProductCard({ product }: { product: Product }) {
  const [, startTransition] = useTransition();
  const [isPublished, setOptimisticPublished] = useOptimistic(
    product.is_published,
    (_state: boolean, next: boolean) => next,
  );

  function toggle() {
    startTransition(async () => {
      setOptimisticPublished(!isPublished);
      const formData = new FormData();
      formData.set("id", product.id);
      formData.set("isPublished", String(!isPublished));
      await togglePublished(formData);
    });
  }

  return (
    <div className="border-border bg-surface flex aspect-square flex-col rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        {isPublished ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            공개 중
          </span>
        ) : (
          <span className="bg-surface-subtle text-muted rounded-full px-2 py-0.5 text-xs font-medium">
            비공개
          </span>
        )}
        <ProductMenu productId={product.id} productName={product.name} />
      </div>

      <div className="mt-auto">
        <div className="flex items-center gap-1.5">
          <ProductTagPicker
            productId={product.id}
            tagColor={product.tag_color}
          />
          <span className="truncate font-semibold">{product.name}</span>
        </div>
        <p className="text-muted mt-0.5 truncate text-sm">
          {product.duration_min}분 · {product.price.toLocaleString()}원
        </p>

        <div className="mt-3 flex gap-1.5">
          <Link href={`/admin/products/${product.id}`} className="flex-1">
            <Button variant="ghost" className="w-full">
              수정
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={toggle}
          >
            {isPublished ? "비공개로" : "공개하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
