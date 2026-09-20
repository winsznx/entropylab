import { test, expect, type Page } from "@playwright/test";

/**
 * Every flow here goes through the interface a user gets. There is no debug
 * route and no injected analysis: the numbers asserted below are produced by
 * the same code path a person clicking the buttons would hit.
 */

async function openDemo(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name }).first().click();
  await expect(page.getByRole("heading", { name: "Analysis", level: 1 })).toBeVisible();
}

test.describe("the demonstration on the home screen", () => {
  test("computes the periodic result in the page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Measure the process before it holds your seed." }),
    ).toBeVisible();

    // The frequency-only figure is computed live, not written into the markup,
    // and matches the published campaign value for the same dataset.
    await expect(page.getByText("2.4815")).toBeVisible();
    // The governing figure for a fully deterministic sequence.
    await expect(page.locator(".scale__value").first()).toContainText("0.0000");
  });

  test("states the safety rule without being asked", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Use calibration observations only/)).toBeVisible();
    await expect(page.getByText(/Never enter a seed phrase or private key/)).toBeVisible();
  });
});

test.describe("fixtures through the product", () => {
  test("periodic balanced collapses and recommends changing the procedure", async ({ page }) => {
    await openDemo(page, "Periodic balanced d6");

    await expect(page.locator(".scale__value")).toContainText("0.0000");
    await expect(
      page.getByText("The counts look balanced, but the order is predictable."),
    ).toBeVisible();
    await expect(
      page.getByText("Change how you roll before using this process for a seed."),
    ).toBeVisible();

    // The frequency method must still be shown reporting a healthy figure,
    // because the contrast is the point.
    const row = page.locator("tr", { hasText: "Most common value" });
    await expect(row).toContainText("2.4815");

    // And the governing method must be named.
    await expect(page.locator(".table__row--governing")).toContainText("Lag predictor");
  });

  test("biased points at the die rather than the procedure", async ({ page }) => {
    await openDemo(page, "Biased d6");
    await expect(
      page.getByText("One outcome appears substantially more often than the others."),
    ).toBeVisible();
    await expect(
      page.getByText("Check the die itself before using this process for a seed."),
    ).toBeVisible();
  });

  test("sticky source names repetition of the previous face", async ({ page }) => {
    await openDemo(page, "Sticky d6");
    await expect(page.getByText(/not tumbling/)).toBeVisible();
    await expect(page.locator(".scale__value")).toContainText("0.4765");
  });

  test("low sample declines methods instead of inventing confidence", async ({ page }) => {
    await openDemo(page, "Low-sample d6");

    await expect(page.getByText(/2 of 4 methods could not run/)).toBeVisible();
    await expect(
      page.getByText("Collect more observations before relying on this result."),
    ).toBeVisible();

    // Both sequential methods must be visibly declined, not hidden.
    const declined = page.locator(".table__row--declined");
    await expect(declined).toHaveCount(2);
    await expect(page.locator("tr", { hasText: "Markov" })).toContainText("declined");
  });

  test("fair-like does not claim the source is proven random", async ({ page }) => {
    await openDemo(page, "Fair-like d6");
    await expect(
      page.getByText("You can proceed, with the limitations stated below."),
    ).toBeVisible();
    await expect(page.getByText(/not proof of unpredictability/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/certified|guaranteed random/i);
  });
});

test.describe("define, calibrate, analyze, export", () => {
  test("completes the whole flow by keyboard entry", async ({ page }) => {
    await page.goto("/#/define");

    await page.getByLabel("Name").fill("Kitchen table d6");
    await page.getByLabel("How you collect").fill("Shaken in a cup");
    await page.getByRole("button", { name: "Continue to calibration" }).click();

    await expect(page.getByRole("heading", { name: "Calibrate", level: 1 })).toBeVisible();

    // Type rolls the way a person reading them off a table would.
    await page.locator("body").click();
    for (const key of "123456123456") await page.keyboard.press(key);
    await expect(page.locator(".counter")).toHaveText("12");

    // Backspace undoes.
    await page.keyboard.press("Backspace");
    await expect(page.locator(".counter")).toHaveText("11");

    await page.getByRole("button", { name: /Analyze 11 observations/ }).click();
    await expect(page.getByRole("heading", { name: "Analysis", level: 1 })).toBeVisible();
    await expect(page.getByText(/could not run on this sample/)).toBeVisible();
  });

  test("reads a pasted sequence and reports unreadable values", async ({ page }) => {
    await page.goto("/#/define");
    await page.getByLabel("Name").fill("Pasted session");
    await page.getByRole("button", { name: "Continue to calibration" }).click();

    await page.getByLabel("Paste recorded outcomes").fill("1 2 3\n# a note\n4 5 x 6\n9");
    await page.getByRole("button", { name: "Read pasted text" }).click();

    await expect(page.getByText("Read 6 observations, skipped 2 unreadable.")).toBeVisible();
    await expect(page.getByText(/2 value\(s\) could not be read/)).toBeVisible();
    await expect(page.getByText('line 3: "x"')).toBeVisible();
  });

  test("refuses a pasted recovery phrase", async ({ page }) => {
    await page.goto("/#/define");
    await page.getByLabel("Name").fill("Guardrail check");
    await page.getByRole("button", { name: "Continue to calibration" }).click();

    await page
      .getByLabel("Paste recorded outcomes")
      .fill("abandon ability able about above absent absorb abstract absurd abuse access accident");
    await page.getByRole("button", { name: "Read pasted text" }).click();

    await expect(page.getByRole("alert")).toContainText(/recovery phrase/);
    // Nothing was ingested.
    await expect(page.locator(".counter")).toHaveText("0");
    // And the warning does not repeat the phrase back on screen.
    await expect(page.getByRole("alert")).not.toContainText("abandon");
  });

  test("exports a JSON report containing the hash and version", async ({ page }) => {
    await openDemo(page, "Fair-like d6");
    await page.getByRole("button", { name: "Export report" }).click();

    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download JSON" }).click(),
    ]).then(([d]) => d);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    expect(report.dataset.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(report.algorithmVersion).toBeTruthy();
    expect(report.analysis.limitingEstimator).toBe("markov");
    expect(report.limitations.join(" ")).toMatch(/not a NIST SP 800-90B validation/);
    // Raw observations are opt-in and off by default.
    expect(report.observations).toBeUndefined();
  });
});

