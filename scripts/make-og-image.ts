/**
 * Renders the social card from the product's own interface.
 *
 * The card shows a real reading on a real dataset, screenshotted from the
 * running application rather than drawn in a design tool. A social card that
 * is an illustration of a product is a small lie; this one cannot drift from
 * what the page actually renders, because it is that page.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "apps", "web", "public", "og.png");
const base = process.env.OG_BASE_URL ?? "http://localhost:4173";

const CARD = `
  <!doctype html><html data-theme="dark"><head><meta charset="utf-8">
  <link rel="stylesheet" href="${base}/__styles">
  </head><body></body></html>`;

async function main(): Promise<void> {
  mkdirSync(dirname(out), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  await page.goto(`${base}/#/home`, { waitUntil: "networkidle" });

  // Reduce the hero to the card: the claim, the reading, and nothing else.
  await page.evaluate(() => {
    document
      .querySelectorAll(".masthead, .foot, .section, .hero__actions")
      .forEach((n) => n.remove());
    const hero = document.querySelector(".hero") as HTMLElement | null;
    if (hero) {
      hero.style.borderRadius = "0";
      hero.style.minHeight = "630px";
      hero.style.display = "flex";
      hero.style.alignItems = "center";
      hero.style.padding = "56px";
    }
    const lede = document.querySelector(".hero__lede") as HTMLElement | null;
    if (lede) lede.textContent = "Offline profiling for physical Bitcoin entropy processes.";
  });

  // Let the sweep and count-up settle before capturing.
  await page.waitForTimeout(1600);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();

  process.stdout.write(`Wrote ${out}\n`);
}

void CARD;
void main();
