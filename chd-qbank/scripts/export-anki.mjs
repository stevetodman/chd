import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import React from "react";
import ReactMarkdown from "react-markdown";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./utils/loadEnv.js";

const DEFAULT_DECK_NAME = "CHD Practice";
const PAGE_SIZE = 200;
const MEDIA_FIELD_SEPARATOR = "\u001f";
const MARKDOWN_REMARK_PLUGINS = [remarkGfm];
const MARKDOWN_REHYPE_PLUGINS = [rehypeHighlight];

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const repoRoot = findRepoRoot();
    loadEnvFile({ cwd: repoRoot });
    loadEnvFile({ cwd: path.join(repoRoot, "chd-qbank") });

    const client = createSupabaseClient();
    if (!client) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment");
    }

    const questions = await fetchQuestions(client, options);
    if (questions.length === 0) {
      console.log("No questions matched the provided filters. Nothing to export.");
      return;
    }

    const deckData = await buildDeckData(questions);
    const outputPath = await writeDeckToFile(deckData, options);
    console.log(`Exported ${deckData.notes.length} cards to ${outputPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  let deckName = DEFAULT_DECK_NAME;
  let outputPath = null;
  let topic = null;
  let lesion = null;
  let slug = null;
  let limit = null;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith("--deck=")) {
      const value = arg.slice("--deck=".length).trim();
      if (!value) {
        throw new Error("--deck requires a non-empty value");
      }
      deckName = value;
    } else if (arg.startsWith("--output=")) {
      const value = arg.slice("--output=".length).trim();
      if (!value) {
        throw new Error("--output requires a file path");
      }
      outputPath = path.resolve(process.cwd(), value);
    } else if (arg.startsWith("--topic=")) {
      topic = emptyToNull(arg.slice("--topic=".length));
    } else if (arg.startsWith("--lesion=")) {
      lesion = emptyToNull(arg.slice("--lesion=".length));
    } else if (arg.startsWith("--slug=")) {
      slug = emptyToNull(arg.slice("--slug=".length));
    } else if (arg.startsWith("--limit=")) {
      const value = arg.slice("--limit=".length).trim();
      if (!value) {
        throw new Error("--limit requires a numeric value");
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      limit = parsed;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { deckName, outputPath, topic, lesion, slug, limit };
}

function printUsage() {
  console.log(
    "Usage: npm run export:anki [-- --deck=<name>] [--output=<file>] [--topic=<topic>] [--lesion=<lesion>] [--slug=<slug>] [--limit=<count>]\n" +
      "\n" +
      "Exports published questions from Supabase into an Anki .apkg deck. Filters are optional."
  );
}

function emptyToNull(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function findRepoRoot() {
  const here = fileURLToPath(new URL(".", import.meta.url));
  return path.resolve(here, "..", "..");
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchQuestions(client, options) {
  const results = [];
  let from = 0;

  while (true) {
    let query = client
      .from("questions")
      .select(
        "id, slug, stem_md, lead_in, explanation_brief_md, explanation_deep_md, topic, subtopic, lesion, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id,label,text_md,is_correct)",
        { count: "exact" }
      )
      .eq("status", "published")
      .order("slug", { ascending: true });

    if (options.topic) {
      query = query.eq("topic", options.topic);
    }
    if (options.lesion) {
      query = query.eq("lesion", options.lesion);
    }
    if (options.slug) {
      query = query.eq("slug", options.slug);
    }

    const to = options.limit ? Math.min(from + PAGE_SIZE - 1, options.limit - 1) : from + PAGE_SIZE - 1;
    const { data, error } = await query.range(from, to);
    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      results.push(normalizeQuestion(row));
      if (options.limit && results.length >= options.limit) {
        return results;
      }
    }

    if (rows.length < PAGE_SIZE || (options.limit && results.length >= options.limit)) {
      break;
    }
    from += PAGE_SIZE;
  }

  return results;
}

function normalizeQuestion(row) {
  const choices = Array.isArray(row.choices) ? row.choices.slice() : [];
  choices.sort((a, b) => String(a.label).localeCompare(String(b.label)));

  let mediaBundle = null;
  if (Array.isArray(row.media_bundle)) {
    mediaBundle = row.media_bundle[0] ?? null;
  } else if (row.media_bundle) {
    mediaBundle = row.media_bundle;
  }

  return {
    id: row.id,
    slug: row.slug,
    stem_md: row.stem_md,
    lead_in: row.lead_in,
    explanation_brief_md: row.explanation_brief_md,
    explanation_deep_md: row.explanation_deep_md,
    topic: row.topic,
    subtopic: row.subtopic,
    lesion: row.lesion,
    media_bundle: mediaBundle,
    context_panels: row.context_panels ?? null,
    choices
  };
}

async function buildDeckData(questions) {
  const notes = [];
  const media = [];
  const usedFilenames = new Set();

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const noteContent = await buildNoteContent(question, usedFilenames);

    const noteId = computeEntityId(index + 1);
    const cardId = computeEntityId(index + 1, 1);
    const checksum = computeChecksum(noteContent.front);
    const sortField = buildSortField(question);
    const guid = randomUUID().replace(/-/g, "").slice(0, 10);

    notes.push({
      id: noteId,
      cardId,
      guid,
      front: noteContent.front,
      back: noteContent.back,
      tags: noteContent.tags,
      checksum,
      sortField
    });

    for (const asset of noteContent.assets) {
      media.push(asset);
    }
  }

  return { notes, media };
}

function buildSortField(question) {
  const parts = [question.stem_md, question.lead_in || ""];
  return parts
    .join(" \n ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeEntityId(index, salt = 0) {
  const base = BigInt(Date.now());
  return base * 1000n + BigInt(index) * 10n + BigInt(salt);
}

function computeChecksum(content) {
  const hash = createHash("sha1").update(content, "utf8").digest();
  return hash.readUInt32BE(0);
}

async function buildNoteContent(question, usedFilenames) {
  const assets = [];

  const stemHtml = renderMarkdown(question.stem_md);
  const leadInHtml = question.lead_in ? renderMarkdown(question.lead_in) : "";
  const contextHtml = await renderContextPanels(question.context_panels);
  const mediaHtml = await renderMedia(question, assets, usedFilenames);
  const choicesHtml = renderChoices(question.choices);
  const front = wrapFront({ mediaHtml, contextHtml, stemHtml, leadInHtml, choicesHtml });

  const explanationBriefHtml = renderMarkdown(question.explanation_brief_md);
  const explanationDeepHtml = question.explanation_deep_md ? renderMarkdown(question.explanation_deep_md) : "";
  const correctChoice = question.choices.find((choice) => choice.is_correct);
  const answerHtml = correctChoice
    ? `<p><span class="label">${correctChoice.label}.</span> ${renderChoice(correctChoice)}</p>`
    : "";
  const back = wrapBack({
    answerHtml,
    explanationBriefHtml,
    explanationDeepHtml,
    metadataHtml: renderMetadata(question),
    mediaHtml
  });

  const tags = buildTags(question);

  return { front, back, tags, assets };
}

function renderMarkdown(markdown) {
  const trimmed = (markdown ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: MARKDOWN_REMARK_PLUGINS,
        rehypePlugins: MARKDOWN_REHYPE_PLUGINS
      },
      trimmed
    )
  );
}

async function renderContextPanels(panels) {
  if (!Array.isArray(panels) || panels.length === 0) {
    return "";
  }

  const rendered = [];
  for (const panel of panels) {
    if (!panel || typeof panel !== "object") continue;
    if (panel.kind === "context") {
      if (!panel.body_md) continue;
      const body = renderMarkdown(panel.body_md);
      if (!body) continue;
      const title = panel.title ? escapeHtml(panel.title) : "Context";
      rendered.push(`<section class="chd-context"><h3>${title}</h3><div>${body}</div></section>`);
    } else if (panel.kind === "labs") {
      if (!Array.isArray(panel.labs) || panel.labs.length === 0) continue;
      const rows = panel.labs
        .map((lab) => {
          const label = escapeHtml(String(lab.label ?? ""));
          const value = escapeHtml(String(lab.value ?? ""));
          const unit = lab.unit ? escapeHtml(String(lab.unit)) : "";
          return `<tr><th>${label}</th><td>${value}${unit ? ` <span class="unit">${unit}</span>` : ""}</td></tr>`;
        })
        .join("");
      const title = panel.title ? escapeHtml(panel.title) : "Laboratory Values";
      rendered.push(`<section class="chd-context"><h3>${title}</h3><table class="labs">${rows}</table></section>`);
    } else if (panel.kind === "formula") {
      const formulas = Array.isArray(panel.formulas) ? panel.formulas : [];
      const items = formulas
        .map((formula) => {
          const name = escapeHtml(String(formula.name ?? ""));
          const expression = escapeHtml(String(formula.expression ?? ""));
          return `<li><strong>${name}:</strong> ${expression}</li>`;
        })
        .join("");
      const body = panel.body_md ? renderMarkdown(panel.body_md) : "";
      if (!items && !body) continue;
      const title = panel.title ? escapeHtml(panel.title) : "Formula";
      rendered.push(
        `<section class="chd-context"><h3>${title}</h3>${items ? `<ul class="formulas">${items}</ul>` : ""}${body ? `<div>${body}</div>` : ""}</section>`
      );
    }
  }

  if (rendered.length === 0) {
    return "";
  }

  return `<div class="chd-context-panels">${rendered.join("")}</div>`;
}

async function renderMedia(question, assets, usedFilenames) {
  const bundle = question.media_bundle;
  if (!bundle) {
    return "";
  }

  const fragments = [];
  const attachments = [];

  if (bundle.cxr_url) {
    attachments.push(
      handleMediaAsset(bundle.cxr_url, question, "cxr", bundle.alt_text, assets, usedFilenames).then((result) => {
        if (result) {
          fragments.push(`<figure class="media image"><img src="${result.filename}" alt="${escapeHtml(result.alt)}" /></figure>`);
        }
      })
    );
  }

  if (bundle.ekg_url) {
    attachments.push(
      handleMediaAsset(bundle.ekg_url, question, "ekg", bundle.alt_text, assets, usedFilenames).then((result) => {
        if (result) {
          fragments.push(`<figure class="media image"><img src="${result.filename}" alt="${escapeHtml(result.alt)}" /></figure>`);
        }
      })
    );
  }

  if (bundle.diagram_url) {
    attachments.push(
      handleMediaAsset(bundle.diagram_url, question, "diagram", bundle.alt_text, assets, usedFilenames).then((result) => {
        if (result) {
          fragments.push(`<figure class="media image"><img src="${result.filename}" alt="${escapeHtml(result.alt)}" /></figure>`);
        }
      })
    );
  }

  if (bundle.murmur_url) {
    attachments.push(
      handleMediaAsset(bundle.murmur_url, question, "murmur", bundle.alt_text, assets, usedFilenames).then((result) => {
        if (result) {
          fragments.push(`<div class="media audio">[sound:${result.filename}]</div>`);
        }
      })
    );
  }

  await Promise.all(attachments);

  if (fragments.length === 0) {
    return "";
  }

  return `<div class="chd-media">${fragments.join("")}</div>`;
}

function renderChoices(choices) {
  const items = [];
  for (const choice of choices) {
    const rendered = renderChoice(choice);
    items.push(`<li data-choice="${choice.label}"><span class="label">${choice.label}.</span> ${rendered}</li>`);
  }
  return `<ol class="chd-choices">${items.join("")}</ol>`;
}

function renderChoice(choice) {
  const html = renderMarkdown(choice.text_md);
  return html || escapeHtml(String(choice.text_md ?? ""));
}

async function handleMediaAsset(url, question, kind, altText, assets, usedFilenames) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const filename = ensureUniqueFilename(question, kind, url, usedFilenames);
    assets.push({ filename, data });
    const alt = altText ? String(altText) : `${kind.toUpperCase()} asset`;
    return { filename, alt };
  } catch (error) {
    console.warn(`Skipping media for question ${question.slug || question.id}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function ensureUniqueFilename(question, kind, url, usedFilenames) {
  const ext = inferExtension(url) || (kind === "murmur" ? ".mp3" : ".png");
  const identifier = question.slug ?? question.id ?? kind;
  const baseName = sanitizeFilename(`${identifier}-${kind}`);
  let candidate = `${baseName}${ext}`;
  let counter = 1;
  while (usedFilenames.has(candidate)) {
    candidate = `${baseName}-${counter}${ext}`;
    counter += 1;
  }
  usedFilenames.add(candidate);
  return candidate;
}

function inferExtension(url) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname);
    if (ext) {
      return ext;
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeFilename(value) {
  return (value || "media")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "media";
}

function wrapFront(parts) {
  return [
    '<article class="chd-card">',
    parts.mediaHtml,
    parts.contextHtml,
    parts.stemHtml ? `<div class="stem">${parts.stemHtml}</div>` : "",
    parts.leadInHtml ? `<div class="lead-in">${parts.leadInHtml}</div>` : "",
    parts.choicesHtml,
    "</article>"
  ]
    .filter(Boolean)
    .join("");
}

function wrapBack(parts) {
  const fragments = ['<article class="chd-card chd-answer">'];
  if (parts.answerHtml) {
    fragments.push(`<section class="answer"><h3>Correct answer</h3>${parts.answerHtml}</section>`);
  }
  if (parts.mediaHtml) {
    fragments.push(parts.mediaHtml);
  }
  if (parts.explanationBriefHtml) {
    fragments.push(`<section class="explanation">${parts.explanationBriefHtml}</section>`);
  }
  if (parts.explanationDeepHtml) {
    fragments.push(`<section class="explanation">${parts.explanationDeepHtml}</section>`);
  }
  if (parts.metadataHtml) {
    fragments.push(`<section class="metadata">${parts.metadataHtml}</section>`);
  }
  fragments.push("</article>");
  return fragments.join("");
}

function renderMetadata(question) {
  const items = [];
  if (question.topic) {
    items.push(`<div><strong>Topic:</strong> ${escapeHtml(question.topic)}</div>`);
  }
  if (question.subtopic) {
    items.push(`<div><strong>Subtopic:</strong> ${escapeHtml(question.subtopic)}</div>`);
  }
  if (question.lesion) {
    items.push(`<div><strong>Lesion:</strong> ${escapeHtml(question.lesion)}</div>`);
  }
  return items.join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTags(question) {
  const tags = [];
  if (question.slug) {
    tags.push(formatTag(question.slug));
  }
  if (question.topic) {
    tags.push(formatTag(question.topic));
  }
  if (question.lesion) {
    tags.push(formatTag(question.lesion));
  }
  return tags;
}

function formatTag(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_:-]/g, "");
}

