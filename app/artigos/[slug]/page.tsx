import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Article = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("casa_articles")
    .select("title,slug,excerpt,content,category,cover_image_url,published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) notFound();

  const article = data as Article;
  const publishedDate = article.published_at
    ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(
        new Date(article.published_at),
      )
    : null;
  const paragraphs = article.content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="casa-article-page">
      <div className="casa-article-topline">
        <span>CASA / EDITORIAL</span>
        <span>LEITURA</span>
      </div>

      <Link href="/artigos" className="casa-article-back">
        <span aria-hidden="true">←</span> VOLTAR A ARTIGOS
      </Link>

      <article className="casa-article">
        <header className="casa-article-header">
          <div className="casa-article-category-row">
            <span className="casa-article-mark" />
            <span>{article.category || "CULTURA"}</span>
          </div>

          <h1>{article.title}</h1>

          {article.excerpt ? (
            <p className="casa-article-excerpt">{article.excerpt}</p>
          ) : null}

          <div className="casa-article-meta">
            <span>CASA EDITORIAL</span>
            {publishedDate ? (
              <time dateTime={article.published_at || undefined}>
                {publishedDate}
              </time>
            ) : null}
          </div>
        </header>

        {article.cover_image_url ? (
          <figure className="casa-article-cover">
            <img src={article.cover_image_url} alt={article.title} />
            <figcaption>CASA / {article.category || "EDITORIAL"}</figcaption>
          </figure>
        ) : null}

        <div className="casa-article-body">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </div>

        <footer className="casa-article-footer">
          <span>CASA<sup>®</sup></span>
          <span>MÚSICA · CULTURA · DADOS</span>
          <Link href="/artigos">MAIS ARTIGOS ↗</Link>
        </footer>
      </article>

    </main>
  );
}
