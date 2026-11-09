"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { label: "CASA", href: "/" },
  { label: "CHARTS SINGLES", href: "/charts/singles" },
  { label: "CHARTS ÁLBUNS", href: "/charts/albuns" },
  { label: "ARTISTAS", href: "/artistas" },
  { label: "ARTIGOS", href: "/artigos" },
  { label: "DESTAQUES", href: "/destaques" },
  { label: "SOBRE A CASA", href: "/sobre" },
  { label: "LOGIN", href: "/admin/login" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <div className="site-header-shell">
      <header className="site-header">
        <div className="site-header-theme">
          <ThemeToggle />
        </div>

        <Link href="/" className="site-header-logo" aria-label="CASA">
          CASA<sup>®</sup>
        </Link>

        <span className="site-header-description">
          CLASSIFICAÇÃO ANGOLANA
          <br />
          DE SONS E AUDIÊNCIAS
        </span>
      </header>

      <nav className="site-nav" aria-label="Navegação principal">
        <div className="site-nav-links">
          {navigation.map((item) => {
            const active =
  item.href === "/"
    ? pathname === "/"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <span className="site-market">
          ANGOLA <b>AO</b>
        </span>
      </nav>
    </div>
  );
}