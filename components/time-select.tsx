/**
 * 영업시간(요일별 기본 운영시간, 날짜 단위 휴무/특별 운영시간)에 쓰는
 * 시간 선택. 브라우저 기본 <input type="time">은 좁은 칸에 "오전
 * 10:0" 처럼 글자가 잘리고, 눌렀을 때 나오는 휠 선택기도 시/분을 따로
 * 굴려야 해서 불편하다는 피드백이 있었다 — 30분 단위로 미리 만들어 둔
 * 목록에서 고르는 select로 바꿨다. 값 형식("HH:MM", 24시간제)은
 * 그대로라 서버 액션 쪽은 손댈 필요가 없다.
 */
function formatTimeLabel(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${String(m).padStart(2, "0")}`;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const value = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
    totalMinutes % 60,
  ).padStart(2, "0")}`;
  return { value, label: formatTimeLabel(value) };
});

export function TimeSelect({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  // 기존 값이 30분 단위가 아니면(예전에 직접 입력해 둔 값) 목록에
  // 없다고 조용히 첫 옵션으로 바뀌어버리지 않도록, 그 값도 옵션에
  // 끼워 넣는다.
  const options =
    defaultValue && !TIME_OPTIONS.some((opt) => opt.value === defaultValue)
      ? [
          ...TIME_OPTIONS,
          { value: defaultValue, label: formatTimeLabel(defaultValue) },
        ].sort((a, b) => a.value.localeCompare(b.value))
      : TIME_OPTIONS;

  return (
    <select name={name} defaultValue={defaultValue} className={className}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
