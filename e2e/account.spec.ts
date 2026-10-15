import { expect, test } from "@playwright/test";
import { createUser, fixture, loginViaUi, runId, serviceClient, waitForAuthLink } from "./helpers";

test.describe("Аккаунт", () => {
  test("восстановление пароля по ссылке из письма", async ({ page, context }) => {
    const user = await createUser(`rp_${runId}`);
    await page.goto("/forgot-password");
    await page.getByLabel("Электронная почта").fill(user.email);
    await page.getByRole("button", { name: "Отправить ссылку" }).click();
    await expect(page.getByRole("heading", { name: "Проверьте почту" })).toBeVisible();

    const link = await waitForAuthLink(user.email, "Восстановление доступа");
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("Новый пароль").fill("brand-new-password-1");
    await page.getByLabel("Повторите пароль").fill("brand-new-password-1");
    await page.getByRole("button", { name: "Сохранить пароль" }).click();
    await expect(page.getByRole("heading", { name: "Пароль обновлён" })).toBeVisible();

    await context.clearCookies();
    await loginViaUi(page, user.email, "brand-new-password-1");
    await expect(page).toHaveURL(/\/(dashboard|welcome)/);
  });

  test("редактирование профиля и приватность контактов", async ({ page, browser }) => {
    const user = await createUser(`pe_${runId}`, "model");
    await loginViaUi(page, user.email, user.password);

    await page.goto("/dashboard/profile");
    await page.getByLabel("Город").fill("Казань");
    await page.getByLabel("О себе").fill("Модель, люблю арт-проекты.");
    await page.getByText("Арт-проекты", { exact: true }).click();
    await page.getByLabel("Рост, см").fill("172");
    await page.getByLabel("Показывать параметры модели в профиле").check();
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByText("Профиль сохранён").first()).toBeVisible();

    await page.goto("/dashboard/settings");
    await page.getByLabel("Кто видит мои контакты").selectOption("members");
    await page.getByLabel("Telegram").fill("@pe_model");
    await page.getByRole("button", { name: "Сохранить" }).first().click();
    await expect(page.getByText("Настройки приватности сохранены").first()).toBeVisible();

    // Гость видит параметры, но не контакты (они только для зарегистрированных)
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/users/pe_${runId}`);
    await expect(guestPage.getByText("Казань")).toBeVisible();
    await expect(guestPage.getByText("172 см")).toBeVisible();
    await expect(guestPage.getByText("@pe_model")).toHaveCount(0);
    await guest.close();

    // Другой пользователь видит контакты
    const other = await createUser(`po_${runId}`);
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await loginViaUi(otherPage, other.email, other.password);
    await otherPage.goto(`/users/pe_${runId}`);
    await expect(otherPage.getByText("@pe_model")).toBeVisible();
    await otherContext.close();
  });

  test("удаление аккаунта удаляет данные и файлы", async ({ page }) => {
    const user = await createUser(`dl_${runId}`);
    await loginViaUi(page, user.email, user.password);

    await page.goto("/dashboard/profile");
    await page.locator("#upload-avatar").setInputFiles(fixture("avatar.jpg"));
    await expect(page.getByText("Сохранено").first()).toBeVisible();
    const admin = serviceClient();
    const before = await admin.storage.from("avatars").list(`${user.id}/avatar`);
    expect(before.data?.length).toBe(1);

    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Удалить аккаунт" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/введите адрес профиля/).fill(`dl_${runId}`);
    await dialog.getByRole("button", { name: "Удалить аккаунт" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Аккаунт удалён").first()).toBeVisible();

    const { data: profile } = await admin.from("profiles").select("id").eq("id", user.id);
    expect(profile).toEqual([]);
    const after = await admin.storage.from("avatars").list(`${user.id}/avatar`);
    expect(after.data ?? []).toEqual([]);
  });
});
