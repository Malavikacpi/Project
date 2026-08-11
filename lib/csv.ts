export function downloadCsv(entries: Array<[string, string]>) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const content = [["Field", "Response"], ...entries]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `distribution-system-questionnaire-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