async function writeDeckToFile(deck, options) {
  const workspace = await mkdtemp(path.join(tmpdir(), "chd-anki-"));
  try {
    const dbPath = path.join(workspace, "collection.anki21");
    await initializeDatabase(dbPath);
    await populateDatabase(dbPath, deck, options.deckName);
    await writeMediaFiles(workspace, deck.media);
    const output = options.outputPath ?? path.resolve(process.cwd(), `${sanitizeFilename(options.deckName)}.apkg`);
    await createApkgArchive(workspace, output, deck.media.length);
    return output;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function initializeDatabase(dbPath) {
  const schema = `
    PRAGMA journal_mode=DELETE;
    CREATE TABLE col (
      id integer primary key,
      crt integer not null,
      mod integer not null,
      scm integer not null,
      ver integer not null,
      dty integer not null,
      usn integer not null,
      ls integer not null,
      conf text not null,
      models text not null,
      decks text not null,
      dconf text not null,
      tags text not null
    );
    CREATE TABLE notes (
      id integer primary key,
      guid text not null,
      mid integer not null,
      mod integer not null,
      usn integer not null,
      tags text not null,
      flds text not null,
      sfld text not null,
      csum integer not null,
      flags integer not null,
      data text not null
    );
    CREATE TABLE cards (
      id integer primary key,
      nid integer not null,
      did integer not null,
      ord integer not null,
      mod integer not null,
      usn integer not null,
      type integer not null,
      queue integer not null,
      due integer not null,
      ivl integer not null,
      factor integer not null,
      reps integer not null,
      lapses integer not null,
      left integer not null,
      odue integer not null,
      odid integer not null,
      flags integer not null,
      data text not null
    );
    CREATE TABLE revlog (
      id integer primary key,
      cid integer not null,
      usn integer not null,
      ease integer not null,
      ivl integer not null,
      lastIvl integer not null,
      factor integer not null,
      time integer not null,
      type integer not null
    );
    CREATE TABLE graves (
      id integer primary key,
      usn integer not null,
      oid integer not null,
      type integer not null
    );
  `;
  await runSql({ dbPath, sql: schema });
}

async function populateDatabase(dbPath, deck, deckName) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const creation = Math.floor(Date.now() / 1000);
  const deckId = Number(BigInt.asUintN(53, computeEntityId(1)));
  const modelId = deckId + 1;

  const models = JSON.stringify({
    [modelId]: {
      id: modelId,
      name: deckName,
      type: 0,
      mod: nowSeconds,
      usn: 0,
      sortf: 0,
      did: deckId,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
          bqfmt: "",
          bafmt: "",
          did: null,
          bfont: "",
          bsize: 0
        }
      ],
      flds: [
        {
          name: "Front",
          ord: 0,
          sticky: false,
          rtl: false,
          font: "Arial",
          size: 20,
          description: ""
        },
        {
          name: "Back",
          ord: 1,
          sticky: false,
          rtl: false,
          font: "Arial",
          size: 20,
          description: ""
        }
      ],
      css: `.card { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 16px; line-height: 1.5; color: #111; background-color: #fff; }
.card h3 { font-size: 1.1em; margin-top: 1em; }
.chd-choices { list-style: none; padding: 0; }
.chd-choices li { margin-bottom: 0.5em; }
.chd-choices .label { font-weight: 600; margin-right: 0.25em; }
.chd-context { margin-bottom: 1em; }
.chd-context h3 { margin-bottom: 0.25em; }
.chd-media { margin-bottom: 1em; }
.chd-media img { max-width: 100%; height: auto; }
.chd-media .media.audio { margin-top: 0.5em; font-weight: 600; }
.metadata div { margin-top: 0.25em; }
`,
      latexPre: "\\documentclass[12pt]{article}\\n\\usepackage{amssymb,amsmath}\\n\\n\\begin{document}\\n",
      latexPost: "\\n\\end{document}",
      latexsvg: false,
      req: [[0, "all", [0]]],
      tags: [],
      vers: []
    }
  });

  const deckConfig = {
    1: {
      id: 1,
      name: "Default",
      mod: 0,
      usn: 0,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        bury: true,
        delays: [1, 10],
        ints: [1, 4, 0],
        initialFactor: 2500,
        order: 0,
        perDay: 20
      },
      rev: {
        bury: true,
        ease4: 1.3,
        fuzz: 0.05,
        ivlFct: 1,
        maxIvl: 36500,
        minSpace: 1,
        perDay: 200
      },
      lapse: {
        delays: [10],
        leechAction: 0,
        leechFails: 8,
        minInt: 1,
        mult: 0
      }
    }
  };

  const decks = JSON.stringify({
    [deckId]: {
      id: deckId,
      name: deckName,
      mod: nowSeconds,
      usn: 0,
      desc: "",
      dyn: 0,
      extendNew: 0,
      extendRev: 0,
      conf: 1,
      mid: modelId,
      newToday: [nowSeconds, 0],
      revToday: [nowSeconds, 0],
      lrnToday: [nowSeconds, 0],
      timeToday: [nowSeconds, 0],
      collapsed: false,
      browserCollapsed: false
    }
  });

  const conf = JSON.stringify({
    nextPos: deck.notes.length + 1,
    estTimes: true,
    dueCounts: true,
    timezone: "UTC",
    sortType: "noteFld",
    sortBackwards: false,
    newSpread: 0,
    collapseTime: 1200,
    activeDecks: [deckId],
    curDeck: deckId,
    newBury: true,
    newFront: false,
    daily: true,
    browserTable: true,
    addToCur: true,
    state: { lastDeck: deckId },
    curModel: modelId,
    dayLearnFirst: false,
    preferRev: false,
    schedVer: 2
  });

  const tags = JSON.stringify({});

  const insertStatements = [];
  insertStatements.push(
    `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (1, ${creation}, ${nowSeconds}, ${nowSeconds}, 14, 0, 0, 0, ${sqlQuote(
      conf
    )}, ${sqlQuote(models)}, ${sqlQuote(decks)}, ${sqlQuote(JSON.stringify(deckConfig))}, ${sqlQuote(tags)});`
  );

  for (let index = 0; index < deck.notes.length; index += 1) {
    const note = deck.notes[index];
    const tagsString = note.tags.length > 0 ? ` ${note.tags.join(" ")} ` : "";
    const fields = `${note.front}${MEDIA_FIELD_SEPARATOR}${note.back}`;
    const escapedFields = sqlQuote(fields);
    const escapedSort = sqlQuote(note.sortField);
    insertStatements.push(
      `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (${note.id}, ${sqlQuote(
        note.guid
      )}, ${modelId}, ${nowSeconds}, 0, ${sqlQuote(tagsString)}, ${escapedFields}, ${escapedSort}, ${note.checksum}, 0, ${sqlQuote("")});`
    );
    insertStatements.push(
      `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (${note.cardId}, ${note.id}, ${deckId}, 0, ${nowSeconds}, 0, 0, 0, ${
        index + 1
      }, 0, 2500, 0, 0, 65535, 0, 0, 0, ${sqlQuote("")});`
    );
  }

  const sql = [`BEGIN EXCLUSIVE TRANSACTION;`, ...insertStatements, `COMMIT;`].join("\n");
  await runSql({ dbPath, sql });
}

