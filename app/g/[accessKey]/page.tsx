export const dynamic = "force-dynamic";

import PublicGalleryClient from "@/components/public/PublicGalleryClient";
import { isAdminAuthenticated } from "@/lib/admin";
import { getPublicGalleryByAccessKey } from "@/lib/gallery-service";

function StatusPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="public-status">
      <div className="public-status-card">
        <span className="eyebrow">Client Gallery</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </main>
  );
}

export default async function PublicGalleryPage(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ accessKey: string }>;
    searchParams: Promise<{ preview?: string }>;
  }
) {
  const { accessKey } = await params;
  const { preview } = await searchParams;
  const previewMode = preview === "1" && await isAdminAuthenticated();
  const result = await getPublicGalleryByAccessKey(accessKey, { previewMode });

  if (result.kind === "not-found") {
    return (
      <StatusPage
        title="Gallery not found"
        description="This private gallery link is invalid or no longer available."
      />
    );
  }

  if (result.kind === "expired") {
    return (
      <StatusPage
        title="Gallery expired"
        description="This gallery has expired. Contact the photographer if you still need access."
      />
    );
  }

  return <PublicGalleryClient gallery={result.gallery!} />;
}
