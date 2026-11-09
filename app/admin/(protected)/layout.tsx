import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import AdminLogoutButton from "./logout-button";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">CASA<span>STUDIO</span></Link>
        <span className="admin-sidebar-label">WORKSPACE</span>
        <nav className="admin-sidebar-nav" aria-label="Gestão de conteúdo">
          <Link href="/admin">Visão geral <b>↗</b></Link>
          <Link href="/admin/homepage">Homepage <b>↗</b></Link>
          <Link href="/admin/artista-do-mes/lista">Artista do mês <b>↗</b></Link>
          <Link href="/admin/destaques">Destaques <b>↗</b></Link>
          <Link href="/admin/artigos">Artigos <b>↗</b></Link>
          <Link href="/admin/destaques?section=interviews">Entrevistas <b>↗</b></Link>
          <Link href="/admin/votacoes">Votações <b>↗</b></Link>
          <Link href="/admin/publicidade">Publicidade <b>↗</b></Link>
          <Link href="/admin/sobre">Sobre <b>↗</b></Link>
        </nav>
        <Link href="/" className="admin-sidebar-public">← Abrir site CASA</Link>
      </aside>
      <div className="admin-main-column">
        <header className="admin-topbar">
          <span className="admin-breadcrumb">CASA <i>/</i> ADMINISTRAÇÃO</span>
          <div><span className="admin-user-email">{user.email}</span><AdminLogoutButton /></div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
