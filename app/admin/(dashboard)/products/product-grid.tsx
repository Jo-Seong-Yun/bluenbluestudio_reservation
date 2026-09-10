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
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100/50 border border-gray-300 rounded-none">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-12 gap-0 border-b-2 border-gray-900 bg-gray-100 text-gray-900 font-black uppercase text-xs tracking-widest">
        <div className="col-span-1 px-4 py-3 text-center">ID</div>
        <div className="col-span-4 px-4 py-3">상품명</div>
        <div className="col-span-2 px-4 py-3 text-right">가격 KRW</div>
        <div className="col-span-1 px-4 py-3 text-center">시간</div>
        <div className="col-span-2 px-4 py-3 text-center">상태</div>
        <div className="col-span-2 px-4 py-3 text-center">작업</div>
      </div>

      {/* 테이블 바디 */}
      <div className="divide-y divide-gray-300">
        {products.map((product, idx) => (
          <ProductRow key={product.id} product={product} index={idx} />
        ))}
      </div>

      {/* 빈 상태 */}
      {products.length === 0 && (
        <div className="flex items-center justify-center px-4 py-24 text-center">
          <div>
            <p className="text-4xl font-black text-gray-400 mb-2">∅</p>
            <p className="text-gray-700 font-semibold uppercase tracking-wider text-sm">
              상품 데이터 없음
            </p>
            <p className="text-gray-600 text-xs mt-1 font-mono">
              [NEW PRODUCT] 버튼으로 첫 상품을 추가해주세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({ product, index }: { product: Product; index: number }) {
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

  const rowNum = String(index + 1).padStart(3, "0");

  return (
    <div
      className="group grid grid-cols-12 gap-0 border-gray-300 bg-white transition-all duration-200 hover:bg-gray-50 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] items-center"
    >
      {/* ID */}
      <div className="col-span-1 px-4 py-4 font-mono text-xs text-gray-500 font-bold">
        [{rowNum}]
      </div>

      {/* 상품명 + 태그 */}
      <div className="col-span-4 px-4 py-4 space-y-1 border-l border-gray-300">
        <div className="flex items-center gap-2">
          <ProductTagPicker
            productId={product.id}
            tagColor={product.tag_color}
          />
          <span className="font-semibold text-gray-900 truncate text-sm">
            {product.name}
          </span>
        </div>
        <p className="text-xs text-gray-600 font-mono">/slug/{product.slug}</p>
      </div>

      {/* 가격 */}
      <div className="col-span-2 px-4 py-4 border-l border-gray-300 text-right">
        <span className="font-mono font-bold text-gray-900 text-sm">
          {product.price.toLocaleString()}
        </span>
      </div>

      {/* 시간 */}
      <div className="col-span-1 px-4 py-4 border-l border-gray-300 text-center">
        <span className="font-mono font-semibold text-gray-700 text-sm">
          {product.duration_min}m
        </span>
      </div>

      {/* 상태 */}
      <div className="col-span-2 px-4 py-4 border-l border-gray-300 text-center">
        {isPublished ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 border border-green-900">
            <div className="w-2 h-2 bg-green-900 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-green-900">
              LIVE
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 border border-gray-900">
            <div className="w-2 h-2 bg-gray-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              DRAFT
            </span>
          </div>
        )}
      </div>

      {/* 작업 */}
      <div className="col-span-2 px-4 py-4 border-l border-gray-300 flex items-center justify-center gap-2">
        <Link href={`/admin/products/${product.id}`}>
          <button className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-700 border border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-200">
            EDIT
          </button>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-700 border border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-200"
        >
          {isPublished ? "OFF" : "ON"}
        </button>
        <ProductMenu productId={product.id} productName={product.name} />
      </div>
    </div>
  );
}
