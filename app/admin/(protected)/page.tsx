import Link from "next/link";

const sections = [
  { number: "01", title: "HOMEPAGE", description: "Ordenar e ocultar secções; escolher artigos e entrevistas.", href: "/admin/homepage", accent: "#90c9ff", label: "GERIR HOMEPAGE", icon: "⌂" },
  { number: "02", title: "ARTISTA DO MÊS", description: "Seleção mensal, biografia e imagem dos artistas CASA.", href: "/admin/artista-do-mes/lista", accent: "#d7ff43", label: "GERIR ARTISTAS", icon: "✳" },
  { number: "03", title: "DESTAQUES", description: "Cards editoriais e conteúdos da homepage.", href: "/admin/destaques", accent: "#b98bff", label: "GERIR DESTAQUES", icon: "↗" },
  { number: "04", title: "ARTIGOS", description: "Reportagens, ideias e histórias da música.", href: "/admin/artigos", accent: "#ff8068", label: "GERIR ARTIGOS", icon: "▤" },
  { number: "05", title: "ENTREVISTAS", description: "Conversas e perfis com artistas e profissionais.", href: "/admin/destaques?section=interviews", accent: "#7ed6bd", label: "GERIR ENTREVISTAS", icon: "◉" },
  { number: "06", title: "VOTAÇÕES", description: "Link da poll e publicação dos três vencedores.", href: "/admin/votacoes", accent: "#ffdc56", label: "GERIR VOTAÇÕES", icon: "✦" },
  { number: "07", title: "PUBLICIDADE", description: "Incorporar anúncios aprovados e controlar a publicação global.", href: "/admin/publicidade", accent: "#ff8068", label: "GERIR PUBLICIDADE", icon: "▣" },
  { number: "08", title: "SOBRE & CONTACTO", description: "Identidade CASA, formulário de contacto e apoio ao projeto.", href: "/admin/sobre", accent: "#7ed6bd", label: "GERIR SOBRE", icon: "◎" },
];

export default function AdminDashboardPage() {
  return <main className="admin-page admin-dashboard">
    <section className="admin-dashboard-hero">
      <div><span className="admin-eyebrow">CASA · ÁREA DE ADMINISTRAÇÃO</span><h1>Dashboard<span>.</span></h1><p>O espaço de trabalho da equipa editorial.</p></div>
      <div className="admin-hero-mark" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
      <span className="admin-hero-stamp">CONTEÚDO<br/>COM IDENTIDADE</span>
    </section>
    <div className="admin-dashboard-intro"><div><span className="admin-eyebrow">WORKSPACE / 2026</span><h2>O que vamos<br/>publicar hoje?</h2></div><p>Escolhe uma secção para editar o conteúdo que chega à comunidade CASA.</p></div>
    <section className="admin-section-grid" aria-label="Secções do CMS">
      {sections.map((section) => <Link key={section.number} href={section.href} className="admin-section-card" style={{ "--section-accent": section.accent } as React.CSSProperties}>
        <div className="admin-card-top"><span>{section.number} / SECÇÃO</span><i>{section.icon}</i></div>
        <div><h3>{section.title}</h3><p>{section.description}</p></div>
        <div className="admin-card-bottom"><span>{section.label}</span><b>↗</b></div>
      </Link>)}
    </section>
    <footer className="admin-dashboard-footer"><span>CASA STUDIO</span><span>CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS</span><span>© 2026</span></footer>
  </main>;
}
