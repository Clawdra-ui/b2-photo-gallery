export const dynamic = "force-dynamic";

import AdminShell from "@/components/admin/AdminShell";
import GalleryDashboard from "@/components/admin/GalleryDashboard";
import { requireAdminPage } from "@/lib/admin";
import { getAdminGalleryList } from "@/lib/gallery-service";

export default async function AdminGalleriesPage() {
  await requireAdminPage();
  const galleries = await getAdminGalleryList();

  return (
    <AdminShell active="galleries">
      <GalleryDashboard galleries={galleries} />
    </AdminShell>
  );
}
