import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWaitingListStatus } from "@/lib/waiting-list/service";
import { WaitingListStatusClient } from "./WaitingListStatusClient";

export const dynamic = "force-dynamic";

export default async function WaitingListPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const entry = await getWaitingListStatus(token);

  if (!entry) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-20">
      <div className="mb-4">
        <Link
          href={`/e/${entry.eventSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke halaman acara {entry.eventName}</span>
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          Status Waiting List
        </h1>
        <p className="mt-0.5 text-xs text-muted">
          Pantau posisi antrean dan status penawaran tiket Anda secara berkala di halaman ini.
        </p>
      </div>

      <WaitingListStatusClient initialEntry={entry} />
    </main>
  );
}
