"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { reorderProducts, togglePublished } from "../../actions";
import { ProductTagPicker } from "./product-tag-picker";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_min: number;
  is_published: boolean;
  tag_color: string | null;
};

/**
 * 카드를 직접 끌어다 놓아 순서를 바꾼다. 라이브러리 없이 HTML5 드래그
 * 앤 드롭(draggable)만 쓴다 — 데스크톱 마우스 기준 상호작용이고,
 * 터치 기기의 손가락 드래그는 지원하지 않는다(모바일에서 상품
 * 순서를 바꿀 일은 드물다고 보고 범위를 좁혔다).
 *
 * 드래그 중에는 지나가는 칸 위치로 목록을 바로 옮겨 보여주고(낙관적),
 * 손을 뗄 때 한 번만 서버에 저장한다 — 매 순간 저장하면 카드 수만큼
 * 요청이 겹쳐 쌓인다.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  const [items, setItems] = useState(products);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 새로 받은 products가 이전과 다르면(서버에서 다시 불러온 값) 그걸로
  // 맞춘다. 렌더링 중 조건부로 setState하는 이 방식은 useEffect로
  // 동기화하는 것보다 리액트가 권장하는 패턴이다 — 커밋 전에 다시
  // 렌더링해 화면 깜빡임(중간 상태가 잠깐 보이는 것)이 없다.
  const [prevProducts, setPrevProducts] = useState(products);
  if (products !== prevProducts) {
    setPrevProducts(products);
    setItems(products);
  }

  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  // 카드 하나당 한 번만 자리를 바꾸고, 커서가 그 카드를 벗어났다가
  // 다시 들어와야 또 한 번 바꾸도록 막는다 — 이게 없으면 카드 경계
  // 근처에서 자리가 계속 왔다갔다 튕겨서 지나치게 예민하게 느껴진다.
  const lastOverId = useRef<string | null>(null);

  function handleDragStart(e: React.DragEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest("a,button,input")) {
      e.preventDefault();
      return;
    }
    setDragId(id);
    lastOverId.current = null;
    e.dataTransfer.effectAllowed = "move";
  }

  // dragover 대상 판정을 카드 각각의 이벤트가 아니라 그리드 전체에서
  // 한 번에 한다. 카드별 dragover/dragleave에 맡기면 브라우저가 어떤
  // 카드 위에 커서가 있는지 헷갈려하며 leave/over를 반복 발생시켜
  // 자리가 튕기는 원인이 됐다 — 대신 각 카드의 레이아웃 상 위치
  // (offsetLeft 등)를 직접 비교해 판정하면 안정적이다.
  function handleGridDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!dragId || !gridRef.current) return;

    const containerRect = gridRef.current.getBoundingClientRect();
    const pointerX = e.clientX - containerRect.left;
    const pointerY = e.clientY - containerRect.top;

    let targetId: string | null = null;
    for (const [id, el] of cardRefs.current) {
      if (id === dragId) continue;
      const left = el.offsetLeft;
      const top = el.offsetTop;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      // 커서가 카드 가운데 쪽 절반 안에 들어왔을 때만 그 카드를
      // 대상으로 본다 — 가장자리를 살짝 스치는 정도로는 반응하지 않는다.
      const withinX =
        pointerX > left + width * 0.25 && pointerX < left + width * 0.75;
      const withinY =
        pointerY > top + height * 0.25 && pointerY < top + height * 0.75;
      if (withinX && withinY) {
        targetId = id;
        break;
      }
    }

    if (!targetId) {
      lastOverId.current = null;
      return;
    }
    if (targetId === lastOverId.current) return;
    lastOverId.current = targetId;

    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === targetId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleDragEnd() {
    setDragId(null);
    lastOverId.current = null;
    startTransition(async () => {
      await reorderProducts(items.map((p) => p.id));
    });
  }

  return (
    <div
      ref={gridRef}
      onDragOver={handleGridDragOver}
      onDrop={(e) => e.preventDefault()}
      className="relative grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {items.map((product) => (
        <div
          key={product.id}
          ref={(el) => {
            if (!el) return;
            cardRefs.current.set(product.id, el);
            return () => {
              cardRefs.current.delete(product.id);
            };
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, product.id)}
          onDragEnd={handleDragEnd}
          className={`cursor-grab active:cursor-grabbing ${
            dragId === product.id ? "opacity-40" : ""
          }`}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border-border bg-surface flex aspect-square flex-col rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        {product.is_published ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            공개 중
          </span>
        ) : (
          <span className="bg-surface-subtle text-muted rounded-full px-2 py-0.5 text-xs font-medium">
            비공개
          </span>
        )}
        <span
          aria-hidden
          className="text-muted/40 select-none"
          title="끌어서 순서 바꾸기"
        >
          ⠿
        </span>
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
