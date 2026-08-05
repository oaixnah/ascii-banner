import type { ColorPreset, ExportFormat, FontCategory } from "../lib/types";
import type { TourMessages } from "../lib/tour";

export type SiteLocale = "en" | "zh";

interface SiteMessages {
  htmlLang: string;
  ogLocale: string;
  alternateOgLocale: string;
  homeLabel: string;
  mainNavigation: string;
  allFonts: string;
  guides: string;
  about: string;
  openGenerator: string;
  languageSwitch: string;
  languageSwitchLabel: string;
  footerSummary: string;
  generate: string;
  useCases: string;
  company: string;
  githubReadme: string;
  codeComments: string;
  terminalBanner: string;
  cliApps: string;
  contact: string;
  privacy: string;
  terms: string;
  analyticsSettings: string;
  analyticsConsentEyebrow: string;
  analyticsConsentTitle: string;
  analyticsConsentDescription: string;
  analyticsConsentPrivacy: string;
  analyticsAccept: string;
  analyticsDecline: string;
  analyticsMinimizeTemplate: string;
  analyticsReviewChoice: string;
  footerTagline: string;
  footerFacts: (fontCount: number) => string;
  breadcrumb: string;
  lastUpdated: string;
  socialImageAlt: string;
}

export const siteMessages: Record<SiteLocale, SiteMessages> = {
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    alternateOgLocale: "zh_CN",
    homeLabel: "ASCII Banner home",
    mainNavigation: "Main navigation",
    allFonts: "All fonts",
    guides: "Guides",
    about: "About",
    openGenerator: "Open generator",
    languageSwitch: "中文",
    languageSwitchLabel: "切换到中文",
    footerSummary: "Browse the complete FIGlet catalog, then copy production-ready banners for READMEs, terminals, and source code.",
    generate: "Generate",
    useCases: "Use cases",
    company: "Company",
    githubReadme: "GitHub README",
    codeComments: "Code comments",
    terminalBanner: "Terminal banner",
    cliApps: "CLI apps",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
    analyticsSettings: "Analytics settings",
    analyticsConsentEyebrow: "Optional analytics",
    analyticsConsentTitle: "Help improve ASCII Banner?",
    analyticsConsentDescription: "With your permission, Google Analytics measures page visits and Microsoft Clarity provides masked interaction insights. Banner text is excluded.",
    analyticsConsentPrivacy: "Privacy details",
    analyticsAccept: "Allow analytics",
    analyticsDecline: "Decline",
    analyticsMinimizeTemplate: "Minimizes in {seconds}s",
    analyticsReviewChoice: "Review analytics choice",
    footerTagline: "Built for people who ship from a terminal.",
    footerFacts: (fontCount) => `${fontCount} fonts · local rendering · no sign-up`,
    breadcrumb: "Breadcrumb",
    lastUpdated: "Last updated",
    socialImageAlt: "ASCII Banner — Your text. Every banner.",
  },
  zh: {
    htmlLang: "zh-CN",
    ogLocale: "zh_CN",
    alternateOgLocale: "en_US",
    homeLabel: "ASCII Banner 中文首页",
    mainNavigation: "主导航",
    allFonts: "全部字体",
    guides: "使用指南",
    about: "关于",
    openGenerator: "打开生成器",
    languageSwitch: "EN",
    languageSwitchLabel: "Switch to English",
    footerSummary: "浏览完整 FIGlet 字体目录，再将适合 README、终端和源代码的 ASCII Banner 直接复制使用。",
    generate: "生成",
    useCases: "使用场景",
    company: "网站信息",
    githubReadme: "GitHub README",
    codeComments: "代码注释",
    terminalBanner: "终端 Banner",
    cliApps: "CLI 应用",
    contact: "联系",
    privacy: "隐私",
    terms: "使用条款",
    analyticsSettings: "分析设置",
    analyticsConsentEyebrow: "可选分析",
    analyticsConsentTitle: "愿意帮助我们改进 ASCII Banner 吗？",
    analyticsConsentDescription: "经你同意后，Google Analytics 会统计页面访问，Microsoft Clarity 会提供经过遮罩的交互洞察；Banner 输入文字不会被采集。",
    analyticsConsentPrivacy: "查看隐私说明",
    analyticsAccept: "允许分析",
    analyticsDecline: "拒绝",
    analyticsMinimizeTemplate: "{seconds} 秒后收起",
    analyticsReviewChoice: "查看分析选项",
    footerTagline: "为习惯从终端交付作品的开发者而做。",
    footerFacts: (fontCount) => `${fontCount} 种字体 · 本地生成 · 无需注册`,
    breadcrumb: "面包屑导航",
    lastUpdated: "最后更新",
    socialImageAlt: "ASCII Banner——输入一次，预览全部艺术字。",
  },
};