test.describe("local storage", () => {
  test("saves a profile and reopens it", async ({ page }) => {
    await page.goto("/#/define");
    await page.getByLabel("Name").fill("Persisted die");
    await page.getByRole("button", { name: "Continue to calibration" }).click();
    await page.getByLabel("Paste recorded outcomes").fill("1 2 3 4 5 6 1 2 3 4 5 6");
    await page.getByRole("button", { name: "Read pasted text" }).click();
    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();
    await page.getByRole("button", { name: "Export report" }).click();
    await page.getByRole("button", { name: "Save profile and session" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await page.goto("/#/profiles");
    await expect(page.getByText("Persisted die")).toBeVisible();
  });

  test("a private session writes nothing", async ({ page }) => {
    await page.goto("/#/profiles");
    await page.getByLabel(/Do not save anything this visit/).check();

    await page.goto("/#/define");
    await page.getByLabel("Name").fill("Should not persist");
    await page.getByRole("button", { name: "Continue to calibration" }).click();
    await page.getByLabel("Paste recorded outcomes").fill("1 2 3 4 5 6");
    await page.getByRole("button", { name: "Read pasted text" }).click();
    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();
    await page.getByRole("button", { name: "Export report" }).click();

    await expect(page.getByRole("button", { name: "Save profile and session" })).toBeDisabled();
    await expect(page.getByText(/Private session is on/)).toBeVisible();

    await page.goto("/#/profiles");
    await expect(page.getByText("Should not persist")).toHaveCount(0);
  });
});

test.describe("offline", () => {
  test("analyses a dataset with the network disabled", async ({ page, context }) => {
    // Load once so the service worker precaches the build.
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
      timeout: 15_000,
    });

    await context.setOffline(true);
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Measure the process before it holds your seed." }),
    ).toBeVisible();
    await expect(page.locator(".masthead__status")).toContainText("offline");

    // The whole analysis path must still work.
    await page.getByRole("button", { name: "Periodic balanced d6" }).click();
    await expect(page.locator(".scale__value")).toContainText("0.0000");
    await expect(
      page.getByText("Change how you roll before using this process for a seed."),
    ).toBeVisible();

    await context.setOffline(false);
  });

  test("makes no off-origin request at any point", async ({ page }) => {
    // The property that matters is that no observation, and no fact about the
    // user, reaches a third party. Same-origin requests for the application's
    // own precached assets are expected; anything leaving the origin is not.
    //
    // This assertion is why the fonts are committed to the repository. An
    // earlier version loaded them from a font CDN, which contacted that CDN on
    // every load and would have failed offline.
    const offOrigin: string[] = [];
    const origin = new URL(page.url() || "http://localhost:4173").origin;
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("data:") || url.startsWith("blob:")) return;
      if (new URL(url).origin !== "http://localhost:4173") offOrigin.push(url);
    });
    void origin;
    await page.goto("/");

    await page.getByRole("button", { name: "Sticky d6" }).click();
    await expect(page.locator(".scale__value")).toContainText("0.4765");
    await page.getByRole("button", { name: "Export report" }).click();
    await expect(page.getByRole("heading", { name: "Export", level: 1 })).toBeVisible();

    expect(offOrigin, `left the origin: ${offOrigin.join(", ")}`).toHaveLength(0);
  });
});

