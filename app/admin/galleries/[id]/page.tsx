export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import GalleryManager from "@/components/admin/GalleryManager";
import { requireAdminPage } from "@/lib/admin";
import { getAdminGalleryById } from "@/lib/gallery-service";

export default async function GalleryManagePage(
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdminPage();
  const { id } = await params;
  const gallery = await getAdminGalleryById(id);

  if (!gallery) {
    notFound();
  }

  return (
    <AdminShell active="galleries">
      <GalleryManager gallery={gallery} />
    </AdminShell>
  );
}