async function writeMediaFiles(workspace, assets) {
  const mediaMap = {};
  await Promise.all(
    assets.map(async (asset, index) => {
      const mediaIndex = String(index);
      const filePath = path.join(workspace, mediaIndex);
      await writeFile(filePath, asset.data);
      mediaMap[mediaIndex] = asset.filename;
    })
  );
  await writeFile(path.join(workspace, "media"), JSON.stringify(mediaMap), "utf8");
}

async function createApkgArchive(workspace, outputPath, mediaCount) {
  const files = ["collection.anki21", "media"];
  for (let index = 0; index < mediaCount; index += 1) {
    files.push(String(index));
  }

  await new Promise((resolve, reject) => {
    const child = spawn("zip", ["-q", "-X", outputPath, ...files], { cwd: workspace });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`zip exited with code ${code}`));
      }
    });
  });
}

async function runSql(command) {
  await new Promise((resolve, reject) => {
    const child = spawn("sqlite3", [command.dbPath]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`sqlite3 exited with code ${code}: ${stderr}`));
      }
    });
    child.stdin.write(command.sql);
    if (!command.sql.trim().endsWith(";")) {
      child.stdin.write(";\n");
    } else {
      child.stdin.write("\n");
    }
    child.stdin.end();
  });
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

await main();
