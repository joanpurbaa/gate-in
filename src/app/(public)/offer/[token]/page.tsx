import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWaitingListStatus } from "@/lib/waiting-list/service";
import { OfferLandingClient } from "./OfferLandingClient";

export const dynamic = "force-dynamic";

export default async function OfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const entry = await getWaitingListStatus(token);

  if (!entry) {
    notFound();
  }

  // Jika calon pembeli masih dalam antrean biasa (belum ditawari), arahkan ke halaman status
  if (entry.status === "WAITING") {
    redirect(`/waiting-list/${token}`);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-20">
      <div className="mb-4">
        <Link
          href={`/e/${entry.eventSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Detail Acara {entry.eventName}</span>
        </Link>
      </div>

      <OfferLandingClient entry={entry} />
    </main>
  );
}
