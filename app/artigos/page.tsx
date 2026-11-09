import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

type Interview = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  published_at: string | null;
  sort_order: number;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(
    new Date(value),
  );
}

export default async function ArticlesPage() {
  const supabase = await createSupabaseServerClient();
  const [articlesResult, interviewsResult] = await Promise.all([
    supabase
      .from("casa_articles")
      .select("id,title,slug,excerpt,category,cover_image_url,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("casa_editorial_highlights")
      .select(
        "id,title,subtitle,description,category,image_url,link_url,link_label,published_at,sort_order",
      )
      .eq("section", "interviews")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false }),
  ]);

  if (articlesResult.error) {
    console.error("Erro ao carregar artigos públicos:", articlesResult.error);
  }
  if (interviewsResult.error) {
    console.error("Erro ao carregar entrevistas públicas:", interviewsResult.error);
  }

  const articles = (articlesResult.data ?? []) as Article[];
  const interviews = (interviewsResult.data ?? []) as Interview[];

  return (
    <main className="editorial-hub">

      <section className="editorial-hub-section" aria-labelledby="articles-heading">
        <div className="editorial-hub-section-heading">
          <div>
            <span>01 / LEITURAS</span>
            <h2 id="articles-heading">ARTIGOS</h2>
          </div>
          <small>{String(articles.length).padStart(2, "0")} PUBLICADOS</small>
        </div>

        {articles.length > 0 ? (
          <div className="editorial-hub-grid">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/artigos/${encodeURIComponent(article.slug)}`}
                className="editorial-hub-card"
              >
                {article.cover_image_url ? (
                  <div className="editorial-hub-card-image">
                    <img src={article.cover_image_url} alt={article.title} />
                  </div>
                ) : null}
                <div className="editorial-hub-card-body">
                  <div className="editorial-hub-card-meta">
                    <span>{article.category || "CULTURA"}</span>
                    {formatDate(article.published_at) ? (
                      <time dateTime={article.published_at || undefined}>
                        {formatDate(article.published_at)}
                      </time>
                    ) : null}
                  </div>
                  <h3>{article.title}</h3>
                  {article.excerpt ? <p>{article.excerpt}</p> : null}
                  <span className="editorial-hub-read">LER ARTIGO <b>↗</b></span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-hub-empty">Ainda não há artigos publicados.</div>
        )}
      </section>

      <section className="editorial-hub-section" aria-labelledby="interviews-heading">
        <div className="editorial-hub-section-heading">
          <div>
            <span>02 / CONVERSAS</span>
            <h2 id="interviews-heading">ENTREVISTAS</h2>
          </div>
          <small>{String(interviews.length).padStart(2, "0")} PUBLICADAS</small>
        </div>

        {interviews.length > 0 ? (
          <div className="editorial-hub-grid">
            {interviews.map((interview) => {
              const external = /^https?:\/\//i.test(interview.link_url || "");
              const cardContent = (
                <>
                  {interview.image_url ? (
                    <div className="editorial-hub-card-image">
                      <img src={interview.image_url} alt={interview.title} />
                    </div>
                  ) : null}
                  <div className="editorial-hub-card-body">
                    <div className="editorial-hub-card-meta">
                      <span>{interview.category || "ENTREVISTA"}</span>
                      {formatDate(interview.published_at) ? (
                        <time dateTime={interview.published_at || undefined}>
                          {formatDate(interview.published_at)}
                        </time>
                      ) : null}
                    </div>
                    <h3>{interview.title}</h3>
                    {interview.subtitle ? <h4>{interview.subtitle}</h4> : null}
                    {interview.description ? <p>{interview.description}</p> : null}
                    {interview.link_url ? (
                      <span className="editorial-hub-read">
                        {interview.link_label || "VER ENTREVISTA"} <b>↗</b>
                      </span>
                    ) : null}
                  </div>
                </>
              );

              return interview.link_url ? (
                external ? (
                  <a
                    key={interview.id}
                    href={interview.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="editorial-hub-card"
                  >
                    {cardContent}
                  </a>
                ) : (
                  <Link
                    key={interview.id}
                    href={interview.link_url}
                    className="editorial-hub-card"
                  >
                    {cardContent}
                  </Link>
                )
              ) : (
                <article key={interview.id} className="editorial-hub-card">
                  {cardContent}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="editorial-hub-empty">Ainda não há entrevistas publicadas.</div>
        )}
      </section>

      <footer className="editorial-hub-footer">
        <strong>CASA<sup>®</sup></strong>
        <span>A MÚSICA ANGOLANA TEM CASA.</span>
        <Link href="/destaques">VER DESTAQUES ↗</Link>
      </footer>
    </main>
  );
}
