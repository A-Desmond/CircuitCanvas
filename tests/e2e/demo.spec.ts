import { expect, test } from "@playwright/test";

test("hero circuit survives the core human demo flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load Push Button LED" }).click();

  await expect(page.getByText("Supported circuit looks healthy")).toBeVisible();
  await expect(page.getByText("100", { exact: true })).toBeVisible();

  const resistorNode = page.locator(".react-flow__node[data-id='cmp_resistor']");
  const beforeDrag = await resistorNode.boundingBox();
  expect(beforeDrag).not.toBeNull();
  if (beforeDrag) {
    await page.mouse.move(beforeDrag.x + beforeDrag.width / 2, beforeDrag.y + 20);
    await page.mouse.down();
    await page.mouse.move(beforeDrag.x + beforeDrag.width / 2 + 90, beforeDrag.y + 70, { steps: 8 });
    const duringDrag = await resistorNode.boundingBox();
    expect(duringDrag?.x).toBeGreaterThan(beforeDrag.x + 50);
    await expect(resistorNode.locator(".circuit-node")).toHaveClass(/is-dragging/);
    await page.mouse.up();
    await expect(resistorNode.locator(".circuit-node")).not.toHaveClass(/is-dragging/);
  }

  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.getByTestId("physical-view")).toBeVisible();
  await expect(page.locator("[data-scene-component='cmp_led']")).toHaveText("LED1");
  await expect(page.locator("[data-scene-wire='conn_led_signal']")).toHaveAttribute("data-source-pin", "GPIO18");

  await page.getByRole("button", { name: "Code", exact: true }).click();
  await expect(page.locator(".binding-chip").filter({ hasText: "LED_PIN" })).toContainText("GPIO18");
  await page.getByRole("button", { name: "Plain text mode" }).click();
  const source = page.getByRole("textbox", { name: "Firmware source" });
  const firmware = await source.inputValue();
  await source.fill(firmware.replace("#define LED_PIN 18", "#define LED_PIN 19"));
  await expect(page.locator(".binding-chip").filter({ hasText: "LED_PIN" })).toContainText("GPIO19");

  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("[data-scene-wire='conn_led_signal']")).toHaveAttribute("data-source-pin", "GPIO19");

  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByText("R1", { exact: true }).click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("LED needs a series resistor")).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Supported circuit looks healthy")).toBeVisible();
});
