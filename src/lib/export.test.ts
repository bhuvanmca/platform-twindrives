import { describe, expect, it, vi } from "vitest";
import { downloadCsv } from "@/lib/export";

// downloadCsv builds the file and hands it to the browser in one go, so the
// only way to see what it produced is to intercept the Blob.
function captureCsv(
  columns: { key: string; label: string }[],
  rows: Record<string, unknown>[]
): string {
  let captured = "";
  const anchor = { href: "", download: "", click: vi.fn() };

  vi.stubGlobal(
    "Blob",
    class {
      constructor(parts: string[]) {
        captured = parts.join("");
      }
    }
  );
  vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });
  vi.stubGlobal("document", {
    createElement: () => anchor,
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  });

  downloadCsv("report", columns, rows);
  vi.unstubAllGlobals();
  return captured;
}

describe("downloadCsv", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "amount", label: "Amount" },
  ];

  it("writes a header row followed by one line per record", () => {
    const csv = captureCsv(columns, [
      { name: "Kongu", amount: 1200 },
      { name: "Anna", amount: 900 },
    ]);
    expect(csv.split("\n")).toEqual(["Name,Amount", "Kongu,1200", "Anna,900"]);
  });

  it("quotes cells containing a comma, quote or newline", () => {
    const csv = captureCsv(columns, [
      { name: "Kongu, Erode", amount: 'say "hi"' },
      { name: "line\nbreak", amount: 1 },
    ]);
    const [, first, second] = csv.split("\n");
    expect(first).toBe('"Kongu, Erode","say ""hi"""');
    // The embedded newline stays inside its quoted cell.
    expect(second).toBe('"line');
    expect(csv).toContain('"line\nbreak",1');
  });

  it("renders null and undefined as empty cells rather than the words", () => {
    const csv = captureCsv(columns, [{ name: null, amount: undefined }]);
    expect(csv.split("\n")[1]).toBe(",");
  });

  it("emits only the requested columns, in order", () => {
    const csv = captureCsv(
      [
        { key: "amount", label: "Amount" },
        { key: "name", label: "Name" },
      ],
      [{ name: "Kongu", amount: 5, secret: "hidden" }]
    );
    expect(csv).toBe("Amount,Name\n5,Kongu");
    expect(csv).not.toContain("hidden");
  });
});
