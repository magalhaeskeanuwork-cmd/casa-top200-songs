"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Ad = { id: string; title: string; advertiser: string; embed_url: string; target_url: string; page_scope: string; sort_order: number };

function pageScope(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/sobre") return "sobre";
  if (pathname.startsWith("/artigos")) return "artigos";
  if (pathname.startsWith("/destaques")) return "destaques";
  if (pathname.startsWith("/charts") || pathname.startsWith("/ouvintes-mensais")) return "charts";
  if (pathname.startsWith("/artistas")) return "artistas";
  return "all";
}

export default function CasaAds() {
  const pathname = usePathname();
  const [ads, setAds] = useState<Ad[]>([]);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      const [setting, records] = await Promise.all([
        supabase.from("casa_ads_settings").select("is_enabled").eq("id", 1).maybeSingle(),
        supabase.from("casa_advertisements").select("id,title,advertiser,embed_url,target_url,page_scope,sort_order").eq("is_enabled", true).order("sort_order"),
      ]);
      if (!active) return;
      setEnabled(Boolean(setting.data?.is_enabled));
      setAds((records.data || []) as Ad[]);
    }
    void load();
    return () => { active = false; };
  }, [pathname]);
  const scope = pageScope(pathname);
  const visible = enabled ? ads.filter((ad) => ad.page_scope === "all" || ad.page_scope === scope) : [];
  if (!visible.length) return null;
  return <aside className="casa-advertising" aria-label="Publicidade CASA">
    <div className="casa-advertising-heading"><span>PUBLICIDADE</span><i>PARCERIA APROVADA</i></div>
    <div className="casa-advertising-grid">{visible.map((ad) => <article className="casa-advertising-card" key={ad.id}><div className="casa-advertising-meta"><span>{ad.advertiser || "PARCEIRO CASA"}</span><span>PUB</span></div><iframe src={ad.embed_url} title={ad.title} loading="lazy" sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="strict-origin-when-cross-origin" />{ad.target_url ? <a href={ad.target_url} target="_blank" rel="noreferrer">SABER MAIS ↗</a> : null}</article>)}</div>
  </aside>;
}
