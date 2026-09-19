"use client";

import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { saveRecordSheetTemplate } from "@/app/admin/actions";
import {
  DEFAULT_RECORD_SHEET_ROWS,
  FIXED_TAG_CATALOG,
  RECORD_SHEET_ROW_TYPE_LABELS,
  makeOptionTag,
  newRowId,
  type RecordSheetRow,
  type RecordSheetRowType,
} from "@/lib/record-sheet/schema";

/**
 * 촬영 기록표(예약 상세의 "기록표 생성"이 여는 인쇄용 서식)의
 * 항목·순서를 관리자가 직접 편집하는 화면. 행 하나하나가 인쇄
 * 미리보기의 표 한 줄과 그대로 대응한다(resolve.ts가 이 행 구성과
 * 예약 데이터를 합쳐 화면에 그린다) — 여기서 순서를 바꾸거나 항목을
 * 추가/삭제하면 다음에 여는 인쇄 미리보기부터 바로 반영된다.
 */
export function RecordSheetTemplateSection({
  initialRows,
  optionLabels,
}: {
  initialRows: RecordSheetRow[];
  optionLabels: string[];
}) {
  const [rows, setRows] = useState<RecordSheetRow[]>(initialRows);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  function updateRow(index: number, patch: Record<string, unknown>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? ({ ...r, ...patch } as RecordSheetRow) : r)),
    );
    setJustSaved(false);
  }

  function addRow(type: RecordSheetRowType) {
    let row: RecordSheetRow;
    if (type === "title" || type === "section") {
      row = { id: newRowId(), type, text: "" };
    } else if (type === "spacer") {
      row = { id: newRowId(), type: "spacer" };
    } else if (type === "note") {
      row = { id: newRowId(), type: "note", text: "", align: "left" };
    } else {
      row = { id: newRowId(), type: "field", label: "", tag: FIXED_TAG_CATALOG[0].key };
    }
    setRows((prev) => [...prev, row]);
    setJustSaved(false);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setJustSaved(false);
  }

  function moveRow(index: number, dir: -1 | 1) {
    setRows((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setJustSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveRecordSheetTemplate(rows);
      if (result.error) setError(result.error);
      else setJustSaved(true);
    });
  }

  function resetToDefault() {
    setRows(DEFAULT_RECORD_SHEET_ROWS);
    setJustSaved(false);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-bold">촬영 기록표 양식</h2>
        <p className="text-muted mt-1 text-xs">
          예약 상세의 &quot;기록표 생성&quot;으로 여는 인쇄용 서식의 항목과
          순서를 직접 편집합니다. 값 칸은 예약 정보(성명, 옵션 등)로
          자동으로 채워집니다.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <RowEditor
            key={row.id}
            row={row}
            index={index}
            total={rows.length}
            optionLabels={optionLabels}
            onChange={(patch) => updateRow(index, patch)}
            onRemove={() => removeRow(index)}
            onMoveUp={() => moveRow(index, -1)}
            onMoveDown={() => moveRow(index, 1)}
          />
        ))}
        {rows.length === 0 ? (
          <p className="text-muted text-sm">행이 없습니다. 아래에서 추가해 주시기 바랍니다.</p>
        ) : null}
      </div>

      <AddRowBar onAdd={addRow} />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "저장 중…" : justSaved ? "저장됨" : "양식 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={resetToDefault}>
          기본 양식으로 되돌리기
        </Button>
      </div>
    </section>
  );
}

function AddRowBar({ onAdd }: { onAdd: (type: RecordSheetRowType) => void }) {
  const [type, setType] = useState<RecordSheetRowType>("field");
  return (
    <div className="border-border flex items-center gap-2 border-t pt-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as RecordSheetRowType)}
        className={`${inputClass} w-auto`}
      >
        {(Object.keys(RECORD_SHEET_ROW_TYPE_LABELS) as RecordSheetRowType[]).map(
          (t) => (
            <option key={t} value={t}>
              {RECORD_SHEET_ROW_TYPE_LABELS[t]}
            </option>
          ),
        )}
      </select>
      <Button type="button" variant="ghost" onClick={() => onAdd(type)}>
        + 행 추가
      </Button>
    </div>
  );
}

