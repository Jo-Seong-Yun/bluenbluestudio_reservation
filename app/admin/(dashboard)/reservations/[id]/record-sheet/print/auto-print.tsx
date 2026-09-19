"use client";

import { Button } from "@/components/ui";

export function AutoPrint() {
  return (
    <div className="print:hidden">
      <Button type="button" onClick={() => window.print()}>
        인쇄
      </Button>
    </div>
  );
}
