// Formatting shared by server and browser code (no server imports here).

// 1234 -> "1.2K", 89400000000 -> "89.4B"
export function formatCount(count: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}
