import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin";

export default async function HomePage() {
  redirect(await isAdminAuthenticated() ? "/admin/galleries" : "/admin");
}