interface GalleryMessages {
  categories: Record<FontCategory | "all", string>;
  exportOptions: Array<{ value: ExportFormat; label: string; hint: string }>;
  liveInput: string;
  yourText: string;
  asciiHelp: string;
  asciiRejected: string;
  clearText: string;
  openHistory: string;
  closeHistory: string;
  historyTitle: string;
  historyEmpty: string;
  historyLocal: string;
  restoreHistory: (text: string) => string;
  deleteHistory: (text: string) => string;
  clearHistory: string;
  targetWidth: string;
  columnsShort: string;
  letterSpacing: string;
  layoutDefault: string;
  layoutFitted: string;
  layoutFull: string;
  colorLabel: string;
  colorThemes: string;
  colorPresets: Record<ColorPreset, string>;
  selectColor: (color: string) => string;
  colorKind: string;
  solidColor: string;
  gradientColor: string;
  startColor: string;
  endColor: string;
  privacyNote: string;
  searchPlaceholder: string;
  fontFilters: string;
  favorites: string;
  sortFonts: string;
  featuredFirst: string;
  alphabetical: string;
  fontCount: (count: number, filtered: boolean) => string;
  fontsVisible: (shown: number, total: number) => string;
  showMoreFonts: (count: number) => string;
  rendering: (done: number, total: number) => string;
  allUpdated: string;
  browseReady: string;
  addFavorite: (font: string) => string;
  removeFavorite: (font: string) => string;
  wide: string;
  wideTitle: (width: number) => string;
  openShare: (font: string) => string;
  copied: (font: string) => string;
  copyRaw: (font: string) => string;
  copiedTitle: string;
  copyRawTitle: string;
  moreExports: (font: string) => string;
  exportHeading: string;
  retry: string;
  renderingFont: (font: string) => string;
  noMatches: string;
  noMatchesHelp: string;
  clearFilters: string;
  browseStyles: string;
  styleCategories: string;
  backToTop: string;
  top: string;
  tour: TourMessages;
}

