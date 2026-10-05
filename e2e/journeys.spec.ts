import { test, expect, type Page } from "@playwright/test";

/**
 * The journeys a real user takes, end to end through the interface they get.
 * Separate from product-flows.spec.ts, which pins individual behaviours.
 */

async function defineProcess(page: Page, name: string, source?: string): Promise<void> {
  await page.goto("/#/define");
  await page.getByLabel("What are you calibrating").fill(name);
  if (source) await page.getByRole("button", { name: source }).click();
  await page.getByRole("button", { name: "Continue to calibration" }).click();
  await expect(page.getByRole("heading", { name: "Record the calibration" })).toBeVisible();
}

test.describe("first run", () => {
  test("a newcomer reaches the argument in two clicks", async ({ page }) => {
    await page.goto("/");

    // The claim is on screen before any interaction.
    await expect(page.getByText("2.4815").first()).toBeVisible();
    await expect(page.getByText("Once order is considered")).toBeVisible();

    await page
      .getByRole("button", { name: /Periodic balanced d6/ })
      .first()
      .click();

    await expect(page.locator(".figure").first()).toContainText("0.0000");
    await expect(
      page.getByText(/Balanced counts do not make a sequence unpredictable/),
    ).toBeVisible();
  });

  test("the home screen teaches the next step, not just the claim", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Describe the process")).toBeVisible();
    await expect(page.getByText("Record the outcomes")).toBeVisible();
    await expect(page.getByText("Read what limits you")).toBeVisible();
  });
});

test.describe("physical calibration workflow", () => {
  test("the d6 protocol is shown before any rolling", async ({ page }) => {
    await page.goto("/#/define");
    await page.getByLabel("What are you calibrating").fill("White acrylic d6");

    // The protocol has to be readable while deciding, not after.
    await expect(page.getByText("3 × 256")).toBeVisible();
    await expect(
      page.getByText(/fails to come to rest flat inside the throwing area/),
    ).toBeVisible();
    await expect(page.getByText(/the same die/)).toBeVisible();
  });

  test("capture shows session progress against the protocol", async ({ page }) => {
    await defineProcess(page, "Session progress d6");

    await expect(page.getByText("Session 1 of 3")).toBeVisible();
    await expect(page.locator(".progress__value")).toHaveText("0");
    await expect(page.locator(".progress__of")).toContainText("256");

    await page.locator("h1").click();
    for (const key of "123456") await page.keyboard.press(key);
    await expect(page.locator(".progress__value")).toHaveText("6");
  });

  test("a coin source carries its own protocol, not the dice one", async ({ page }) => {
    await page.goto("/#/define");
    await page.getByLabel("What are you calibrating").fill("Two pence coin");
    await page.getByRole("button", { name: "Coin" }).click();
    await expect(page.getByText(/the same coin/)).toBeVisible();
    await expect(page.getByText(/does not turn over/)).toBeVisible();
  });

  test("a custom source is given no invented session target", async ({ page }) => {
    // Nobody has decided what a session is for a custom source, so the
    // product must not pretend one exists.
    await page.goto("/#/define");
    await page.getByLabel("What are you calibrating").fill("Bag of tiles");
    await page.getByRole("button", { name: "Custom source" }).click();
    await expect(page.getByText(/No session size is prescribed/)).toBeVisible();
    await expect(page.getByText("3 × 256")).toHaveCount(0);
  });
});

test.describe("insufficient evidence", () => {
  test("separates analysis running from evidence being enough", async ({ page }) => {
    await defineProcess(page, "Short session");

    await page.locator("h1").click();
    for (const key of "123456123456") await page.keyboard.press(key);

    // The capture screen says what twelve observations support.
    await expect(page.getByText("Frequency only")).toBeVisible();
    await expect(page.getByText(/says little about predictability/)).toBeVisible();

    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();

    // And the result says which methods could not run.
    await expect(page.getByText(/could not run on this sample/)).toBeVisible();
    await expect(
      page.getByText("Collect more observations before relying on this result."),
    ).toBeVisible();
  });

  test("names the next threshold rather than just warning", async ({ page }) => {
    await defineProcess(page, "Threshold");
    await page.locator("h1").click();
    for (const key of "123456") await page.keyboard.press(key);
    await expect(page.getByText(/122 more unlocks the Markov estimate/)).toBeVisible();
  });
});