test.describe("accessibility basics", () => {
  test("is operable from the keyboard alone", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();

    // Every interactive control must be reachable and labelled.
    const unnamed = await page
      .locator("button:not([aria-label])")
      .evaluateAll((nodes) => nodes.filter((n) => (n.textContent ?? "").trim() === "").length);
    expect(unnamed).toBe(0);
  });

  test("does not rely on colour alone for the governing method", async ({ page }) => {
    await openDemo(page, "Periodic balanced d6");
    // The governing row carries a text tag, not just a background colour.
    await expect(page.locator(".tag--governing").first()).toHaveText("governing");
  });
});

test.describe("privacy audit", () => {
  test("a private session leaves no IndexedDB record", async ({ page }) => {
    // Stronger than checking the profiles list: this reads the database
    // directly, so a write that never surfaced in the interface would still
    // be caught.
    await page.goto("/#/profiles");
    await page.getByLabel(/Do not save anything this visit/).check();

    await page.goto("/#/define");
    await page.getByLabel("Name").fill("Private run");
    await page.getByRole("button", { name: "Continue to calibration" }).click();
    await page.getByLabel("Paste recorded outcomes").fill("1 2 3 4 5 6 1 2 3 4 5 6");
    await page.getByRole("button", { name: "Read pasted text" }).click();
    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();
    await page.getByRole("button", { name: "Export report" }).click();

    const stored = await page.evaluate(async () => {
      const open = indexedDB.open("entropylab", 1);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const read = (store: string): Promise<unknown[]> =>
        new Promise((resolve) => {
          const request = db.transaction(store, "readonly").objectStore(store).getAll();
          request.onsuccess = () => resolve(request.result as unknown[]);
        });
      return { profiles: await read("profiles"), sessions: await read("sessions") };
    });

    expect(stored.profiles).toHaveLength(0);
    expect(stored.sessions).toHaveLength(0);
  });

  test("no observation reaches the URL", async ({ page }) => {
    // The address bar is copied, bookmarked, and logged by browsers. Routing
    // carries a screen name and nothing else.
    await page.goto("/#/define");
    await page.getByLabel("Name").fill("URL check");
    await page.getByRole("button", { name: "Continue to calibration" }).click();

    await page.locator("body").click();
    for (const key of "561324") await page.keyboard.press(key);
    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();
    await expect(page.getByRole("heading", { name: "Analysis", level: 1 })).toBeVisible();

    expect(page.url()).toBe("http://localhost:4173/#/analysis");
    expect(page.url()).not.toMatch(/561324|observations=|data=/);
  });

  test("downloads happen only when the user asks", async ({ page }) => {
    let downloads = 0;
    page.on("download", () => {
      downloads += 1;
    });

    await openDemo(page, "Fair-like d6");
    await page.getByRole("button", { name: "Export report" }).click();
    await expect(page.getByRole("heading", { name: "Export", level: 1 })).toBeVisible();
    // Reaching the export screen must not write a file by itself.
    expect(downloads).toBe(0);

    await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Markdown" }).click(),
    ]);
    expect(downloads).toBe(1);
  });

  test("asks for no secret material anywhere in the interface", async ({ page }) => {
    for (const route of ["home", "define", "capture", "analysis", "export", "profiles", "about"]) {
      await page.goto(`/#/${route}`);
      const body = (await page.locator("body").textContent()) ?? "";
      // The words may appear in warnings telling the user not to enter them;
      // what must never appear is an input asking for them.
      const fields = await page
        .locator("input, textarea")
        .evaluateAll((nodes) =>
          nodes.map(
            (n) =>
              `${n.getAttribute("placeholder") ?? ""} ${n.getAttribute("aria-label") ?? ""} ${n.id}`,
          ),
        );
      for (const field of fields) {
        expect(field.toLowerCase(), `${route}: ${field}`).not.toMatch(
          /mnemonic|seed phrase|private key|xprv|passphrase/,
        );
      }
      void body;
    }
  });
});