export const galleryMessages: Record<SiteLocale, GalleryMessages> = {
  en: {
    categories: { all: "All styles", compact: "Compact", block: "Block", "3d": "3D", script: "Script", novelty: "Novelty" },
    exportOptions: [
      { value: "plain", label: "Raw text", hint: ".txt, terminal" },
      { value: "ansi", label: "ANSI Truecolor", hint: "Modern terminals" },
      { value: "markdown", label: "Markdown block", hint: "README.md" },
      { value: "c-block", label: "C-style comment", hint: "JS, Go, Rust" },
      { value: "hash-comment", label: "Hash comment", hint: "Shell, Python" },
      { value: "html-comment", label: "HTML comment", hint: "HTML, XML" },
    ],
    liveInput: "Live input",
    yourText: "Your text",
    asciiHelp: "Printable ASCII only. Empty input previews “Hello World”.",
    asciiRejected: "Chinese and other non-ASCII characters cannot be rendered by FIGlet fonts.",
    clearText: "Clear text",
    openHistory: "Open text history",
    closeHistory: "Close text history",
    historyTitle: "Recent text",
    historyEmpty: "No saved text yet",
    historyLocal: "Saved only in this browser",
    restoreHistory: (text) => `Restore “${text}”`,
    deleteHistory: (text) => `Delete “${text}” from history`,
    clearHistory: "Clear all history",
    targetWidth: "Target width",
    columnsShort: "cols",
    letterSpacing: "Letter spacing",
    layoutDefault: "Font default",
    layoutFitted: "Fitted",
    layoutFull: "Full width",
    colorLabel: "Color",
    colorThemes: "Color themes",
    colorPresets: { mono: "Mono", cyan: "Cyan", matrix: "Matrix", sunset: "Sunset", rainbow: "Rainbow", custom: "Custom" },
    selectColor: (color) => `Use ${color} color theme`,
    colorKind: "Custom color style",
    solidColor: "Solid",
    gradientColor: "Gradient",
    startColor: "Start color",
    endColor: "End color",
    privacyNote: "Runs locally. Recent text history stays on this device and can be deleted.",
    searchPlaceholder: "Find a font…",
    fontFilters: "Font filters",
    favorites: "Favorites",
    sortFonts: "Sort fonts",
    featuredFirst: "Featured first",
    alphabetical: "A–Z",
    fontCount: (count, filtered) => `${count} ${count === 1 ? "font" : "fonts"}${filtered ? " shown" : " ready to browse"}`,
    fontsVisible: (shown, total) => `Showing ${shown} of ${total}`,
    showMoreFonts: (count) => `Show ${count} more fonts`,
    rendering: (done, total) => `Rendering ${done}/${total}`,
    allUpdated: "All previews updated",
    browseReady: "Nearby previews updated · more render as you browse",
    addFavorite: (font) => `Add ${font} to favorites`,
    removeFavorite: (font) => `Remove ${font} from favorites`,
    wide: "Wide",
    wideTitle: (width) => `This output is wider than ${width} columns`,
    openShare: (font) => `Open ${font} share page`,
    copied: (font) => `${font} copied`,
    copyRaw: (font) => `Copy ${font} as raw text`,
    copiedTitle: "Copied",
    copyRawTitle: "Copy raw text",
    moreExports: (font) => `More export options for ${font}`,
    exportHeading: "Copy for your workflow",
    retry: "Retry",
    renderingFont: (font) => `Rendering ${font}`,
    noMatches: "No matching fonts",
    noMatchesHelp: "Try a broader search or clear the active filters.",
    clearFilters: "Clear filters",
    browseStyles: "Browse styles",
    styleCategories: "Style categories",
    backToTop: "Back to top",
    top: "Top",
    tour: {
      helpLabel: "Open product tour",
      welcomeEyebrow: "Quick tour",
      welcomeTitle: "New here? Take the 60-second tour.",
      welcomeDescription: "See how to turn one line of text into hundreds of banners and copy the right format for your project.",
      start: "Show me around",
      notNow: "Not now",
      back: "Back",
      next: "Next",
      skip: "Skip tour",
      finish: "Finish",
      closeLabel: "Close product tour",
      progress: (current, total) => `Step ${current} of ${total}`,
      steps: {
        text: {
          title: "Type once, update every font",
          description: "Enter up to 40 printable ASCII characters. Every banner refreshes together; clear the field or revisit recent text from the input controls.",
        },
        display: {
          title: "Tune the banner dimensions",
          description: "Choose a target width and letter spacing. Wide results remain horizontally scrollable without changing the artwork.",
        },
        color: {
          title: "Preview in color",
          description: "Apply a solid color or gradient to every preview. Regular copy formats stay plain; ANSI Truecolor preserves color for modern terminals.",
        },
        browse: {
          title: "Find the right style quickly",
          description: "Search by font name, filter by category or favorites, and switch between featured and A–Z ordering.",
        },
        copy: {
          title: "Copy for your workflow",
          description: "Use the main icon for raw text, or open the arrow menu for Markdown, comments, ANSI terminal output, and other formats.",
        },
      },
    },
  },
  zh: {
    categories: { all: "全部样式", compact: "紧凑", block: "块状", "3d": "3D", script: "手写", novelty: "创意" },
    exportOptions: [
      { value: "plain", label: "纯文本", hint: ".txt、终端" },
      { value: "ansi", label: "ANSI 真彩色", hint: "现代终端" },
      { value: "markdown", label: "Markdown 代码块", hint: "README.md" },
      { value: "c-block", label: "C 风格块注释", hint: "JS、Go、Rust" },
      { value: "hash-comment", label: "# 行注释", hint: "Shell、Python" },
      { value: "html-comment", label: "HTML 注释", hint: "HTML、XML" },
    ],
    liveInput: "实时输入",
    yourText: "输入文字",
    asciiHelp: "仅支持英文、数字和标准 ASCII 标点；留空时预览“Hello World”。",
    asciiRejected: "FIGlet 字体不包含中文字形，暂时无法生成中文字符。",
    clearText: "清空当前内容",
    openHistory: "打开输入历史",
    closeHistory: "关闭输入历史",
    historyTitle: "最近输入",
    historyEmpty: "还没有保存的输入",
    historyLocal: "仅保存在当前浏览器",
    restoreHistory: (text) => `恢复“${text}”`,
    deleteHistory: (text) => `从历史中删除“${text}”`,
    clearHistory: "清空全部历史",
    targetWidth: "目标宽度",
    columnsShort: "列",
    letterSpacing: "字符间距",
    layoutDefault: "字体默认",
    layoutFitted: "紧凑排列",
    layoutFull: "完全展开",
    colorLabel: "颜色",
    colorThemes: "颜色主题",
    colorPresets: { mono: "单色", cyan: "青色", matrix: "矩阵", sunset: "日落", rainbow: "彩虹", custom: "自定义" },
    selectColor: (color) => `使用${color}主题`,
    colorKind: "自定义颜色样式",
    solidColor: "纯色",
    gradientColor: "渐变",
    startColor: "起始颜色",
    endColor: "结束颜色",
    privacyNote: "所有生成都在本地完成；最近输入只保存在当前设备，并可随时删除。",
    searchPlaceholder: "搜索字体…",
    fontFilters: "字体筛选",
    favorites: "收藏",
    sortFonts: "字体排序",
    featuredFirst: "推荐优先",
    alphabetical: "名称 A–Z",
    fontCount: (count, filtered) => `${count} 种字体${filtered ? "符合条件" : "可供浏览"}`,
    fontsVisible: (shown, total) => `已显示 ${shown} / ${total}`,
    showMoreFonts: (count) => `再显示 ${count} 种字体`,
    rendering: (done, total) => `正在生成 ${done}/${total}`,
    allUpdated: "全部预览已更新",
    browseReady: "附近预览已更新 · 继续浏览时按需生成",
    addFavorite: (font) => `收藏 ${font}`,
    removeFavorite: (font) => `取消收藏 ${font}`,
    wide: "超宽",
    wideTitle: (width) => `结果宽度超过 ${width} 列`,
    openShare: (font) => `打开 ${font} 分享页`,
    copied: (font) => `已复制 ${font}`,
    copyRaw: (font) => `复制 ${font} 纯文本`,
    copiedTitle: "已复制",
    copyRawTitle: "复制纯文本",
    moreExports: (font) => `${font} 的更多导出方式`,
    exportHeading: "复制到你的工作流",
    retry: "重试",
    renderingFont: (font) => `正在生成 ${font}`,
    noMatches: "没有匹配的字体",
    noMatchesHelp: "请尝试更宽泛的名称，或者清除当前筛选。",
    clearFilters: "清除筛选",
    browseStyles: "浏览样式",
    styleCategories: "样式分类",
    backToTop: "返回顶部",
    top: "顶部",
    tour: {
      helpLabel: "打开产品漫游引导",
      welcomeEyebrow: "快速漫游",
      welcomeTitle: "第一次使用？花 60 秒了解主要功能。",
      welcomeDescription: "看看如何用一行文字生成数百种艺术字，并复制适合当前项目的格式。",
      start: "开始引导",
      notNow: "暂不",
      back: "上一步",
      next: "下一步",
      skip: "跳过引导",
      finish: "完成",
      closeLabel: "关闭产品漫游引导",
      progress: (current, total) => `第 ${current}/${total} 步`,
      steps: {
        text: {
          title: "输入一次，更新全部字体",
          description: "输入最多 40 个标准 ASCII 字符，所有艺术字会同步刷新；还可在输入框右侧清空或恢复最近输入。",
        },
        display: {
          title: "调整艺术字尺寸",
          description: "选择目标宽度和字符间距。超宽结果仍可横向滚动，不会改变艺术字本身。",
        },
        color: {
          title: "同步预览彩色效果",
          description: "为全部预览设置纯色或渐变。普通复制格式保持无色，ANSI 真彩色可用于现代终端。",
        },
        browse: {
          title: "快速找到合适样式",
          description: "可按字体名称搜索、按分类或收藏筛选，并在推荐优先与名称排序之间切换。",
        },
        copy: {
          title: "复制到你的工作流",
          description: "主图标复制纯文本；展开箭头菜单可复制 Markdown、代码注释、ANSI 终端内容等格式。",
        },
      },
    },
  },
};
