import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  ANALYTICS_CONSENT_MAX_AGE_MS,
  ANALYTICS_CONSENT_STORAGE_KEY,
  serializeAnalyticsConsent,
} from "../../src/lib/analytics";
import { TEXT_HISTORY_STORAGE_KEY } from "../../src/lib/text-history";
import { TOUR_STORAGE_KEY, serializeTourState } from "../../src/lib/tour";

const fontCount = JSON.parse(
  readFileSync(new URL("../../src/data/font-manifest.generated.json", import.meta.url), "utf8"),
).length as number;

test.describe("ASCII Banner generator", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!testInfo.title.includes("gates analytics behind consent")) {
      await page.addInitScript(({ key, state }) => {
        window.localStorage.setItem(key, state);
      }, { key: ANALYTICS_CONSENT_STORAGE_KEY, state: serializeAnalyticsConsent("denied") });
    }
    if (testInfo.title.includes("onboards new users")) return;
    await page.addInitScript(({ key, state }) => {
      window.localStorage.setItem(key, state);
    }, { key: TOUR_STORAGE_KEY, state: serializeTourState("completed") });
  });

  test("gates analytics behind consent and excludes shared banner text", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Analytics consent is covered once on desktop");
    await page.addInitScript(({ key, state }) => {
      window.localStorage.setItem(key, state);
    }, {
      key: ANALYTICS_CONSENT_STORAGE_KEY,
      state: serializeAnalyticsConsent("denied", Date.now() - ANALYTICS_CONSENT_MAX_AGE_MS),
    });
    await page.route("https://www.googletagmanager.com/**", (route) => route.fulfill({
      contentType: "application/javascript",
      body: "window.__googleAnalyticsLoaded = true;",
    }));
    await page.route("https://www.clarity.ms/**", (route) => route.fulfill({
      contentType: "application/javascript",
      body: "window.__clarityLoaded = true;",
    }));

    await page.goto("/");
    const consent = page.getByRole("dialog", { name: "Help improve ASCII Banner?" });
    await expect(consent).toBeVisible();
    await expect.poll(() => page.evaluate(
      (key) => window.localStorage.getItem(key),
      ANALYTICS_CONSENT_STORAGE_KEY,
    )).toBeNull();
    await expect(consent.locator("[data-analytics-countdown]")).toHaveText("Minimizes in 5s");
    await expect(page.locator("script[data-google-analytics], script[data-microsoft-clarity]")).toHaveCount(0);

    await expect(consent).toBeHidden({ timeout: 7_000 });
    const reviewChoice = page.getByRole("button", { name: "Review analytics choice" });
    await expect(reviewChoice).toBeVisible();
    await expect(page.locator("script[data-google-analytics], script[data-microsoft-clarity]")).toHaveCount(0);
    await reviewChoice.click();
    await expect(consent).toBeVisible();

    await consent.getByRole("button", { name: "Allow analytics" }).click();
    await expect(consent).toBeHidden();
    await expect(page.locator("script[data-google-analytics]")).toHaveCount(1);
    await expect(page.locator("script[data-microsoft-clarity]")).toHaveCount(1);
    const firstPageCommands = await page.evaluate(() => (
      ((window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? []).map((command) => Array.from(command as ArrayLike<unknown>))
    ));
    expect(JSON.stringify(firstPageCommands)).toContain("page_view");

    await page.goto("/?text=PRIVATE%20BANNER&width=100");
    await expect(page.locator("script[data-google-analytics]")).toHaveCount(1);
    await expect(page.locator("script[data-microsoft-clarity]")).toHaveCount(0);
    const sharedPageCommands = await page.evaluate(() => (
      ((window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? []).map((command) => Array.from(command as ArrayLike<unknown>))
    ));
    expect(JSON.stringify(sharedPageCommands)).not.toContain("PRIVATE");
    await expect(page.locator("[data-clarity-mask]")).toBeVisible();

    await page.getByRole("button", { name: "Analytics settings" }).click();
    await expect(consent).toBeVisible();
    await consent.getByRole("button", { name: "Decline" }).click();
    await expect(page.locator("script[data-google-analytics], script[data-microsoft-clarity]")).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), ANALYTICS_CONSENT_STORAGE_KEY)).toContain('"status":"denied"');
  });

  test("onboards new users with an interactive, replayable five-step tour", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const tourRoot = page.locator("[data-tour-root]");
    await tourRoot.evaluate((element) => element.scrollIntoView({ block: "center" }));

    const welcome = page.getByRole("dialog", { name: /New here/ });
    await expect(welcome).toBeVisible({ timeout: 30_000 });
    await welcome.getByRole("button", { name: "Show me around" }).click();

    const tour = page.locator(".product-tour");
    const dialog = page.getByRole("dialog", { name: "Type once, update every font" });
    await expect(tour).toHaveAttribute("data-step", "text");
    await expect(page.locator('[data-tour="text"]')).toHaveAttribute("data-tour-active", "");
    await page.getByLabel("Your text").fill("TOUR TEST");
    await expect(page.getByLabel("Your text")).toHaveValue("TOUR TEST");

    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(tour).toHaveAttribute("data-step", "display");
    await expect(page.locator('[data-tour="display"]')).toHaveAttribute("data-tour-active", "");

    await page.getByRole("dialog", { name: "Tune the banner dimensions" }).getByRole("button", { name: "Next" }).click();
    await expect(tour).toHaveAttribute("data-step", "color");
    await page.getByRole("button", { name: "Use Rainbow color theme" }).click();
    await expect(page.getByRole("button", { name: "Use Rainbow color theme" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("dialog", { name: "Preview in color" }).getByRole("button", { name: "Next" }).click();
    await expect(tour).toHaveAttribute("data-step", "browse");
    await page.getByLabel("Find a font").fill("Standard");
    await expect(page.locator(".font-card")).toHaveCount(1);

    await page.getByRole("dialog", { name: "Find the right style quickly" }).getByRole("button", { name: "Next" }).click();
    await expect(tour).toHaveAttribute("data-step", "copy");
    const firstCard = page.locator('[data-tour="copy"]');
    await expect(firstCard).toHaveAttribute("data-tour-active", "");
    if (testInfo.project.name === "chromium") {
      await firstCard.locator("summary").click();
      await expect(firstCard.locator(".export-popover")).toBeVisible();
    }

    const finalDialog = page.getByRole("dialog", { name: "Copy for your workflow" });
    const finalBox = await finalDialog.boundingBox();
    const viewport = page.viewportSize();
    expect(finalBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (finalBox && viewport) {
      expect(finalBox.x).toBeGreaterThanOrEqual(0);
      expect(finalBox.x + finalBox.width).toBeLessThanOrEqual(viewport.width);
      expect(finalBox.y + finalBox.height).toBeLessThanOrEqual(viewport.height);
    }
    await finalDialog.getByRole("button", { name: "Finish" }).click();
    await expect(tour).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), TOUR_STORAGE_KEY)).toContain('"status":"completed"');

    await page.reload();
    await page.locator("[data-tour-root]").evaluate((element) => element.scrollIntoView({ block: "center" }));
    await expect(page.getByRole("dialog", { name: /New here/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Open product tour" }).click();
    await expect(page.locator(".product-tour")).toHaveAttribute("data-step", "text");
    await page.keyboard.press("Escape");
    await expect(page.locator(".product-tour")).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), TOUR_STORAGE_KEY)).toContain('"status":"dismissed"');
  });

  test("renders the full library and updates it from one input", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Full idle backfill runs only on capable desktop devices");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Your text\. Every banner/i })).toBeVisible();
    await expect(page.locator(".font-card")).toHaveCount(fontCount);
    await expect(page.locator(".render-state")).toContainText("All previews updated", { timeout: 30_000 });

    const input = page.getByLabel("Your text");
    await input.fill("OUTDATED VERSION");
    await page.waitForTimeout(140);
    await input.fill("ALSO OUTDATED");
    await page.waitForTimeout(140);
    const finalText = "LATEST RESULT 1234567890 ABCDEFGHIJKLMNO";
    await input.fill(finalText);
    await expect(input).toHaveValue(finalText);
    await expect(page.locator(".render-state")).toContainText("All previews updated", { timeout: 30_000 });
    const standardPreview = page.locator('[data-font="standard"] pre');
    await expect(standardPreview).not.toContainText("Hello");
    const finalOutput = await standardPreview.textContent();
    await page.waitForTimeout(300);
    await expect(standardPreview).toHaveText(finalOutput ?? "");
  });

  test("renders nearby previews on demand instead of backfilling the library on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile scheduling is covered once");
    await page.goto("/");
    await expect(page.locator(".font-card")).toHaveCount(fontCount);
    await expect(page.locator('[data-font="standard"]')).toHaveAttribute("data-render-state", "ready", { timeout: 20_000 });
    await expect(page.locator(".render-state")).toContainText("more render as you browse", { timeout: 20_000 });
    expect(await page.locator('[data-render-state="ready"]').count()).toBeLessThan(fontCount);

    await page.getByLabel("Find a font").fill("Univers");
    const searchMatch = page.locator('[data-font="univers"]');
    await expect(searchMatch).toBeVisible();
    await expect(searchMatch).toHaveAttribute("data-render-state", "ready", { timeout: 20_000 });
    await expect(searchMatch.locator("pre")).toBeVisible();
  });

  test("renders the nearby set first and promotes search matches before idle backfill", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Hybrid scheduling is covered once on desktop");
    await page.addInitScript(() => {
      let nextHandle = 0;
      const callbacks = new Map<number, IdleRequestCallback>();
      Object.defineProperty(window, "requestIdleCallback", {
        configurable: true,
        value: (callback: IdleRequestCallback) => {
          nextHandle += 1;
          callbacks.set(nextHandle, callback);
          return nextHandle;
        },
      });
      Object.defineProperty(window, "cancelIdleCallback", {
        configurable: true,
        value: (handle: number) => callbacks.delete(handle),
      });
    });
    await page.goto("/");

    await expect(page.locator('[data-font="standard"]')).toHaveAttribute("data-render-state", "ready", { timeout: 20_000 });
    await expect.poll(() => page.locator('[data-render-state="ready"]').count()).toBeGreaterThanOrEqual(20);
    expect(await page.locator('[data-render-state="ready"]').count()).toBeLessThan(fontCount);
    await expect(page.locator(".render-state")).toContainText("Rendering");

    await page.getByLabel("Find a font").fill("Univers");
    const searchMatch = page.locator('[data-font="univers"]');
    await expect(searchMatch).toBeVisible();
    await expect(searchMatch).toHaveAttribute("data-render-state", "ready", { timeout: 20_000 });
    await expect(searchMatch.locator("pre")).toBeVisible();
  });

  test("filters, favorites, and restores shared settings", async ({ page }) => {
    await page.goto("/?text=Ship%20It&width=100&layout=fitted");
    await expect(page.getByLabel("Your text")).toHaveValue("Ship It");
    await expect(page.getByLabel("Custom target width")).toHaveValue("100");
    const spacingSelect = page.locator('summary[aria-label="Letter spacing"]');
    await expect(spacingSelect).toContainText("Fitted");
    await spacingSelect.click();
    const spacingOptions = page.getByRole("listbox", { name: "Letter spacing" });
    await expect(spacingOptions).toBeVisible();
    await expect(spacingOptions.getByRole("option", { name: "Fitted" })).toHaveAttribute("aria-selected", "true");
    await spacingOptions.getByRole("option", { name: "Full width" }).click();
    await expect(spacingSelect).toContainText("Full width");

    const sortSelect = page.locator('summary[aria-label="Sort fonts"]');
    await sortSelect.click();
    const sortOptions = page.getByRole("listbox", { name: "Sort fonts" });
    await expect(sortOptions).toBeVisible();
    await sortOptions.getByRole("option", { name: "A–Z" }).click();
    await expect(sortSelect).toContainText("A–Z");

    await page.getByLabel("Find a font").fill("Standard");
    await expect(page.locator(".font-card")).toHaveCount(1);
    await page.getByLabel("Add Standard to favorites").click();
    await page.reload();
    await page.getByLabel("Find a font").fill("Standard");
    await expect(page.getByLabel("Remove Standard from favorites")).toBeVisible();
  });

  test("focuses inputs with shortcuts and blurs them with Escape", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-font="standard"] pre')).toBeVisible({ timeout: 20_000 });
    const search = page.getByLabel("Find a font");
    await page.keyboard.press("/");
    await expect(search).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(search).not.toBeFocused();

    const bannerInput = page.getByLabel("Your text");
    await page.keyboard.press("t");
    await expect(bannerInput).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(bannerInput).not.toBeFocused();

    await search.fill("Standard");
    await bannerInput.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    await bannerInput.press("/");
    await expect(bannerInput).toHaveValue("Hello World/");
    await expect(bannerInput).toBeFocused();
  });

  test("clears, restores, and deletes device-local text history", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("Your text");
    const standardPreview = page.locator('[data-font="standard"] pre');
    await expect(standardPreview).toBeVisible({ timeout: 20_000 });
    const defaultOutput = await standardPreview.textContent();

    await input.fill("FIRST ENTRY");
    await input.press("Enter");
    await input.fill("INTERMEDIATE");
    await input.fill("FINAL ENTRY");
    await page.getByRole("heading", { name: /Your text\. Every banner/i }).click();

    const historyButton = page.getByRole("button", { name: "Open text history" });
    await expect(historyButton).toHaveCSS("border-radius", "0px");
    await historyButton.click();
    const historyPanel = page.getByRole("dialog", { name: "Recent text" });
    await expect(historyPanel).toBeVisible();
    await expect(historyPanel).toHaveCSS("border-radius", "0px");
    await expect(historyPanel.getByRole("button", { name: /Restore “FINAL ENTRY”/ })).toBeVisible();
    await expect(historyPanel.getByRole("button", { name: /Restore “FIRST ENTRY”/ })).toBeVisible();
    await expect(historyPanel).not.toContainText("INTERMEDIATE");

    const panelBox = await historyPanel.boundingBox();
    const viewport = page.viewportSize();
    expect(panelBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (panelBox && viewport) {
      expect(panelBox.x).toBeGreaterThanOrEqual(0);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
    }

    await historyPanel.getByRole("button", { name: /Delete “FIRST ENTRY”/ }).click();
    await expect(historyPanel).not.toContainText("FIRST ENTRY");
    await expect(input).toHaveValue("FINAL ENTRY");
    await page.keyboard.press("Escape");
    await expect(historyPanel).toHaveCount(0);
    await expect(historyButton).toBeFocused();

    await historyButton.click();
    await page.getByRole("button", { name: "Clear all history" }).click();
    await expect(page.getByRole("dialog", { name: "Recent text" })).toContainText("No saved text yet");
    await expect(input).toHaveValue("FINAL ENTRY");
    await page.getByRole("heading", { name: /Your text\. Every banner/i }).click();
    await expect(page.getByRole("dialog", { name: "Recent text" })).toHaveCount(0);

    await input.fill("CLEAR ME");
    await page.getByRole("button", { name: "Clear text" }).click();
    await expect(input).toHaveValue("");
    await expect(page.getByRole("button", { name: "Clear text" })).toHaveCount(0);
    await expect(standardPreview).toHaveText(defaultOutput ?? "", { timeout: 20_000 });

    await page.getByRole("button", { name: "Open text history" }).click();
    await page.getByRole("button", { name: /Restore “CLEAR ME”/ }).click();
    await expect(input).toHaveValue("CLEAR ME");
    await expect(page.getByRole("dialog", { name: "Recent text" })).toHaveCount(0);
  });

  test("saves edited text on page leave and shares history across routes and languages", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Cross-route history is covered once on desktop");
    await page.goto("/?text=SHARED%20INITIAL");
    await expect(page.getByLabel("Your text")).toHaveValue("SHARED INITIAL");
    expect(await page.evaluate((key) => window.localStorage.getItem(key), TEXT_HISTORY_STORAGE_KEY)).toBeNull();

    await page.getByLabel("Your text").fill("LEAVE COMMIT");
    await page.goto("/fonts/standard/");
    await page.getByRole("button", { name: "Open text history" }).click();
    const detailHistory = page.getByRole("dialog", { name: "Recent text" });
    await expect(detailHistory).toContainText("LEAVE COMMIT");
    await expect(detailHistory).not.toContainText("SHARED INITIAL");
    await page.keyboard.press("Escape");

    const detailInput = page.getByLabel("Your text");
    await detailInput.fill("DETAIL ENTRY");
    await detailInput.press("Enter");
    await page.goto("/zh/");
    await page.getByRole("button", { name: "打开输入历史" }).click();
    const chineseHistory = page.getByRole("dialog", { name: "最近输入" });
    await expect(chineseHistory).toContainText("DETAIL ENTRY");
    await expect(chineseHistory).toContainText("LEAVE COMMIT");
  });

  test("uses English detail pages for Chinese fonts without localized editorial pages", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Localized link routing is covered once on desktop");
    await page.goto("/zh/");
    await page.evaluate(() => {
      window.open = (url) => {
        window.sessionStorage.setItem("opened-share-url", String(url));
        return null;
      };
    });
    await page.locator('[data-font="standard"]').getByRole("button", { name: "打开 Standard 分享页" }).click();
    expect(await page.evaluate(() => window.sessionStorage.getItem("opened-share-url"))).toContain(
      "/zh/fonts/standard/",
    );

    await page.getByLabel("搜索字体").fill("Univers");
    await page.locator('[data-font="univers"]').getByRole("button", { name: "打开 Univers 分享页" }).click();
    expect(await page.evaluate(() => window.sessionStorage.getItem("opened-share-url"))).toContain(
      "/fonts/univers/",
    );
  });

  test("copies Markdown output and links to a focused font page", async ({ page, context }, testInfo) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const card = page.locator('[data-font="standard"]');
    const popover = card.locator(".export-popover");
    await expect(card.locator("pre")).toBeVisible({ timeout: 20_000 });
    const primaryCopy = card.getByRole("button", { name: "Copy Standard as raw text" });
    await expect(primaryCopy).toBeVisible();
    await expect(primaryCopy).toHaveText("");
    await expect(primaryCopy).toHaveCSS("border-radius", "0px");
    await expect(card).toHaveCSS("border-radius", "0px");
    await card.evaluate((element) => {
      document.documentElement.style.scrollBehavior = "auto";
      element.scrollIntoView({ block: "start" });
    });
    await card.locator("summary").click();
    await expect(card).toHaveCSS("content-visibility", "visible");

    const overflowState = await card.evaluate((element) => {
      const menu = element.querySelector<HTMLElement>(".export-popover");
      if (!menu) return { extendsBelowCard: false, ownsOverflow: false };
      const cardRect = element.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const overflowTop = Math.max(cardRect.bottom, menuRect.top);
      const overflowBottom = Math.min(menuRect.bottom, window.innerHeight);
      const probeX = Math.min(window.innerWidth - 1, Math.max(0, menuRect.left + 20));
      const probeY = overflowTop + (overflowBottom - overflowTop) / 2;
      const hit = overflowBottom > overflowTop ? document.elementFromPoint(probeX, probeY) : null;
      return {
        extendsBelowCard: menuRect.bottom > cardRect.bottom,
        ownsOverflow: Boolean(hit?.closest(".export-popover")),
      };
    });
    expect(overflowState.extendsBelowCard).toBe(true);
    expect(overflowState.ownsOverflow).toBe(true);

    const exportMenu = card.locator("details.export-menu");
    await page.getByLabel("Find a font").click();
    await expect(exportMenu).not.toHaveAttribute("open", "");

    await card.locator("summary").click();
    await page.keyboard.press("Escape");
    await expect(exportMenu).not.toHaveAttribute("open", "");
    await expect(card.locator("summary")).not.toBeFocused();

    await card.locator("summary").click();
    await popover.getByRole("button", { name: /Markdown block/ }).click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/^```text\n/);

    if (testInfo.project.name === "chromium") {
      await page.evaluate(() => {
        window.open = (url) => {
          window.sessionStorage.setItem("opened-share-url", String(url));
          return null;
        };
      });
      await page.locator('[data-font="standard"]').getByRole("button", { name: /share page/ }).click();
      expect(await page.evaluate(() => window.sessionStorage.getItem("opened-share-url"))).toContain(
        "/fonts/standard/?text=Hello+World&width=80&layout=default&color=mono",
      );
    }
  });

  test("colors every preview, persists preferences, shares settings, and copies ANSI Truecolor", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Color workflow is covered once on desktop");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const card = page.locator('[data-font="standard"]');
    const preview = card.locator("pre");
    await expect(page.locator(".render-state")).toContainText("All previews updated", { timeout: 30_000 });
    const originalOutput = await preview.textContent();

    await page.getByRole("button", { name: "Use Rainbow color theme" }).click();
    await expect(preview).toHaveAttribute("data-color-preset", "rainbow");
    await expect(preview).toHaveClass(/is-colored/);
    expect(await page.locator(".font-card pre").evaluateAll((elements) => (
      elements.slice(0, 10).every((element) => element.getAttribute("data-color-preset") === "rainbow")
    ))).toBe(true);
    await expect(preview).toHaveText(originalOutput ?? "");
    await expect(page.locator(".render-state")).toContainText("All previews updated");
    await expect(page.getByRole("link", { name: "切换到中文" })).toHaveAttribute("href", "/zh/");
    await page.evaluate(() => {
      window.open = (url) => {
        window.sessionStorage.setItem("opened-share-url", String(url));
        return null;
      };
    });
    await card.getByRole("button", { name: /share page/ }).click();
    expect(await page.evaluate(() => window.sessionStorage.getItem("opened-share-url"))).toMatch(/color=rainbow$/);

    await page.reload();
    await expect(page.getByRole("button", { name: "Use Rainbow color theme" })).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator("pre")).toHaveAttribute("data-color-preset", "rainbow", { timeout: 20_000 });

    await page.getByRole("button", { name: "Use Custom color theme" }).click();
    await page.getByRole("button", { name: "Gradient", exact: true }).click();
    await page.getByLabel("Start color").fill("#112233");
    await page.getByLabel("End color").fill("#AABBCC");
    await page.evaluate(() => {
      window.open = (url) => {
        window.sessionStorage.setItem("opened-share-url", String(url));
        return null;
      };
      document.querySelector<HTMLElement>("[data-language-switch]")?.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
      }));
    });
    expect(await page.evaluate(() => window.sessionStorage.getItem("opened-share-url"))).toMatch(
      /color=custom&colorKind=gradient&colorStart=112233&colorEnd=AABBCC$/,
    );

    await card.evaluate((element) => element.scrollIntoView({ block: "start" }));
    await card.locator("summary").click();
    await card.getByRole("button", { name: /ANSI Truecolor/ }).click();
    const ansiClipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(ansiClipboard).toContain("\u001b[38;2;");
    expect(ansiClipboard).toMatch(/\u001b\[0m$/);

    await card.getByRole("button", { name: "Copy Standard as raw text" }).click();
    const rawClipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(rawClipboard).not.toContain("\u001b[");
  });

  test("keeps previews horizontally scrollable on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile layout check");
    await page.goto("/?text=THIS%20IS%20A%20LONG%20ASCII%20BANNER&width=200");
    const preview = page.locator('[data-font="standard"] .ascii-preview');
    await expect(preview.locator("pre")).toBeVisible({ timeout: 20_000 });
    await expect(preview).toHaveCSS("overflow-x", "auto");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(page.locator(".style-rail")).toHaveCSS("display", "none");
  });

  test("shows the sticky style rail only after the toolbar and within preview bounds", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Desktop category rail check");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const rail = page.locator(".style-rail");
    const toolbar = page.locator(".gallery-toolbar");
    const fontList = page.locator(".font-list");
    const categoryNav = () => page.getByRole("navigation", { name: "Style categories" });
    const stickyOffset = await page.evaluate(() => (
      Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tool-sticky-offset"))
    ));
    const placeToolbarBottomAt = async (bottom: number) => {
      await toolbar.evaluate((element, desiredBottom) => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollBy(0, element.getBoundingClientRect().bottom - desiredBottom);
      }, bottom);
    };

    await expect(rail).toHaveAttribute("aria-hidden", "true");
    await expect(categoryNav()).toHaveCount(0);

    await placeToolbarBottomAt(stickyOffset + 1);
    await expect.poll(() => toolbar.evaluate((element) => element.getBoundingClientRect().bottom)).toBeGreaterThan(stickyOffset);
    await expect(rail).toHaveAttribute("aria-hidden", "true");

    await placeToolbarBottomAt(stickyOffset - 1);
    await expect(rail).toHaveAttribute("aria-hidden", "false");
    await expect(categoryNav()).toBeVisible();

    await page.evaluate(({ offset }) => {
      const list = document.querySelector<HTMLElement>(".font-list");
      if (list) window.scrollTo(0, window.scrollY + list.getBoundingClientRect().bottom - offset + 1);
    }, { offset: stickyOffset });
    await expect(rail).toHaveAttribute("aria-hidden", "true");
    await expect(categoryNav()).toHaveCount(0);

    await placeToolbarBottomAt(stickyOffset - 1);
    await expect(categoryNav()).toBeVisible();
    await categoryNav().getByRole("button", { name: /Block/ }).click();
    await expect(rail).toHaveAttribute("aria-hidden", "true");
    await expect(categoryNav()).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Block", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".font-card").first()).toContainText("Block");

    await placeToolbarBottomAt(stickyOffset - 1);
    await page.evaluate(() => window.scrollBy(0, 900));
    await expect(rail).toHaveAttribute("aria-hidden", "false");
    await page.getByLabel("Find a font").evaluate((element) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "NO_FONT_CAN_MATCH_THIS_QUERY");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(fontList.locator(".font-card")).toHaveCount(0);
    await expect(rail).toHaveAttribute("aria-hidden", "true");
  });

  test("returns to the top from a long results page", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 1200);
    });
    const backToTop = page.getByRole("button", { name: "Back to top" });
    await expect(backToTop).toBeVisible();
    await backToTop.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  });

  test("serves the Chinese UI with localized SEO and state-preserving language links", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Localized route check runs once on desktop");
    await page.goto("/zh/?text=Ship%20It&width=100&layout=fitted");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("heading", { name: "输入一次，预览全部艺术字。" })).toBeVisible();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).not.toBeNull();
    const siteOrigin = new URL(canonical!).origin;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${siteOrigin}/zh/`);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", `${siteOrigin}/`);
    await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute("href", `${siteOrigin}/zh/`);

    const navActions = page.locator(".nav-actions");
    await expect(navActions).toBeVisible();
    await expect(navActions).toHaveCSS("border-top-width", "1px");
    await expect(navActions.locator("a")).toHaveText(["打开生成器", "EN"]);
    const actionGeometry = await navActions.evaluate((element) => {
      const [language, generator] = Array.from(element.querySelectorAll("a"), (link) => link.getBoundingClientRect());
      return {
        languageHeight: language?.height,
        generatorHeight: generator?.height,
        gap: language && generator ? generator.left - language.right : -1,
      };
    });
    expect(actionGeometry.languageHeight).toBe(actionGeometry.generatorHeight);
    expect(actionGeometry.gap).toBe(0);

    const input = page.getByLabel("输入文字");
    await expect(input).toHaveValue("Ship It");
    await expect(page.getByLabel("自定义目标宽度")).toHaveValue("100");
    await expect(page.locator('summary[aria-label="字符间距"]')).toContainText("紧凑排列");
    await expect(page.getByRole("button", { name: "打开产品漫游引导" })).toBeVisible();
    await input.fill("ZH TEST");
    await expect(page.getByRole("link", { name: "Switch to English" })).toHaveAttribute("href", "/");
    await page.evaluate(() => {
      window.open = (url) => {
        window.sessionStorage.setItem("opened-language-url", String(url));
        return null;
      };
      document.querySelector<HTMLElement>("[data-language-switch]")?.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
      }));
    });
    expect(await page.evaluate(() => window.sessionStorage.getItem("opened-language-url"))).toMatch(
      /\?text=ZH\+TEST&width=100&layout=fitted&color=mono$/,
    );

    await input.fill("中文");
    await expect(input).toHaveValue("");
    await expect(page.getByText("FIGlet 字体不包含中文字形，暂时无法生成中文字符。")).toBeVisible();

    await page.goto("/zh/fonts/standard/");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("heading", { name: "Standard ASCII 字体。" })).toBeVisible();
    await expect(page.getByText("关于 Standard 字体")).toBeVisible();
    await expect(page.locator(".style-rail")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "打开产品漫游引导" })).toHaveCount(0);
    await expect(page.locator(".product-tour, .tour-welcome")).toHaveCount(0);
  });
});
