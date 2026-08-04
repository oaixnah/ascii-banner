import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clipboard,
  Code2,
  ExternalLink,
  Hash,
  Heart,
  History,
  LoaderCircle,
  Palette,
  Search,
  Star,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import ProductTour from "./ProductTour";
import { galleryMessages, type SiteLocale } from "../i18n/ui";
import { buildColorGradient, COLOR_KINDS, COLOR_PRESETS, DEFAULT_COLOR_SETTINGS, sanitizeColorSettings } from "../lib/color";
import { formatExport } from "../lib/export";
import { fontDetailPath } from "../lib/font-links";
import {
  BACKGROUND_RENDER_CHUNK,
  INITIAL_RENDER_COUNT,
  orderFontsForBackground,
  takeUnscheduledSlugs,
} from "../lib/render-scheduler";
import { buildShareQuery, DEFAULT_SHARE_STATE, parseShareState } from "../lib/share";
import {
  TEXT_HISTORY_STORAGE_KEY,
  addTextHistoryItem,
  parseTextHistory,
  removeTextHistoryItem,
  serializeTextHistory,
} from "../lib/text-history";
import type { TourStep } from "../lib/tour";
import type {
  ColorSettings,
  ExportFormat,
  FontCategory,
  FontManifestEntry,
  HorizontalLayout,
  RenderParameters,
  RenderPriority,
  RenderResult,
  WorkerRequest,
  WorkerResponse,
} from "../lib/types";

interface IdleDeadlineLike {
  didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
};

const shouldBackfillInBackground = () => {
  if (window.matchMedia("(max-width: 899px)").matches) return false;
  const connection = (navigator as NavigatorWithConnection).connection;
  if (connection?.saveData) return false;
  return connection?.effectiveType !== "slow-2g" && connection?.effectiveType !== "2g";
};

interface IdleHandle {
  kind: "idle" | "timeout";
  id: number;
}

const requestBrowserIdle = (callback: (deadline: IdleDeadlineLike) => void): IdleHandle => {
  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    return { kind: "idle", id: idleWindow.requestIdleCallback(callback, { timeout: 900 }) };
  }
  return {
    kind: "timeout",
    id: window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 240),
  };
};

const cancelBrowserIdle = (handle: IdleHandle | null) => {
  if (!handle) return;
  const idleWindow = window as IdleWindow;
  if (handle.kind === "idle") idleWindow.cancelIdleCallback?.(handle.id);
  else window.clearTimeout(handle.id);
};

interface Props {
  fonts: FontManifestEntry[];
  focusFontSlug?: string;
  compact?: boolean;
  locale?: SiteLocale;
  languageSwitchPath?: string;
}

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  throw new Error("Clipboard access is unavailable in this browser.");
};

interface StyledSelectOption<T extends string> {
  value: T;
  label: string;
}

interface StyledSelectProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<StyledSelectOption<T>>;
  onChange: (value: T) => void;
  leadingIcon?: ReactNode;
  variant?: "field" | "sort";
}

function StyledSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  leadingIcon,
  variant = "field",
}: StyledSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const summaryRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const menuId = `${id}-options`;

  const focusOption = (index: number) => {
    window.requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(".styled-select-option");
      items?.[Math.max(0, Math.min(index, items.length - 1))]?.focus();
    });
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    setOpen(true);
    focusOption(selectedIndex);
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>(".styled-select-option") ?? [])];
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null || !items.length) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const selectOption = (nextValue: T) => {
    onChange(nextValue);
    setOpen(false);
    summaryRef.current?.focus();
  };

  return (
    <details
      className={`styled-select styled-select--${variant}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        id={id}
        ref={summaryRef}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={handleTriggerKeyDown}
      >
        {leadingIcon && <span className="styled-select-leading" aria-hidden="true">{leadingIcon}</span>}
        <span className="styled-select-value">{selectedOption?.label}</span>
        <ChevronDown className="styled-select-chevron" size={variant === "sort" ? 14 : 16} aria-hidden="true" />
      </summary>
      <div
        id={menuId}
        className="styled-select-menu"
        ref={menuRef}
        role="listbox"
        aria-label={label}
        onKeyDown={handleMenuKeyDown}
      >
        {options.map((option) => (
          <button
            type="button"
            className="styled-select-option"
            role="option"
            aria-selected={option.value === value}
            key={option.value}
            onClick={() => selectOption(option.value)}
          >
            <span>{option.label}</span>
            <Check size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
    </details>
  );
}

export default function BannerGallery({ fonts, focusFontSlug, compact = false, locale = "en", languageSwitchPath }: Props) {
  const copy = galleryMessages[locale];
  const categoryLabels = copy.categories;
  const exportOptions = copy.exportOptions;
  const scopedFonts = useMemo(
    () => (focusFontSlug ? fonts.filter((font) => font.slug === focusFontSlug) : fonts),
    [fonts, focusFontSlug],
  );
  const [text, setText] = useState(DEFAULT_SHARE_STATE.text);
  const [width, setWidth] = useState(DEFAULT_SHARE_STATE.width);
  const [layout, setLayout] = useState<HorizontalLayout>(DEFAULT_SHARE_STATE.layout);
  const [color, setColor] = useState<ColorSettings>(DEFAULT_COLOR_SETTINGS);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [sort, setSort] = useState<"popular" | "az">("popular");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, RenderResult>>(new Map());
  const [workerReady, setWorkerReady] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");
  const [showAsciiWarning, setShowAsciiWarning] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showStyleRail, setShowStyleRail] = useState(false);
  const [tourReplayToken, setTourReplayToken] = useState(0);
  const [textHistory, setTextHistory] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeCardSlugs, setActiveCardSlugs] = useState<Set<string>>(() => new Set(
    orderFontsForBackground(scopedFonts)
      .slice(0, focusFontSlug ? scopedFonts.length : INITIAL_RENDER_COUNT)
      .map((font) => font.slug),
  ));
  const galleryRef = useRef<HTMLElement | null>(null);
  const galleryTopRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const fontListRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const textInputControlRef = useRef<HTMLDivElement | null>(null);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const versionRef = useRef(0);
  const activeRenderRef = useRef<RenderParameters | null>(null);
  const scheduledSlugsRef = useRef(new Set<string>());
  const renderedSlugsRef = useRef(new Set<string>());
  const backgroundOrderRef = useRef<string[]>([]);
  const idleHandleRef = useRef<IdleHandle | null>(null);
  const backgroundBackfillEnabledRef = useRef(false);
  const textRef = useRef(DEFAULT_SHARE_STATE.text);
  const textDirtyRef = useRef(false);
  const textHistoryRef = useRef<string[]>([]);
  const effectiveText = text || DEFAULT_SHARE_STATE.text;
  const historyPanelId = focusFontSlug ? `text-history-${focusFontSlug}` : "text-history-gallery";
  const previewGradient = useMemo(() => buildColorGradient(color), [color]);
  const tourSteps = useMemo<TourStep[]>(() => [
    { id: "text", target: '[data-tour="text"]', fallback: '[data-tour="controls"]', ...copy.tour.steps.text },
    { id: "display", target: '[data-tour="display"]', fallback: '[data-tour="controls"]', ...copy.tour.steps.display },
    { id: "color", target: '[data-tour="color"]', fallback: '[data-tour="controls"]', ...copy.tour.steps.color },
    { id: "browse", target: '[data-tour="browse"]', fallback: '[data-tour="gallery"]', ...copy.tour.steps.browse },
    { id: "copy", target: '[data-tour="copy"]', fallback: '[data-tour="gallery"]', ...copy.tour.steps.copy },
  ], [copy.tour.steps]);

  const cancelIdleBackfill = useCallback(() => {
    cancelBrowserIdle(idleHandleRef.current);
    idleHandleRef.current = null;
  }, []);

  const dispatchFonts = useCallback((fontSlugs: string[], priority: RenderPriority) => {
    const worker = workerRef.current;
    const request = activeRenderRef.current;
    if (!worker || !request || !fontSlugs.length) return;
    const uniqueSlugs = [...new Set(fontSlugs)];
    const nextSlugs = priority === "background"
      ? uniqueSlugs.filter((slug) => !scheduledSlugsRef.current.has(slug))
      : uniqueSlugs.filter((slug) => !renderedSlugsRef.current.has(slug));
    if (!nextSlugs.length) return;
    setRendering(true);
    for (const slug of nextSlugs) scheduledSlugsRef.current.add(slug);
    const message: WorkerRequest = {
      type: "render",
      ...request,
      fontSlugs: nextSlugs,
      priority,
    };
    worker.postMessage(message);
  }, []);

  const scheduleIdleBackfill = useCallback(() => {
    cancelIdleBackfill();
    if (!backgroundBackfillEnabledRef.current) return;
    const scheduleNextChunk = () => {
      if (!activeRenderRef.current) return;
      idleHandleRef.current = requestBrowserIdle((deadline) => {
        idleHandleRef.current = null;
        if (!activeRenderRef.current) return;
        const chunkSize = deadline.didTimeout || deadline.timeRemaining() < 5
          ? Math.max(8, Math.floor(BACKGROUND_RENDER_CHUNK / 2))
          : BACKGROUND_RENDER_CHUNK;
        const nextSlugs = takeUnscheduledSlugs(
          backgroundOrderRef.current,
          scheduledSlugsRef.current,
          chunkSize,
        );
        if (!nextSlugs.length) return;
        dispatchFonts(nextSlugs, "background");
        if (scheduledSlugsRef.current.size < backgroundOrderRef.current.length) scheduleNextChunk();
      });
    };
    scheduleNextChunk();
  }, [cancelIdleBackfill, dispatchFonts]);

  const persistTextHistory = useCallback((items: string[]) => {
    textHistoryRef.current = items;
    setTextHistory(items);
    try {
      window.localStorage.setItem(TEXT_HISTORY_STORAGE_KEY, serializeTextHistory(items));
    } catch {
      // History remains available for the current page when browser storage is unavailable.
    }
  }, []);

  const commitCurrentText = useCallback((force = false) => {
    if (!force && !textDirtyRef.current) return textHistoryRef.current;
    textDirtyRef.current = false;
    const next = addTextHistoryItem(textHistoryRef.current, textRef.current);
    if (
      next.length !== textHistoryRef.current.length ||
      next.some((item, index) => item !== textHistoryRef.current[index])
    ) persistTextHistory(next);
    return next;
  }, [persistTextHistory]);

  const focusTextInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      const input = textInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = parseShareState(params);
    textRef.current = shared.text;
    setText(shared.text);
    setWidth(shared.width);
    setLayout(shared.layout);
    let initialColor = shared.color;
    if (!params.has("color")) {
      const savedColor = window.localStorage.getItem("ascii-banner:color-settings");
      if (savedColor) {
        try {
          initialColor = sanitizeColorSettings(JSON.parse(savedColor) as Partial<ColorSettings>);
        } catch {
          window.localStorage.removeItem("ascii-banner:color-settings");
        }
      }
    }
    setColor(initialColor);
    const saved = window.localStorage.getItem("ascii-banner:favorites");
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved) as string[]));
      } catch {
        window.localStorage.removeItem("ascii-banner:favorites");
      }
    }
    const historyState = parseTextHistory(window.localStorage.getItem(TEXT_HISTORY_STORAGE_KEY));
    textHistoryRef.current = historyState.items;
    setTextHistory(historyState.items);
  }, []);

  useEffect(() => {
    const handlePageHide = () => commitCurrentText(false);
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [commitCurrentText]);

  useEffect(() => {
    if (!languageSwitchPath) return;
    const switchLink = document.querySelector<HTMLAnchorElement>("[data-language-switch]");
    if (!switchLink) return;
    switchLink.href = languageSwitchPath;
    const handleLanguageSwitch = (event: MouseEvent) => {
      event.preventDefault();
      const destination = `${languageSwitchPath}?${buildShareQuery({ text: effectiveText, width, layout, color })}`;
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
        window.open(destination, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(destination);
      }
    };
    switchLink.addEventListener("click", handleLanguageSwitch);
    return () => switchLink.removeEventListener("click", handleLanguageSwitch);
  }, [color, effectiveText, languageSwitchPath, layout, width]);

  useEffect(() => {
    setWorkerReady(false);
    activeRenderRef.current = null;
    scheduledSlugsRef.current.clear();
    renderedSlugsRef.current.clear();
    cancelIdleBackfill();
    const worker = new Worker(new URL("../workers/render.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "ready") {
        setWorkerReady(true);
        return;
      }
      if (message.version !== versionRef.current) return;
      if (message.type === "batch") {
        for (const result of message.results) renderedSlugsRef.current.add(result.fontSlug);
        setResults((current) => {
          const next = new Map(current);
          for (const result of message.results) next.set(result.fontSlug, result);
          return next;
        });
      }
    };
    const init: WorkerRequest = {
      type: "init",
      fonts: scopedFonts,
      baseUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href,
    };
    worker.postMessage(init);
    return () => {
      cancelIdleBackfill();
      activeRenderRef.current = null;
      workerRef.current = null;
      worker.terminate();
    };
  }, [cancelIdleBackfill, scopedFonts]);

  useEffect(() => {
    const scheduledCount = scheduledSlugsRef.current.size;
    if (
      results.size >= scopedFonts.length ||
      (!backgroundBackfillEnabledRef.current && scheduledCount > 0 && results.size >= scheduledCount)
    ) setRendering(false);
  }, [results.size, scopedFonts.length]);

  useEffect(() => {
    if (!workerReady || !workerRef.current) return;
    let version = versionRef.current;
    if (version === 0) {
      version = ++versionRef.current;
      const cancel: WorkerRequest = { type: "cancel", version };
      workerRef.current.postMessage(cancel);
    }
    const timeout = window.setTimeout(() => {
      const request: RenderParameters = {
        version,
        text: effectiveText,
        width,
        layout,
      };
      activeRenderRef.current = request;
      scheduledSlugsRef.current.clear();
      backgroundBackfillEnabledRef.current = shouldBackfillInBackground();
      backgroundOrderRef.current = orderFontsForBackground(scopedFonts).map((font) => font.slug);
      const initialSlugs = focusFontSlug
        ? backgroundOrderRef.current
        : backgroundOrderRef.current.slice(0, INITIAL_RENDER_COUNT);
      dispatchFonts(initialSlugs, "high");
      window.requestAnimationFrame(() => {
        const nearbySlugs = [...(fontListRef.current?.querySelectorAll<HTMLElement>(".font-card") ?? [])]
          .filter((card) => {
            const rect = card.getBoundingClientRect();
            return rect.top < window.innerHeight * 3 && rect.bottom > -window.innerHeight * 2;
          })
          .map((card) => card.dataset.font)
          .filter((slug): slug is string => Boolean(slug));
        dispatchFonts(nearbySlugs, "high");
      });
      scheduleIdleBackfill();
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [dispatchFonts, effectiveText, focusFontSlug, layout, scheduleIdleBackfill, scopedFonts, width, workerReady]);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const openMenus = () => [...gallery.querySelectorAll<HTMLDetailsElement>(".export-menu[open], .styled-select[open]")];
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      for (const menu of openMenus()) {
        if (!menu.contains(event.target)) menu.removeAttribute("open");
      }
      const isHistoryInteraction = Boolean(
        historyPanelRef.current?.contains(event.target) || historyButtonRef.current?.contains(event.target),
      );
      if (historyOpen && !isHistoryInteraction) setHistoryOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable = target instanceof HTMLElement && (
        target.isContentEditable || target.matches("input, textarea, select")
      );
      const isMenuControl = target instanceof HTMLElement && Boolean(target.closest(".styled-select, .export-menu, .text-history-panel"));
      const hasShortcutModifier = event.metaKey || event.ctrlKey || event.altKey;

      if (event.key === "Escape" && historyOpen) {
        event.preventDefault();
        setHistoryOpen(false);
        window.requestAnimationFrame(() => historyButtonRef.current?.focus());
        return;
      }

      if (event.key === "/" && !focusFontSlug && !hasShortcutModifier) {
        if (!isEditable && !isMenuControl && searchInputRef.current) {
          event.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }
      if (event.key.toLowerCase() === "t" && !hasShortcutModifier) {
        if (!isEditable && !isMenuControl && textInputRef.current) {
          event.preventDefault();
          textInputRef.current.focus();
          textInputRef.current.select();
        }
        return;
      }
      if (event.key !== "Escape") return;
      const menus = openMenus();
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const shouldBlur = Boolean(activeElement && gallery.contains(activeElement));
      if (!menus.length && !shouldBlur) return;
      event.preventDefault();
      for (const menu of menus) menu.removeAttribute("open");
      if (shouldBlur) activeElement?.blur();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusFontSlug, historyOpen]);

  useEffect(() => {
    let animationFrame = 0;
    const updateVisibility = () => {
      animationFrame = 0;
      const nextVisible = window.scrollY > 640;
      setShowBackToTop((current) => (current === nextVisible ? current : nextVisible));

      const toolbar = toolbarRef.current;
      const fontList = fontListRef.current;
      const stickyValue = window.getComputedStyle(document.documentElement).getPropertyValue("--tool-sticky-offset");
      const stickyOffset = Number.parseFloat(stickyValue) || 92;
      const isDesktop = window.matchMedia("(min-width: 1181px)").matches;
      let nextStyleRailVisible = false;
      if (!focusFontSlug && isDesktop && toolbar && fontList) {
        const toolbarRect = toolbar.getBoundingClientRect();
        const fontListRect = fontList.getBoundingClientRect();
        const toolbarIsPastViewport = toolbarRect.bottom <= stickyOffset;
        const previewsIntersectViewport = fontListRect.top < window.innerHeight && fontListRect.bottom > stickyOffset;
        nextStyleRailVisible = toolbarIsPastViewport && previewsIntersectViewport && fontList.childElementCount > 0;
      }
      setShowStyleRail((current) => (current === nextStyleRailVisible ? current : nextStyleRailVisible));
    };
    const scheduleVisibilityUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleVisibilityUpdate);
    if (toolbarRef.current) resizeObserver?.observe(toolbarRef.current);
    if (fontListRef.current) resizeObserver?.observe(fontListRef.current);
    window.addEventListener("scroll", scheduleVisibilityUpdate, { passive: true });
    window.addEventListener("resize", scheduleVisibilityUpdate);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleVisibilityUpdate);
      window.removeEventListener("resize", scheduleVisibilityUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [focusFontSlug]);

  const visibleFonts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = scopedFonts.filter((font) => {
      if (normalizedQuery && !font.name.toLowerCase().includes(normalizedQuery)) return false;
      if (category !== "all" && font.category !== category) return false;
      if (favoritesOnly && !favorites.has(font.slug)) return false;
      return true;
    });
    if (sort === "az") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return [...filtered].sort((a, b) => {
      if (a.popularRank && b.popularRank) return a.popularRank - b.popularRank;
      if (a.popularRank) return -1;
      if (b.popularRank) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [category, favorites, favoritesOnly, query, scopedFonts, sort]);

  useEffect(() => {
    const fontList = fontListRef.current;
    if (!fontList || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const nearbySlugs = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => (entry.target as HTMLElement).dataset.font)
        .filter((slug): slug is string => Boolean(slug));
      if (nearbySlugs.length) {
        setActiveCardSlugs((current) => {
          const next = new Set(current);
          let changed = false;
          for (const slug of nearbySlugs) {
            if (next.has(slug)) continue;
            next.add(slug);
            changed = true;
          }
          return changed ? next : current;
        });
      }
      dispatchFonts(nearbySlugs, "high");
    }, { rootMargin: "200% 0px", threshold: 0 });

    const cards = [...fontList.querySelectorAll<HTMLElement>(".font-card")];
    for (const card of cards) observer.observe(card);
    if (query.trim()) {
      const searchSlugs = visibleFonts.slice(0, BACKGROUND_RENDER_CHUNK).map((font) => font.slug);
      setActiveCardSlugs((current) => new Set([...current, ...searchSlugs]));
      dispatchFonts(searchSlugs, "high");
    }
    return () => observer.disconnect();
  }, [dispatchFonts, query, visibleFonts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<FontCategory | "all", number> = {
      all: 0,
      compact: 0,
      block: 0,
      "3d": 0,
      script: 0,
      novelty: 0,
    };
    const normalizedQuery = query.trim().toLowerCase();
    for (const font of scopedFonts) {
      if (normalizedQuery && !font.name.toLowerCase().includes(normalizedQuery)) continue;
      if (favoritesOnly && !favorites.has(font.slug)) continue;
      counts.all += 1;
      counts[font.category] += 1;
    }
    return counts;
  }, [favorites, favoritesOnly, query, scopedFonts]);

  const invalidateRender = () => {
    const version = ++versionRef.current;
    activeRenderRef.current = null;
    scheduledSlugsRef.current.clear();
    renderedSlugsRef.current.clear();
    cancelIdleBackfill();
    const cancel: WorkerRequest = { type: "cancel", version };
    workerRef.current?.postMessage(cancel);
    setResults((current) => (current.size ? new Map() : current));
    setRendering(true);
  };

  const updateText = (nextText: string) => {
    textRef.current = nextText;
    if (nextText === text) return;
    invalidateRender();
    setText(nextText);
  };

  const handleTextInput = (rawText: string) => {
    const sanitized = rawText.replace(/[^\x20-\x7E]/g, "").slice(0, 40);
    setShowAsciiWarning(sanitized !== rawText);
    if (sanitized !== textRef.current) textDirtyRef.current = true;
    updateText(sanitized);
  };

  const handleTextKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitCurrentText(true);
  };

  const clearText = () => {
    commitCurrentText(true);
    textDirtyRef.current = false;
    setShowAsciiWarning(false);
    setHistoryOpen(false);
    updateText("");
    focusTextInput();
  };

  const toggleTextHistory = () => {
    if (!historyOpen) commitCurrentText(true);
    setHistoryOpen((current) => !current);
  };

  const handleHistoryButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    commitCurrentText(true);
    setHistoryOpen(true);
    window.requestAnimationFrame(() => {
      historyPanelRef.current?.querySelector<HTMLButtonElement>(".history-restore-button")?.focus();
    });
  };

  const restoreTextHistory = (value: string) => {
    persistTextHistory(addTextHistoryItem(textHistoryRef.current, value));
    textDirtyRef.current = false;
    setShowAsciiWarning(false);
    setHistoryOpen(false);
    updateText(value);
    focusTextInput();
  };

  const deleteTextHistory = (value: string) => {
    persistTextHistory(removeTextHistoryItem(textHistoryRef.current, value));
  };

  const clearTextHistory = () => {
    persistTextHistory([]);
  };

  const updateWidth = (nextWidth: number) => {
    if (nextWidth === width) return;
    invalidateRender();
    setWidth(nextWidth);
  };

  const updateLayout = (nextLayout: HorizontalLayout) => {
    if (nextLayout === layout) return;
    invalidateRender();
    setLayout(nextLayout);
  };

  const updateColor = (nextColor: Partial<ColorSettings>) => {
    setColor((current) => {
      const next = sanitizeColorSettings({ ...current, ...nextColor });
      window.localStorage.setItem("ascii-banner:color-settings", JSON.stringify(next));
      return next;
    });
  };

  const preferredScrollBehavior = () => (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  );

  const selectCategory = (nextCategory: FontCategory | "all") => {
    setCategory(nextCategory);
    window.requestAnimationFrame(() => {
      galleryTopRef.current?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  };

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      window.localStorage.setItem("ascii-banner:favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const handleCopy = async (slug: string, output: string, format: ExportFormat) => {
    await copyText(formatExport(output, format, color));
    const key = `${slug}:${format}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 1400);
  };

  const retry = (fontSlug: string) => {
    const request: WorkerRequest = {
      type: "retry",
      fontSlug,
      request: { version: versionRef.current, text: effectiveText, width, layout },
    };
    workerRef.current?.postMessage(request);
  };

  return (
    <section ref={galleryRef} className={`tool-shell ${compact ? "tool-shell--compact" : ""}`} aria-label={locale === "zh" ? "ASCII Banner 生成器" : "ASCII banner generator"} data-tour-root={!focusFontSlug && !compact ? "true" : undefined} data-clarity-mask>
      <aside className="control-panel" data-tour={!focusFontSlug && !compact ? "controls" : undefined}>
        <div className="panel-heading">
          <span className="eyebrow"><Terminal size={14} /> {copy.liveInput}</span>
          <span className="panel-heading-actions">
            <span className="character-count">{text.length}/40</span>
            {!focusFontSlug && !compact && (
              <button
                className="tour-help-button"
                type="button"
                aria-label={copy.tour.helpLabel}
                title={copy.tour.helpLabel}
                onClick={() => setTourReplayToken((current) => current + 1)}
              >
                <CircleHelp size={15} aria-hidden="true" />
              </button>
            )}
          </span>
        </div>

        <label className="field-label field-label--shortcut" htmlFor={focusFontSlug ? `banner-text-${focusFontSlug}` : "banner-text"}>
          <span>{copy.yourText}</span>
          <kbd className="shortcut-key">T</kbd>
        </label>
        <div
          className="text-input-control"
          ref={textInputControlRef}
          data-tour={!focusFontSlug && !compact ? "text" : undefined}
        >
          <input
            ref={textInputRef}
            id={focusFontSlug ? `banner-text-${focusFontSlug}` : "banner-text"}
            className="banner-input"
            value={text}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={!focusFontSlug || showAsciiWarning ? "input-help" : undefined}
            aria-invalid={showAsciiWarning}
            aria-keyshortcuts="T"
            onBlur={() => commitCurrentText(false)}
            onChange={(event) => handleTextInput(event.target.value)}
            onKeyDown={handleTextKeyDown}
          />
          <span className="text-input-actions">
            <button
              ref={historyButtonRef}
              className={`text-input-icon ${historyOpen ? "is-active" : ""}`}
              type="button"
              aria-label={historyOpen ? copy.closeHistory : copy.openHistory}
              aria-haspopup="dialog"
              aria-expanded={historyOpen}
              aria-controls={historyPanelId}
              title={historyOpen ? copy.closeHistory : copy.openHistory}
              onClick={toggleTextHistory}
              onKeyDown={handleHistoryButtonKeyDown}
            >
              <History size={16} aria-hidden="true" />
            </button>
            {text && (
              <button
                className="text-input-icon"
                type="button"
                aria-label={copy.clearText}
                title={copy.clearText}
                onClick={clearText}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </span>
          {historyOpen && (
            <div
              className="text-history-panel"
              id={historyPanelId}
              ref={historyPanelRef}
              role="dialog"
              aria-labelledby={`${historyPanelId}-title`}
            >
              <div className="text-history-heading">
                <span>
                  <strong id={`${historyPanelId}-title`}>{copy.historyTitle}</strong>
                  <small>{copy.historyLocal}</small>
                </span>
                {textHistory.length > 0 && (
                  <button className="text-history-clear" type="button" onClick={clearTextHistory}>
                    {copy.clearHistory}
                  </button>
                )}
              </div>
              {textHistory.length ? (
                <ul className="text-history-list">
                  {textHistory.map((item) => (
                    <li key={item}>
                      <button
                        className="history-restore-button"
                        type="button"
                        aria-label={copy.restoreHistory(item)}
                        title={copy.restoreHistory(item)}
                        onClick={() => restoreTextHistory(item)}
                      >
                        <span>{item}</span>
                      </button>
                      <button
                        className="history-delete-button"
                        type="button"
                        aria-label={copy.deleteHistory(item)}
                        title={copy.deleteHistory(item)}
                        onClick={() => deleteTextHistory(item)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-history-empty">{copy.historyEmpty}</p>
              )}
            </div>
          )}
        </div>
        {(!focusFontSlug || showAsciiWarning) && (
          <p className={`field-help ${showAsciiWarning ? "is-error" : ""}`} id="input-help" aria-live="polite">
            {showAsciiWarning ? copy.asciiRejected : copy.asciiHelp}
          </p>
        )}

        <div className="control-group" data-tour={!focusFontSlug && !compact ? "display" : undefined}>
          <div className="control-label-row">
            <span className="field-label">{copy.targetWidth}</span>
            <span className="control-value">{width} {copy.columnsShort}</span>
          </div>
          <div className="width-controls">
            {[80, 100, 120].map((preset) => (
              <button
                type="button"
                className={`segment-button ${width === preset ? "is-active" : ""}`}
                aria-pressed={width === preset}
                key={preset}
                onClick={() => updateWidth(preset)}
              >
                {preset}
              </button>
            ))}
            <div className="number-input-wrap">
              <input
                className="width-input"
                type="number"
                min={40}
                max={200}
                aria-label={locale === "zh" ? "自定义目标宽度" : "Custom target width"}
                value={width}
                onChange={(event) => updateWidth(Math.min(200, Math.max(40, Number(event.target.value) || 40)))}
              />
              <span className="number-stepper">
                <button
                  type="button"
                  aria-label={locale === "zh" ? "增加目标宽度" : "Increase target width"}
                  disabled={width >= 200}
                  onClick={() => updateWidth(Math.min(200, width + 1))}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  aria-label={locale === "zh" ? "减少目标宽度" : "Decrease target width"}
                  disabled={width <= 40}
                  onClick={() => updateWidth(Math.max(40, width - 1))}
                >
                  <ChevronDown size={12} />
                </button>
              </span>
            </div>
          </div>
        </div>

        <span className="field-label">
          {copy.letterSpacing}
        </span>
        <StyledSelect
          id={focusFontSlug ? `layout-${focusFontSlug}` : "layout"}
          label={copy.letterSpacing}
          value={layout}
          options={[
            { value: "default", label: copy.layoutDefault },
            { value: "fitted", label: copy.layoutFitted },
            { value: "full", label: copy.layoutFull },
          ]}
          onChange={updateLayout}
        />

        <div className="control-group color-control" data-tour={!focusFontSlug && !compact ? "color" : undefined}>
          <div className="control-label-row">
            <span className="field-label"><Palette size={14} /> {copy.colorLabel}</span>
          </div>
          <div className="color-preset-grid" role="group" aria-label={copy.colorThemes}>
            {COLOR_PRESETS.map((preset) => {
              const presetSettings = preset === "custom" ? color : { ...color, preset };
              const background = preset === "mono" ? "var(--text)" : buildColorGradient(presetSettings);
              return (
                <button
                  type="button"
                  className={`color-preset ${color.preset === preset ? "is-active" : ""}`}
                  aria-label={copy.selectColor(copy.colorPresets[preset])}
                  aria-pressed={color.preset === preset}
                  data-color-preset={preset}
                  key={preset}
                  onClick={() => updateColor({ preset })}
                >
                  <span className="color-swatch" style={{ background }} aria-hidden="true" />
                  <span>{copy.colorPresets[preset]}</span>
                </button>
              );
            })}
          </div>
          {color.preset === "custom" && (
            <div className="custom-color-panel">
              <div className="color-kind-toggle" role="group" aria-label={copy.colorKind}>
                {COLOR_KINDS.map((kind) => (
                  <button
                    type="button"
                    className={color.kind === kind ? "is-active" : ""}
                    aria-pressed={color.kind === kind}
                    key={kind}
                    onClick={() => updateColor({ kind })}
                  >
                    {kind === "solid" ? copy.solidColor : copy.gradientColor}
                  </button>
                ))}
              </div>
              <div className="color-pickers">
                <label>
                  <span>{copy.startColor}</span>
                  <input
                    type="color"
                    aria-label={copy.startColor}
                    value={color.start}
                    onChange={(event) => updateColor({ start: event.target.value })}
                  />
                </label>
                {color.kind === "gradient" && (
                  <label>
                    <span>{copy.endColor}</span>
                    <input
                      type="color"
                      aria-label={copy.endColor}
                      value={color.end}
                      onChange={(event) => updateColor({ end: event.target.value })}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {!focusFontSlug && (
          <div className="privacy-note">
            <span className="privacy-dot" />
            {copy.privacyNote}
          </div>
        )}
      </aside>

      <div className="gallery-panel" ref={galleryTopRef} data-tour={!focusFontSlug && !compact ? "gallery" : undefined}>
        {!focusFontSlug && (
          <div className="gallery-toolbar" ref={toolbarRef} data-tour={!compact ? "browse" : undefined}>
            <div className="search-field">
              <Search size={17} />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchPlaceholder.replace("…", "")}
                aria-keyshortcuts="/"
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd className="shortcut-key">/</kbd>
            </div>
            <div className="filter-row" aria-label={copy.fontFilters}>
              {(Object.keys(categoryLabels) as Array<FontCategory | "all">).map((value) => (
                <button
                  type="button"
                  className={`filter-chip ${category === value ? "is-active" : ""}`}
                  aria-pressed={category === value}
                  onClick={() => selectCategory(value)}
                  key={value}
                >
                  {categoryLabels[value]}
                </button>
              ))}
              <button
                type="button"
                className={`filter-chip ${favoritesOnly ? "is-active" : ""}`}
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((value) => !value)}
              >
                <Heart size={14} fill={favoritesOnly ? "currentColor" : "none"} /> {copy.favorites}
              </button>
              <StyledSelect
                id="font-sort"
                label={copy.sortFonts}
                value={sort}
                options={[
                  { value: "popular", label: copy.featuredFirst },
                  { value: "az", label: copy.alphabetical },
                ]}
                onChange={setSort}
                leadingIcon={<ArrowUpDown size={14} strokeWidth={1.8} />}
                variant="sort"
              />
            </div>
          </div>
        )}

        <div className="gallery-status" aria-live="polite">
          <span>{copy.fontCount(visibleFonts.length, Boolean(query || category !== "all" || favoritesOnly))}</span>
          <span className={rendering ? "render-state is-active" : "render-state"}>
            {rendering ? <LoaderCircle size={14} /> : <Check size={14} />}
            {rendering
              ? copy.rendering(
                results.size,
                backgroundBackfillEnabledRef.current ? scopedFonts.length : Math.max(results.size, scheduledSlugsRef.current.size),
              )
              : results.size >= scopedFonts.length ? copy.allUpdated : copy.browseReady}
          </span>
        </div>

        <div className="font-list" ref={fontListRef}>
          {visibleFonts.map((font, fontIndex) => {
            const result = results.get(font.slug);
            const isFavorite = favorites.has(font.slug);
            const isWide = Boolean(result && result.columns > width);
            const rawCopied = copiedKey === `${font.slug}:plain`;
            const isActiveCard = activeCardSlugs.has(font.slug);
            return (
              <article
                className="font-card"
                key={font.slug}
                data-font={font.slug}
                data-render-state={result ? "ready" : "pending"}
                data-tour={!focusFontSlug && !compact && fontIndex === 0 ? "copy" : undefined}
              >
                {isActiveCard ? <header className="font-card-header">
                  <div className="font-identity">
                    <button
                      className="favorite-button"
                      type="button"
                      aria-label={isFavorite ? copy.removeFavorite(font.name) : copy.addFavorite(font.name)}
                      aria-pressed={isFavorite}
                      onClick={() => toggleFavorite(font.slug)}
                    >
                      <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                    <div>
                      <h3>{font.name}</h3>
                      <span className="font-meta">
                        {result ? `${result.columns} × ${result.rows}` : locale === "zh" ? `${font.height} 行` : `${font.height} rows`} · {categoryLabels[font.category]}
                      </span>
                    </div>
                  </div>
                  <div className="card-actions">
                    {isWide && (
                      <span className="width-warning" title={copy.wideTitle(width)}>
                        <AlertTriangle size={14} /> {copy.wide}
                      </span>
                    )}
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={copy.openShare(font.name)}
                      onClick={() => window.open(
                        `${fontDetailPath(font, locale)}?${buildShareQuery({ text: effectiveText, width, layout, color })}`,
                        "_blank",
                        "noopener,noreferrer",
                      )}
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      className="copy-primary"
                      type="button"
                      disabled={!result?.output}
                      aria-label={rawCopied ? copy.copied(font.name) : copy.copyRaw(font.name)}
                      title={rawCopied ? copy.copiedTitle : copy.copyRawTitle}
                      onClick={() => result && handleCopy(font.slug, result.output, "plain")}
                    >
                      {rawCopied ? <Check size={16} /> : <Clipboard size={16} />}
                    </button>
                    <details className="export-menu">
                      <summary aria-label={copy.moreExports(font.name)}>
                        <ChevronDown size={16} />
                      </summary>
                      <div className="export-popover">
                        <span className="export-heading">{copy.exportHeading}</span>
                        {exportOptions.map((option) => {
                          const copied = copiedKey === `${font.slug}:${option.value}`;
                          return (
                            <button
                              type="button"
                              key={option.value}
                              disabled={!result?.output}
                              onClick={(event) => {
                                if (result) void handleCopy(font.slug, result.output, option.value);
                                (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                              }}
                            >
                              {option.value === "ansi" ? <Terminal size={15} /> : option.value === "markdown" ? <Code2 size={15} /> : option.value === "hash-comment" ? <Hash size={15} /> : <Clipboard size={15} />}
                              <span><strong>{copied ? copy.copiedTitle : option.label}</strong><small>{option.hint}</small></span>
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                </header> : (
                  <header className="font-card-header font-card-header--dormant">
                    <div className="font-identity">
                      <div>
                        <h3>{font.name}</h3>
                        <span className="font-meta">
                          {locale === "zh" ? `${font.height} 行` : `${font.height} rows`} · {categoryLabels[font.category]}
                        </span>
                      </div>
                    </div>
                  </header>
                )}
                <div className={`ascii-preview ${result?.error ? "has-error" : ""}`}>
                  {!isActiveCard ? (
                    <div className="preview-skeleton preview-skeleton--dormant" aria-label={copy.renderingFont(font.name)}>
                      <span /> <span />
                    </div>
                  ) : result?.error ? (
                    <div className="render-error">
                      <AlertTriangle size={18} />
                      <span>{result.error}</span>
                      <button type="button" onClick={() => retry(font.slug)}>{copy.retry}</button>
                    </div>
                  ) : result?.output ? (
                    <pre
                      className={color.preset === "mono" ? undefined : "is-colored"}
                      data-color-preset={color.preset}
                      style={color.preset === "mono" ? undefined : {
                        "--ascii-gradient": previewGradient,
                        "--ascii-gradient-width": `${Math.max(1, result.columns)}ch`,
                      } as CSSProperties}
                    >{result.output}</pre>
                  ) : (
                    <div className="preview-skeleton" aria-label={copy.renderingFont(font.name)}>
                      <span /> <span /> <span /> <span />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {!visibleFonts.length && (
          <div className="empty-state">
            <Search size={24} />
            <h3>{copy.noMatches}</h3>
            <p>{copy.noMatchesHelp}</p>
            <button type="button" onClick={() => { setQuery(""); setCategory("all"); setFavoritesOnly(false); }}>
              {copy.clearFilters}
            </button>
          </div>
        )}
      </div>

      {!focusFontSlug && (
        <aside className={`style-rail ${showStyleRail ? "is-visible" : ""}`} aria-hidden={!showStyleRail}>
          {showStyleRail && (
            <>
              <span className="style-rail-heading">{copy.browseStyles}</span>
              <nav className="style-rail-nav" aria-label={copy.styleCategories}>
                {(Object.keys(categoryLabels) as Array<FontCategory | "all">).map((value) => (
                  <button
                    type="button"
                    className={`style-rail-link ${category === value ? "is-active" : ""}`}
                    aria-current={category === value ? "true" : undefined}
                    aria-pressed={category === value}
                    disabled={categoryCounts[value] === 0}
                    onClick={() => selectCategory(value)}
                    key={value}
                  >
                    <span>{categoryLabels[value]}</span>
                    <span>{categoryCounts[value]}</span>
                  </button>
                ))}
              </nav>
            </>
          )}
        </aside>
      )}

      {showBackToTop && (
        <button className="back-to-top" type="button" aria-label={copy.backToTop} onClick={scrollToTop}>
          <ArrowUp size={17} aria-hidden="true" />
          <span>{copy.top}</span>
        </button>
      )}

      {!focusFontSlug && !compact && (
        <ProductTour
          copy={copy.tour}
          ready={!rendering || results.size >= Math.min(20, scopedFonts.length)}
          replayToken={tourReplayToken}
          steps={tourSteps}
        />
      )}
    </section>
  );
}
