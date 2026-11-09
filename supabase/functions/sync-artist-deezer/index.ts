
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);

  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;

  const matrix = Array.from(
    { length: x.length + 1 },
    () => Array(y.length + 1).fill(0),
  );

  for (let i = 0; i <= x.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= y.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return 1 - matrix[x.length][y.length] / Math.max(x.length, y.length);
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export default {
  fetch: withSupabase(
    { auth: ["secret"] },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 },
        );
      }

      try {
        const supabase = ctx.supabaseAdmin;

        const { data: artists, error } = await supabase
          .from("artists")
          .select("id, canonical_name")
          .eq("is_angolan", true)
          .is("deezer_artist_id", null)
          .order("canonical_name");

        if (error) throw error;

        const results = [];
        let matched = 0;
        let notFound = 0;
        let ambiguous = 0;
        let failed = 0;

        for (const artist of artists ?? []) {
          try {
            const query = encodeURIComponent(artist.canonical_name);

            const response = await fetch(
              `https://api.deezer.com/search/artist?q=${query}&limit=10`,
            );

            if (!response.ok) {
              throw new Error(`Deezer HTTP ${response.status}`);
            }

            const payload = await response.json();
            const candidates = Array.isArray(payload.data)
              ? payload.data
              : [];

            const ranked = candidates
              .map((candidate: any) => ({
                candidate,
                score: similarity(
                  artist.canonical_name,
                  candidate.name ?? "",
                ),
              }))
              .sort((a: any, b: any) => b.score - a.score);

            const best = ranked[0];

            if (!best || best.score < 0.88) {
              const { error: updateError } = await supabase
                .from("artists")
                .update({
                  deezer_match_status: "not_found",
                  deezer_updated_at: new Date().toISOString(),
                })
                .eq("id", artist.id);

              if (updateError) throw updateError;

              notFound++;
              results.push({
                artist: artist.canonical_name,
                status: "not_found",
                score: best?.score ?? 0,
              });
            } else {
              const second = ranked[1];

              const isAmbiguous =
                second &&
                second.score >= 0.88 &&
                best.score - second.score < 0.04;

              if (isAmbiguous) {
                const { error: updateError } = await supabase
                  .from("artists")
                  .update({
                    deezer_match_status: "review_required",
                    deezer_updated_at: new Date().toISOString(),
                  })
                  .eq("id", artist.id);

                if (updateError) throw updateError;

                ambiguous++;
                results.push({
                  artist: artist.canonical_name,
                  status: "review_required",
                  candidates: ranked.slice(0, 3).map((item: any) => ({
                    name: item.candidate.name,
                    id: item.candidate.id,
                    score: Number(item.score.toFixed(3)),
                  })),
                });
              } else {
                const match = best.candidate;

                const { error: updateError } = await supabase
                  .from("artists")
                  .update({
                    deezer_artist_id: match.id,
                    deezer_image_url:
                      match.picture_xl ||
                      match.picture_big ||
                      match.picture_medium ||
                      null,
                    deezer_profile_url: match.link || null,
                    deezer_match_status: "matched",
                    deezer_updated_at: new Date().toISOString(),
                  })
                  .eq("id", artist.id);

                if (updateError) throw updateError;

                matched++;
                results.push({
                  artist: artist.canonical_name,
                  status: "matched",
                  deezer_name: match.name,
                  deezer_id: match.id,
                  score: Number(best.score.toFixed(3)),
                });
              }
            }

            await sleep(350);
          } catch (error) {
            failed++;
            results.push({
              artist: artist.canonical_name,
              status: "error",
              message: String(error),
            });
          }
        }

        return Response.json({
          success: true,
          processed: artists?.length ?? 0,
          matched,
          not_found: notFound,
          review_required: ambiguous,
          failed,
          results,
        });
      } catch (error) {
        console.error("Artist Deezer sync failed:", error);

        return Response.json(
          { error: String(error) },
          { status: 500 },
        );
      }
    },
  ),
};
