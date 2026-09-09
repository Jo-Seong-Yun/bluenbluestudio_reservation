"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
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

  function handleDragStart(e: React.DragEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest("a,button,input")) {
      e.preventDefault();
      return;
    }
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === overId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleDragEnd() {
    setDragId(null);
    startTransition(async () => {
      await reorderProducts(items.map((p) => p.id));
    });
  }

  // FLIP 애니메이션: 순서가 바뀌면 그리드는 이미 새 자리로 즉시
  // 재배치돼 있다(브라우저 레이아웃 특성상 순간적으로 튄다). 여기서는
  // 각 카드를 "이전 위치"만큼 반대로 밀어둔 뒤, 다음 프레임에 그 이동을
  // 되돌리는 트랜지션을 걸어서 실제로는 이전 자리에서 새 자리로
  // 부드럽게 미끄러지듯 보이게 만든다.
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => {
      nextRects.set(id, el.getBoundingClientRect());
    });

    cardRefs.current.forEach((el, id) => {
      const prev = prevRects.current.get(id);
      const next = nextRects.get(id);
      if (!prev || !next) return;

      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (dx === 0 && dy === 0) return;

      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.getBoundingClientRect(); // 강제 리플로우로 위 스타일을 먼저 적용시킨다.
      requestAnimationFrame(() => {
        el.style.transition = "transform 220ms cubic-bezier(0.2, 0, 0, 1)";
        el.style.transform = "";
      });
    });

    prevRects.current = nextRects;
  }, [items]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          onDragOver={(e) => handleDragOver(e, product.id)}
          onDrop={(e) => e.preventDefault()}
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