test.describe("import preserves order", () => {
  test("reads a pasted session in the order supplied", async ({ page }) => {
    await defineProcess(page, "Import order");

    await page.getByLabel("Paste recorded outcomes").fill("6 5 4 3 2 1");
    await page.getByRole("button", { name: "Read pasted text" }).click();

    // Order is what every sequential method depends on, so the tape must
    // show it exactly as supplied rather than sorted or normalised.
    await expect(page.locator(".tape")).toContainText("6 5 4 3 2 1");
    await expect(page.getByText("Read 6 observations.")).toBeVisible();
  });
});

test.describe("provenance cannot be confused", () => {
  test("a synthetic fixture is labelled as generated, not measured", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /Fair-like d6/ })
      .first()
      .click();

    const band = page.locator(".provenance");
    await expect(band).toContainText("Synthetic test fixture");
    await expect(band).toContainText("never touched a die");
    await expect(band).not.toContainText("Physical calibration sample");
    await expect(page.locator(".provenance--synthetic")).toBeVisible();
  });

  test("hand-recorded observations are not labelled synthetic", async ({ page }) => {
    await defineProcess(page, "Hand recorded");
    await page.locator("h1").click();
    for (const key of "123456123456") await page.keyboard.press(key);
    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();

    const band = page.locator(".provenance");
    await expect(band).toContainText("Recorded calibration sample");
    await expect(band).not.toContainText("Synthetic");
  });

  test("provenance reaches the exported report", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /Fair-like d6/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Export report" }).click();

    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download JSON" }).click(),
    ]).then(([d]) => d);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    expect(report.dataset.provenance).toBe("Synthetic test fixture");
  });
});

test.describe("the report matches the screen", () => {
  test("a custom target appears in both", async ({ page }) => {
    // The divergence this guards against: Analysis and Export once analysed
    // separately, and only one passed the profile's entropy target.
    await page.goto("/#/define");
    await page.getByLabel("What are you calibrating").fill("Custom target");
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Custom entropy target in bits").fill("192");
    await page.getByRole("button", { name: "Continue to calibration" }).click();

    await page
      .getByLabel("Paste recorded outcomes")
      .fill(Array.from({ length: 300 }, (_, i) => ((i * 7 + 3) % 6) + 1).join(" "));
    await page.getByRole("button", { name: "Read pasted text" }).click();
    await page.getByRole("button", { name: /^Analyze \d+ observations$/ }).click();

    // The target drives the guidance section, whether or not a count is
    // shown: at a zero rate the count is deliberately withheld, and that is
    // not what this test is about.
    await expect(page.getByText("Reaching 192 bits")).toBeVisible();

    await page.getByRole("button", { name: "Export report" }).click();
    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download JSON" }).click(),
    ]).then(([d]) => d);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    expect(report.analysis.targetGuidance.map((g: { targetBits: number }) => g.targetBits)).toEqual(
      [128, 192, 256],
    );
  });

  test("the governing figure is identical in screen and report", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /Sticky d6/ })
      .first()
      .click();

    await page.getByRole("button", { name: "Export report" }).click();
    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download JSON" }).click(),
    ]).then(([d]) => d);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const reported = report.analysis.conservativeBitsPerSymbol.toFixed(4);

    // Asserted rather than snapshotted. The figure counts up to its value,
    // so reading it into a variable races the animation; toHaveText retries
    // until it settles and then compares against what the report contains.
    await page.goBack();
    await expect(page.locator(".figure").first()).toHaveText(reported);
    expect(reported).toBe("0.4765");
  });
});

test.describe("method authority is visible", () => {
  test("does not present all four methods as equally authoritative", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /Fair-like d6/ })
      .first()
      .click();

    await expect(page.locator(".chip--authority-generalised")).toContainText(
      "Generalised, not the published method",
    );
    await expect(page.locator(".chip--authority-adapted").first()).toContainText("adapted");
    await expect(page.locator(".chip--authority-direct").first()).toContainText("used directly");
  });

  test("the methods screen uses the same words as the result", async ({ page }) => {
    await page.goto("/#/about");
    await expect(page.locator(".chip--authority-generalised")).toContainText(
      "Generalised, not the published method",
    );
    await expect(page.getByText(/not a NIST validation and confers no/)).toBeVisible();
  });
});
