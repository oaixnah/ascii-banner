/// <reference lib="webworker" />

import figlet from "figlet";
import { measureOutput } from "../lib/export";
import type {
  GalleryFontEntry,
  RenderParameters,
  RenderPriority,
  RenderRequest,
  RenderResult,
  WorkerRequest,
  WorkerResponse,
} from "../lib/types";

interface RenderJob extends RenderParameters {
  highQueue: string[];
  backgroundQueue: string[];
  queuedPriorities: Map<string, RenderPriority>;
  rendering: Set<string>;
  rendered: Set<string>;
  pending: RenderResult[];
}

let fonts: GalleryFontEntry[] = [];
let fontsBySlug = new Map<string, GalleryFontEntry>();
let baseUrl = "";
let latestVersion = 0;
let activeJob: RenderJob | null = null;
let drainingRenderQueue = false;
const loaded = new Set<string>();
const loadPromises = new Map<string, Promise<void>>();

const post = (message: WorkerResponse) => self.postMessage(message);
const yieldToMessageQueue = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const loadFont = (font: GalleryFontEntry) => {
  if (loaded.has(font.slug)) return Promise.resolve();
  const existing = loadPromises.get(font.slug);
  if (existing) return existing;

  const promise = fetch(new URL(font.assetPath, baseUrl))
    .then((response) => {
      if (!response.ok) throw new Error(`Font request failed (${response.status})`);
      return response.text();
    })
    .then((data) => {
      figlet.parseFont(font.name, data);
      loaded.add(font.slug);
    })
    .finally(() => loadPromises.delete(font.slug));

  loadPromises.set(font.slug, promise);
  return promise;
};

const renderOne = async (font: GalleryFontEntry, request: RenderParameters): Promise<RenderResult> => {
  try {
    await loadFont(font);
    const output = figlet.textSync(request.text, {
      font: font.name,
      width: request.width,
      horizontalLayout: request.layout,
      whitespaceBreak: true,
    });
    return { fontSlug: font.slug, output, ...measureOutput(output) };
  } catch (error) {
    return {
      fontSlug: font.slug,
      output: "",
      columns: 0,
      rows: 0,
      error: error instanceof Error ? error.message : "Unable to render this font.",
    };
  }
};

const flush = (job: RenderJob) => {
  if (!job.pending.length || job !== activeJob || job.version !== latestVersion) return;
  post({ type: "batch", version: job.version, results: job.pending.splice(0) });
};

const takeNextSlug = (job: RenderJob) => {
  const takeFrom = (queue: string[]) => {
    while (queue.length) {
      const slug = queue.shift();
      if (!slug || !job.queuedPriorities.has(slug)) continue;
      job.queuedPriorities.delete(slug);
      return slug;
    }
    return null;
  };
  return takeFrom(job.highQueue) ?? takeFrom(job.backgroundQueue);
};

const runQueue = async (job: RenderJob) => {
  let renderedSinceYield = 0;
  while (job === activeJob && job.version === latestVersion) {
    const slug = takeNextSlug(job);
    if (!slug) return;
    const font = fontsBySlug.get(slug);
    if (!font || job.rendered.has(slug) || job.rendering.has(slug)) continue;

    job.rendering.add(slug);
    const result = await renderOne(font, job);
    job.rendering.delete(slug);
    if (job !== activeJob || job.version !== latestVersion) return;

    job.rendered.add(slug);
    job.pending.push(result);
    if (job.pending.length >= 8) flush(job);
    renderedSinceYield += 1;
    if (renderedSinceYield >= 4) {
      renderedSinceYield = 0;
      await yieldToMessageQueue();
    }
  }
};

const drainRenderQueue = async () => {
  if (drainingRenderQueue || !activeJob) return;
  drainingRenderQueue = true;
  const job = activeJob;
  try {
    await Promise.all(Array.from({ length: 4 }, () => runQueue(job)));
    if (job === activeJob && job.version === latestVersion) {
      flush(job);
      if (job.rendered.size === fonts.length) post({ type: "complete", version: job.version });
    }
  } finally {
    drainingRenderQueue = false;
    if (activeJob && activeJob.queuedPriorities.size) void drainRenderQueue();
  }
};

const createJob = (request: RenderRequest): RenderJob => ({
  version: request.version,
  text: request.text,
  width: request.width,
  layout: request.layout,
  highQueue: [],
  backgroundQueue: [],
  queuedPriorities: new Map(),
  rendering: new Set(),
  rendered: new Set(),
  pending: [],
});

const removeQueuedSlug = (queue: string[], slug: string) => {
  const index = queue.indexOf(slug);
  if (index >= 0) queue.splice(index, 1);
};

const enqueueRender = (request: RenderRequest) => {
  if (request.version < latestVersion) return;
  if (!activeJob || request.version > activeJob.version) activeJob = createJob(request);
  latestVersion = request.version;
  const job = activeJob;
  if (!job || job.version !== request.version) return;

  for (const slug of request.fontSlugs) {
    if (!fontsBySlug.has(slug) || job.rendered.has(slug) || job.rendering.has(slug)) continue;
    const queuedPriority = job.queuedPriorities.get(slug);
    if (queuedPriority === "high" || queuedPriority === request.priority) continue;
    if (queuedPriority === "background" && request.priority === "high") {
      removeQueuedSlug(job.backgroundQueue, slug);
    }
    job.queuedPriorities.set(slug, request.priority);
    (request.priority === "high" ? job.highQueue : job.backgroundQueue).push(slug);
  }

  void drainRenderQueue();
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === "init") {
    fonts = message.fonts;
    fontsBySlug = new Map(fonts.map((font) => [font.slug, font]));
    baseUrl = message.baseUrl;
    post({ type: "ready" });
    return;
  }
  if (message.type === "cancel") {
    if (message.version > latestVersion) latestVersion = message.version;
    if (activeJob && activeJob.version < latestVersion) activeJob = null;
    return;
  }
  if (message.type === "render") {
    enqueueRender(message);
    return;
  }
  if (message.type === "retry") {
    const font = fontsBySlug.get(message.fontSlug);
    if (!font) return;
    loaded.delete(font.slug);
    loadPromises.delete(font.slug);
    void renderOne(font, message.request).then((result) => {
      if (message.request.version === latestVersion) {
        activeJob?.rendered.add(font.slug);
        post({ type: "batch", version: message.request.version, results: [result] });
      }
    });
  }
};

export {};
