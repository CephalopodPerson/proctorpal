import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { TeacherDashboardClient } from "./_dashboardClient";

export default async function TeacherDashboard() {
  const sb = await getSupabaseServer();
  const [{ data: classes }, { data: tests }] = await Promise.all([
    sb.from("classes").select("id,name").order("created_at", { ascending: false }).limit(5),
    sb.from("tests").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  return (
    <TeacherDashboardClient
      classes={(classes as Array<{ id: string; name: string }>) ?? []}
      tests={(tests as Array<{ id: string; title: string; status: string }>) ?? []}
    />
  );
}
