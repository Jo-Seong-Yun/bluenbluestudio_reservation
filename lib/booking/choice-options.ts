/** 빈 보기 제거 시 이름·가격·설명의 짝을 함께 보존합니다. */
export function parseChoiceOptions(formData: FormData) {
  const labels = formData.getAll("option").map((value) => String(value).trim());
  const prices = formData
    .getAll("optionPrice")
    .map((value) => String(value).trim());
  const descriptions = formData
    .getAll("optionDescription")
    .map((value) => String(value).trim().slice(0, 1000));
  const rows = labels
    .map((label, i) => ({
      label,
      price: prices[i] ?? "",
      description: descriptions[i] ?? "",
    }))
    .filter((row) => row.label);
  return {
    options: rows.map((row) => row.label),
    option_prices: rows.some((row) => row.price !== "")
      ? rows.map((row) => Math.max(0, Math.round(Number(row.price) || 0)))
      : null,
    option_descriptions: rows.some((row) => row.description)
      ? rows.map((row) => row.description)
      : null,
  };
}