function TagSelect({
  value,
  onChange,
  optionLabels,
  allowEmpty,
}: {
  value: string;
  onChange: (tag: string) => void;
  optionLabels: string[];
  allowEmpty?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} w-auto min-w-0`}
    >
      {allowEmpty ? <option value="">(없음)</option> : null}
      <optgroup label="기본 항목">
        {FIXED_TAG_CATALOG.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </optgroup>
      {optionLabels.length > 0 ? (
        <optgroup label="내가 만든 옵션">
          {optionLabels.map((label) => (
            <option key={label} value={makeOptionTag(label)}>
              {label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

function RowEditor({
  row,
  index,
  total,
  optionLabels,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  row: RecordSheetRow;
  index: number;
  total: number;
  optionLabels: string[];
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="border-border bg-surface-subtle rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted text-xs font-medium">
          {RECORD_SHEET_ROW_TYPE_LABELS[row.type]}
        </span>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="위로 이동"
            className="text-muted hover:text-foreground disabled:opacity-25"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="아래로 이동"
            className="text-muted hover:text-foreground disabled:opacity-25"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="행 삭제"
            className="text-muted hover:text-foreground"
          >
            ×
          </button>
        </div>
      </div>

      {row.type === "title" || row.type === "section" ? (
        <input
          value={row.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="문구"
          className={inputClass}
        />
      ) : null}

      {row.type === "spacer" ? (
        <p className="text-muted text-xs">빈 줄 하나를 넣습니다.</p>
      ) : null}

      {row.type === "note" ? (
        <div className="space-y-2">
          <textarea
            value={row.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="안내 문구. {계좌}처럼 쓰면 실제 값으로 바뀝니다."
            rows={2}
            className={inputClass}
          />
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={row.align === "center"}
                onChange={(e) =>
                  onChange({ align: e.target.checked ? "center" : "left" })
                }
              />
              가운데 정렬
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={Boolean(row.small)}
                onChange={(e) => onChange({ small: e.target.checked })}
              />
              작은 글씨
            </label>
          </div>
        </div>
      ) : null}

      {row.type === "field" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={row.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="라벨"
              className={`${inputClass} min-w-0`}
            />
            <input
              value={row.sublabel ?? ""}
              onChange={(e) =>
                onChange({ sublabel: e.target.value || undefined })
              }
              placeholder="보조 설명 (선택)"
              className={`${inputClass} min-w-0`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted w-10 shrink-0 text-xs">값</span>
            <TagSelect
              value={row.tag}
              onChange={(tag) => onChange({ tag })}
              optionLabels={optionLabels}
            />
            <input
              value={row.prefix ?? ""}
              onChange={(e) =>
                onChange({ prefix: e.target.value || undefined })
              }
              placeholder="앞에 붙일 글자(₩ 등)"
              className={`${inputClass} w-32`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted w-10 shrink-0 text-xs">값2</span>
            <TagSelect
              value={row.tag2 ?? ""}
              onChange={(tag) => onChange({ tag2: tag || undefined })}
              optionLabels={optionLabels}
              allowEmpty
            />
            <input
              value={row.prefix2 ?? ""}
              onChange={(e) =>
                onChange({ prefix2: e.target.value || undefined })
              }
              placeholder="앞에 붙일 글자(₩ 등)"
              className={`${inputClass} w-32`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <span>뒤에 붙일 글자</span>
              <input
                value={row.suffix ?? ""}
                onChange={(e) =>
                  onChange({ suffix: e.target.value || undefined })
                }
                placeholder="이내 등"
                className={`${inputClass} w-24`}
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span>정렬</span>
              <select
                value={row.align ?? "center"}
                onChange={(e) => onChange({ align: e.target.value })}
                className={`${inputClass} w-auto`}
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={Boolean(row.wideLabel)}
                onChange={(e) => onChange({ wideLabel: e.target.checked })}
              />
              라벨을 넓게(값은 좁게)
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
