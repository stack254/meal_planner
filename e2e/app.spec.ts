import { test, expect } from "@playwright/test";

test("mobile first launch, planning, local data, backup and offline", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await expect(page.getByText(/Good .*Friend/)).toBeVisible();
  await expect(page.getByText("Today’s meals")).toBeVisible();
  await expect(page.getByText("READY TO USE · SAMPLE PROFILE")).toBeVisible();
  await expect(page.getByText(/No weigh-in recorded yet/)).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-first-use.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add food", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").getByLabel("Food").selectOption("milk");
  await page
    .getByRole("dialog")
    .getByLabel(/Quantity/)
    .fill("250");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add food" })
    .last()
    .click();
  await expect(page.getByText(/250 ml milk/).first()).toBeVisible();
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  const replacement = page
    .getByRole("dialog")
    .locator(".replace-results button")
    .first();
  const replacementName = await replacement.locator("b").textContent();
  expect(replacementName).toBeTruthy();
  await replacement.click();
  await expect(
    page.getByRole("heading", { name: replacementName!, exact: true }).first(),
  ).toBeVisible();
  await page.goto("/personalize");
  await expect(page.getByText("Let’s make this yours.")).toBeVisible();
  await page.getByLabel("Your name").fill("Amina");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Start my journey/ }).click();
  await expect(page.getByText(/Good .*Amina/)).toBeVisible();
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Planner" }).click();
  await expect(
    page.getByRole("heading", { name: "Meal planner" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose a plan" }).click();
  await page
    .locator(".plan-option")
    .filter({ hasText: "Balanced everyday Kenyan plan" })
    .getByRole("button", { name: "Use & repeat" })
    .click();
  await expect(page.locator(".plan-guide")).toContainText(
    "Future weeks follow Balanced everyday Kenyan plan",
  );
  await page.screenshot({
    path: "test-results/planner-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add meal", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Recipe").selectOption("banana");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save meal" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Banana" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Month" }).click();
  await expect(page.locator(".month-grid button").first()).toBeVisible();
  await page.getByRole("button", { name: "7-day week" }).click();
  await page.getByRole("link", { name: "More" }).click();
  await page.getByRole("button", { name: /Pantry & prices/ }).click();
  await page.getByRole("button", { name: "Ingredient prices" }).click();
  await page.getByRole("button", { name: "Add price" }).click();
  await page.getByRole("dialog").getByLabel("Ingredient").fill("bananas");
  await page.getByRole("dialog").getByLabel("Unit").fill("pcs");
  await page.getByRole("dialog").getByLabel("Package price (KES)").fill("10");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save price" })
    .click();
  await page.getByRole("link", { name: "Shopping" }).click();
  await expect(page.getByText("bananas").first()).toBeVisible();
  page.once("dialog", (d) => d.accept("40"));
  await page.getByRole("button", { name: "Mark bananas purchased" }).click();
  await expect(
    page.getByRole("heading", { name: "Purchase history" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "More" }).click();
  await page.getByRole("button", { name: /Budget manager/ }).click();
  await page.getByRole("button", { name: "Edit budgets" }).first().click();
  await page.getByRole("dialog").getByLabel("Weekly budget (KES)").fill("1600");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save budgets" })
    .click();
  await page.getByRole("link", { name: "Shopping" }).click();
  await expect(page.getByText("KES 1,600")).toBeVisible();
  await page.getByRole("link", { name: "Progress" }).click();
  await page.getByRole("button", { name: "Log weight" }).click();
  await page.getByRole("dialog").getByLabel("Weight (kg)").fill("53");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save entry" })
    .click();
  await expect(page.getByText("53 kg").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("53 kg").first()).toBeVisible();
  await page.getByRole("link", { name: "More" }).click();
  await page.getByRole("button", { name: /Settings/ }).click();
  await page.getByRole("button", { name: "dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "More" }).click();
  await page.getByRole("button", { name: /Data & backup/ }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export JSON backup/ }).click();
  const backup = await downloaded;
  expect(backup.suggestedFilename()).toMatch(/nourish-backup/);
  const path = await backup.path();
  expect(path).toBeTruthy();
  const fresh = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const other = await fresh.newPage();
  await other.goto("/backup");
  await other.locator("input[type=file]").setInputFiles(path!);
  await expect(other.getByText("Backup preview")).toBeVisible();
  other.on("dialog", (d) => d.accept());
  await other.getByRole("button", { name: "Import backup" }).click();
  await other.getByRole("link", { name: "Home" }).click();
  await expect(other.getByText(/Good .*Amina/)).toBeVisible();
  await other.getByRole("link", { name: "Shopping" }).click();
  await expect(other.getByText("KES 1,600")).toBeVisible();
  await other.getByRole("link", { name: "Home" }).click();
  await other.waitForTimeout(350);
  expect(
    await other.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await other.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await fresh.close();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByText("Backup preview")).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Import backup" }).click();
  await expect(page.getByText("Backup preview")).not.toBeVisible();
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Data & backup" }),
  ).toBeVisible();
});

test("replacement browser is readable and swaps chicken for beef", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/plan");
  await page.getByRole("button", { name: "Expand all days" }).click();
  const chicken = page.locator(".plan-entry").filter({
    has: page.getByRole("heading", { name: "Rice & chicken stew" }),
  });
  await chicken
    .getByRole("button", { name: "Change Rice & chicken stew" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Search meals")).toBeVisible();
  expect(
    await dialog.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await dialog.getByLabel("Search meals").fill("beef stew");
  await expect(
    dialog.getByRole("button", { name: /Slow beef stew/ }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/replace-meal-desktop.png" });
  await dialog.getByRole("button", { name: "Add food" }).first().click();
  await page.screenshot({ path: "test-results/add-food-desktop.png" });
  await dialog.getByRole("button", { name: "Replace meal" }).click();
  await dialog.getByRole("button", { name: /Slow beef stew/ }).click();
  await expect(
    page.getByRole("heading", { name: "Slow beef stew" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 412, height: 915 });
  await page.getByRole("button", { name: "Change Slow beef stew" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Search meals")
    .fill("chicken stew");
  await page.screenshot({ path: "test-results/replace-meal-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await expect(
    page.getByRole("dialog").locator(".replace-results button").first(),
  ).toHaveCSS("background-color", "rgb(43, 64, 49)");
  await page.screenshot({ path: "test-results/replace-meal-dark.png" });
});
