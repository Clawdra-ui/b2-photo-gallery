export const dynamic = "force-dynamic";

import AdminShell from "@/components/admin/AdminShell";
import CreateGalleryForm from "@/components/admin/CreateGalleryForm";
import { requireAdminPage } from "@/lib/admin";

export default async function NewGalleryPage() {
  await requireAdminPage();

  return (
    <AdminShell active="new">
      <CreateGalleryForm />
    </AdminShell>
  );
}
