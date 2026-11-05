const rupiah = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Format bilangan bulat Rupiah, contoh `Rp150.000`. */
export function formatRupiah(amount: number): string {
  return `Rp${rupiah.format(Math.round(amount))}`;
}

/** Rentang harga untuk kartu event, contoh `Rp75.000 – Rp150.000`. */
export function formatPriceRange(prices: number[]): string {
  if (prices.length === 0) return "-";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatRupiah(min) : `${formatRupiah(min)} – ${formatRupiah(max)}`;
}
