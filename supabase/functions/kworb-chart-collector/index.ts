import { createClient } from "@supabase/supabase-js";

type ChartType = "songs" | "albums";

type ParsedEntry = {
  rank: number;
  movement: string;
  artist: string;
  title: string;
  source_url: string;
  source_item_id: string;
};

type ChartPayload = {
  chartType: ChartType;
  chartDate: string;
  sourceUrl: string;
  sourceHeading: string;
  entries: ParsedEntry[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-casa-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getLisbonDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
    aacute: "á", Aacute: "Á", acirc: "â", Acirc: "Â", atilde: "ã", Atilde: "Ã",
    ccedil: "ç", Ccedil: "Ç", eacute: "é", Eacute: "É", ecirc: "ê", Ecirc: "Ê",
    iacute: "í", Iacute: "Í", oacute: "ó", Oacute: "Ó", ocirc: "ô", Ocirc: "Ô",
    otilde: "õ", Otilde: "Õ", uacute: "ú", Uacute: "Ú",
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return named[entity] ?? named[entity.toLowerCase()] ?? match;
  });
}

function cleanCell(value: string): string {
  return decodeHtml(value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/[\u00a0\s]+/g, " ").trim();
}

function stableId(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseKworbPage(html: string, chartType: ChartType, chartDate: string, sourceUrl: string): ChartPayload {
  const table = html.match(/<table\b[^>]*\bid=["']simpletable["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error(`Could not find Kworb chart table at ${sourceUrl}`);

  const entries: ParsedEntry[] = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(table)) && entries.length < 200) {
    const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length < 3) continue;

    const rank = Number(cleanCell(cells[0][1]));
    if (!Number.isInteger(rank) || rank !== entries.length + 1) continue;
    const movement = cleanCell(cells[1][1]);
    const fullTitle = cleanCell(cells[2][1]);
    const separator = fullTitle.indexOf(" - ");
    if (separator < 1 || separator >= fullTitle.length - 3) {
      throw new Error(`Invalid artist/title at ${chartType} rank ${rank}: ${fullTitle}`);
    }

    const artist = fullTitle.slice(0, separator).trim();
    const title = fullTitle.slice(separator + 3).trim();
    entries.push({
      rank,
      movement,
      artist,
      title,
      source_url: sourceUrl,
      source_item_id: `${chartType}-${stableId(artist)}-${stableId(title)}`,
    });
  }

  if (entries.length !== 200 || entries.some((entry, index) => entry.rank !== index + 1)) {
    throw new Error(`Expected 200 consecutive ${chartType} ranks from Kworb; received ${entries.length}`);
  }

  const heading = cleanCell(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  return { chartType, chartDate, sourceUrl, sourceHeading: heading, entries };
}

async function fetchChart(chartType: ChartType, chartDate: string): Promise<ChartPayload> {
  const sourceUrl = chartType === "songs"
    ? "https://kworb.net/charts/apple_s/ao.html"
    : "https://kworb.net/charts/apple_a/ao.html";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "CASA Charts collector/1.0 (+https://casacharts.digital)" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Kworb returned HTTP ${response.status} for ${chartType}`);
    return parseKworbPage(await response.text(), chartType, chartDate, sourceUrl);
  } finally {
    clearTimeout(timeout);
  }
}

async function insertChartEntries(
  supabase: ReturnType<typeof getSupabaseClient>,
  sourceRunId: string,
  chartType: ChartType,
  chartDate: string,
  entries: ParsedEntry[],
): Promise<number> {
  const records = entries.map((entry) => ({
    rank: entry.rank,
    movement: entry.movement,
    artist: entry.artist,
    title: entry.title,
    source_url: entry.source_url,
    source_item_id: entry.source_item_id,
  }));
  const { data, error } = await supabase.rpc("replace_kworb_chart_snapshot", {
    p_source_run_id: sourceRunId,
    p_chart_type: chartType,
    p_chart_date: chartDate,
    p_records: records,
  });
  if (error) throw new Error(`Could not safely replace ${chartType} snapshot: ${error.message}`);
  if (data !== 200) throw new Error(`Unexpected number of inserted ${chartType} entries: ${data}`);
  return data;
}

async function saveChart(supabase: ReturnType<typeof getSupabaseClient>, payload: ChartPayload): Promise<number> {
  const { data: run, error: runError } = await supabase.from("source_runs").insert({
    source_name: "kworb",
    market: "AO",
    chart_type: payload.chartType,
    source_chart_date: payload.chartDate,
    collected_at: new Date().toISOString(),
    status: "running",
    item_count: 0,
    raw_payload: { source_url: payload.sourceUrl, heading: payload.sourceHeading },
  }).select("id").single();
  if (runError || !run) throw new Error(`Could not start ${payload.chartType} run: ${runError?.message ?? "missing id"}`);

  try {
    const count = await insertChartEntries(supabase, run.id, payload.chartType, payload.chartDate, payload.entries);
    const { error } = await supabase.from("source_runs").update({
      status: "success",
      item_count: count,
      raw_payload: { source_url: payload.sourceUrl, heading: payload.sourceHeading, entries: payload.entries },
    }).eq("id", run.id);
    if (error) throw error;
    return count;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("source_runs").update({ status: "failed", error_message: message }).eq("id", run.id);
    throw error;
  }
}

async function enrichArtworkLinks(supabase: ReturnType<typeof getSupabaseClient>) {
  const { error } = await supabase.rpc("enrich_kworb_chart_links");
  if (error) throw new Error(`Could not enrich chart artwork links: ${error.message}`);

  // Fill missing artwork on already-known records from Apple's public catalog.
  // This is deliberately best-effort: a failed lookup must never fail a chart run.
  const { data: links } = await supabase.from("chart_entries")
    .select("chart_type, item_title, artist_names, track_id, album_id")
    .eq("source_name", "kworb").eq("chart_date", getLisbonDate());
  for (const row of links ?? []) {
    const table = row.chart_type === "songs" ? "tracks" : "albums";
    const id = row.chart_type === "songs" ? row.track_id : row.album_id;
    if (!id) continue;
    const { data: record } = await supabase.from(table).select("artwork_url").eq("id", id).maybeSingle();
    if (record?.artwork_url) continue;
    try {
      const term = encodeURIComponent(`${row.artist_names ?? ""} ${row.item_title}`);
      const entity = row.chart_type === "songs" ? "song" : "album";
      const response = await fetch(`https://itunes.apple.com/search?term=${term}&country=AO&entity=${entity}&limit=1`);
      const result = await response.json();
      const artwork = result.results?.[0]?.artworkUrl100?.replace("100x100", "600x600");
      if (artwork) await supabase.from(table).update({ artwork_url: artwork }).eq("id", id);
    } catch { /* artwork enrichment is non-blocking */ }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("CASA_COLLECTOR_TOKEN");
  if (!expectedToken || request.headers.get("x-casa-token") !== expectedToken) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const supabase = getSupabaseClient();
    const chartDate = getLisbonDate();
    const [songs, albums] = await Promise.all([
      fetchChart("songs", chartDate),
      fetchChart("albums", chartDate),
    ]);
    const [songsCount, albumsCount] = await Promise.all([
      saveChart(supabase, songs),
      saveChart(supabase, albums),
    ]);
    await enrichArtworkLinks(supabase);
    const collectedAt = new Date().toISOString();
    console.info("Kworb charts collected", { chartDate, songs: songsCount, albums: albumsCount });
    return jsonResponse({ ok: true, chartDate, collectedAt, songs: songsCount, albums: albumsCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Kworb chart collection failed", message);
    return jsonResponse({ ok: false, error: message }, 502);
  }
});
