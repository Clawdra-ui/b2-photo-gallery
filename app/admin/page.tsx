export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/admin";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin/galleries");
  }

  return <AdminLoginForm />;
}
