import { PublicHeader } from "@/components/ui/PublicHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-stone-200/80 bg-white py-5 text-center text-xs text-stone-500">
        <div className="mx-auto max-w-5xl px-4">
          GateIn • Sistem E-Ticketing & Pemilihan Kursi • Bandung Build Challenge 2026 (Summarecon
          Mall Bandung)
        </div>
      </footer>
    </div>
  );
}
