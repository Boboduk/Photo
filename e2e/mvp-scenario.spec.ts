import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createUser, fixture, loginViaUi, registerViaUi, runId, serviceClient } from "./helpers";

/**
 * Критерий готовности MVP: полный сценарий без ручного вмешательства в базу данных.
 * Фотограф и модель регистрируются через интерфейс (с подтверждением почты),
 * общаются в чате в реальном времени, договариваются о съёмке; администратор модерирует.
 */

const photographer = {
  name: `Фотограф ${runId}`,
  username: `ph_${runId}`,
  email: `ph_${runId}@e2e.frame.test`,
  password: "photo-password-123",
  type: "Фотограф" as const,
};
const model = {
  name: `Модель ${runId}`,
  username: `md_${runId}`,
  email: `md_${runId}@e2e.frame.test`,
  password: "model-password-123",
  type: "Модель" as const,
};

const workTitle = `Серия ${runId}`;
const projectTitle = `Ищу модель для съёмки ${runId}`;

let ph: { context: BrowserContext; page: Page };
let md: { context: BrowserContext; page: Page };
let workUrl = "";
let projectUrl = "";
let conversationUrl = "";

async function open(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test.describe.serial("Сценарий MVP", () => {
  test.beforeAll(async ({ browser }) => {
    ph = await open(browser);
    md = await open(browser);
  });

  test.afterAll(async () => {
    await ph.context.close();
    await md.context.close();
  });

  test("1. Фотограф регистрируется и заполняет профиль", async () => {
    const { page } = ph;
    await registerViaUi(page, photographer);
    await expect(page.getByRole("heading", { name: /Добро пожаловать/ })).toBeVisible();

    // Аватар загружается в Storage
    await page.locator("#upload-avatar").setInputFiles(fixture("avatar.jpg"));
    await expect(page.getByText("Сохранено").first()).toBeVisible();

    await page.getByLabel("Город").fill("Москва");
    await page.getByLabel("Пара слов о вас").fill("Снимаю портреты в студии и на улице.");
    await page.getByText("Портрет", { exact: true }).click();
    await page.getByText("TFP", { exact: true }).click();
    await page.getByRole("button", { name: "Готово, перейти в кабинет" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: `Привет, ${photographer.name}!` })).toBeVisible();
  });

  test("2. Фотограф загружает фотографии и публикует портфолио", async () => {
    const { page } = ph;
    await page.goto("/dashboard/portfolio/new");
    await page.getByLabel("Фотографии").setInputFiles([fixture("portrait-1.jpg"), fixture("portrait-2.jpg")]);
    const submit = page.getByRole("button", { name: "Опубликовать работу" });
    await expect(submit).toBeEnabled({ timeout: 30_000 });
    await page.getByLabel("Название работы").fill(workTitle);
    await page.getByLabel("Категория съёмки").selectOption({ label: "Портрет" });
    await page.getByLabel("Теги").fill("портрет, студия");
    await submit.click();

    await expect(page).toHaveURL(/\/portfolio\/[0-9a-f-]{36}$/);
    workUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: workTitle })).toBeVisible();
    const image = page.locator(`img[alt="${workTitle}"]`).first();
    await expect(image).toBeVisible();
    await expect(image).toHaveJSProperty("complete", true);
    expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    // Работа видна в публичной ленте
    await page.goto(`/portfolio?q=${encodeURIComponent(workTitle)}`);
    await expect(page.getByRole("link", { name: workTitle })).toBeVisible();
  });

  test("2b. Фотограф публикует объявление о съёмке", async () => {
    const { page } = ph;
    await page.goto("/dashboard/projects/new");
    await page.getByLabel("Название проекта").fill(projectTitle);
    await page.getByLabel("Описание").fill("Портретная съёмка в студии с мягким светом. Опыт не обязателен.");
    await page.getByLabel("Город").fill("Москва");
    await page.getByLabel("Использование снимков").fill("Все участники используют кадры в портфолио.");
    await page.getByRole("button", { name: "Опубликовать объявление" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
    projectUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible();
  });

  test("3. Модель регистрируется", async () => {
    const { page } = md;
    await registerViaUi(page, model);
    await page.getByRole("button", { name: "Заполню позже" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("4–5. Модель находит фотографа через поиск, открывает профиль и пишет", async () => {
    const { page } = md;
    await page.goto("/photographers");
    await page.getByRole("searchbox", { name: "Поиск" }).fill(photographer.name);
    await page.getByRole("searchbox", { name: "Поиск" }).press("Enter");
    await expect(page.getByRole("heading", { name: photographer.name })).toBeVisible();
    await page.getByRole("link", { name: photographer.name }).click();
    await expect(page).toHaveURL(new RegExp(`/users/${photographer.username}$`));
    await expect(page.getByRole("heading", { name: photographer.name, level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Написать" }).click();
    await expect(page).toHaveURL(/\/dashboard\/messages\/[0-9a-f-]{36}$/);
    conversationUrl = new URL(page.url()).pathname;

    // Повторное «Написать» открывает тот же диалог, а не создаёт новый
    await page.goto(`/users/${photographer.username}`);
    await page.getByRole("button", { name: "Написать" }).click();
    await expect(page).toHaveURL(new RegExp(`${conversationUrl}$`));

    const input = page.getByRole("textbox", { name: "Сообщение", exact: true });
    await input.fill("Здравствуйте! Хочу поучаствовать в портретной съёмке.");
    await input.press("Enter");
    await expect(page.getByRole("log").getByText("Здравствуйте! Хочу поучаствовать в портретной съёмке.")).toBeVisible();
  });

  test("6. Фотограф получает сообщение в реальном времени и отвечает", async () => {
    // Фотограф уже открыт в кабинете — счётчик обновляется без перезагрузки страницы.
    await ph.page.goto("/dashboard");
    await expect(ph.page.getByRole("link", { name: /Сообщения/ }).first()).toContainText("1", { timeout: 20_000 });

    await ph.page.goto(conversationUrl);
    await expect(ph.page.getByRole("log").getByText("Здравствуйте! Хочу поучаствовать в портретной съёмке.")).toBeVisible();

    // Модель видит отметку о прочтении
    await expect(md.page.getByRole("log").getByText("Прочитано").first()).toBeVisible({ timeout: 20_000 });

    const input = ph.page.getByRole("textbox", { name: "Сообщение", exact: true });
    await input.fill("Привет! Давай в субботу в студии?");
    await input.press("Enter");

    // Ответ появляется у модели без перезагрузки
    await expect(md.page.getByRole("log").getByText("Привет! Давай в субботу в студии?")).toBeVisible({ timeout: 20_000 });

    // История сохраняется после обновления страницы
    await md.page.reload();
    await expect(md.page.getByRole("log").getByText("Привет! Давай в субботу в студии?")).toBeVisible();
  });

  test("7. Модель откликается на объявление (отклик + сообщение в чат)", async () => {
    const { page } = md;
    await page.goto(projectUrl);
    await page.getByRole("button", { name: "Откликнуться" }).click();
    await page.getByLabel("Сообщение автору").fill("Готова к съёмке, удобно в выходные.");
    await page.getByRole("button", { name: "Отправить отклик" }).click();
    await expect(page.getByText("Отклик отправлен").first()).toBeVisible();
    await expect(page.getByText("На рассмотрении")).toBeVisible();

    // Отклик продублирован в существующий диалог (а не в новый)
    await page.goto(conversationUrl);
    await expect(page.getByRole("log").getByText(`Отклик на проект «${projectTitle}»`)).toBeVisible();
  });

  test("8. Фотограф видит уведомление и принимает отклик", async () => {
    const { page } = ph;
    await page.goto("/dashboard/notifications");
    await expect(page.getByText(new RegExp(`откликнулся\\(ась\\) на ваш проект «${projectTitle}»`))).toBeVisible();

    await page.goto(`/dashboard${projectUrl}`);
    await expect(page.getByText("Готова к съёмке, удобно в выходные.")).toBeVisible();
    await page.getByRole("button", { name: "Принять" }).click();
    await expect(page.getByText("Отклик принят").first()).toBeVisible();

    await md.page.goto("/dashboard/applications");
    await expect(md.page.getByText("Принят", { exact: true })).toBeVisible();
    await md.page.goto("/dashboard/notifications");
    await expect(md.page.getByText(/принял\(а\) ваш отклик/)).toBeVisible();
  });

  test("9. Личный кабинет: проекты, сообщения, сохранённые работы", async () => {
    const { page } = md;
    await page.goto(workUrl);
    // Ждём ответа сервера, а не только оптимистичного обновления кнопки.
    const serverAction = () => page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/portfolio/"));
    await Promise.all([serverAction(), page.getByRole("button", { name: "Сохранить в избранное" }).click()]);
    await expect(page.getByRole("button", { name: "Убрать из избранного" })).toBeVisible();
    await Promise.all([serverAction(), page.getByRole("button", { name: "Нравится" }).click()]);
    await expect(page.getByRole("button", { name: "Убрать отметку «Нравится»" })).toBeVisible();

    await page.goto("/dashboard/favorites");
    await expect(page.getByRole("link", { name: workTitle })).toBeVisible();
    await page.goto("/dashboard/messages");
    await expect(page.getByRole("link", { name: new RegExp(photographer.name) })).toBeVisible();

    await ph.page.goto("/dashboard/projects");
    await expect(ph.page.getByRole("link", { name: projectTitle })).toBeVisible();
    await ph.page.goto("/dashboard/notifications");
    await expect(ph.page.getByText(new RegExp(`оценил\\(а\\) вашу работу «${workTitle}»`))).toBeVisible();
  });

  test("10. Администратор модерирует, не получая доступа к перепискам", async ({ browser }) => {
    // Модель жалуется на сообщение фотографа
    await md.page.goto(conversationUrl);
    const message = md.page.getByRole("log").getByText("Привет! Давай в субботу в студии?");
    await message.hover();
    await md.page.getByRole("button", { name: "Пожаловаться на сообщение" }).first().click();
    await md.page.getByText("Спам или реклама").click();
    await md.page.getByRole("button", { name: "Отправить жалобу" }).click();
    await expect(md.page.getByText(/Жалоба отправлена/)).toBeVisible();

    // Обычный пользователь не видит админку
    await md.page.goto("/admin");
    await expect(md.page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();

    // Администратор (роль выдаётся скриптом make-admin; здесь — сервисным ключом)
    const adminUser = await createUser(`adm_${runId}`);
    await serviceClient().from("profiles").update({ role: "admin" }).eq("id", adminUser.id);
    const admin = await open(browser);
    await loginViaUi(admin.page, adminUser.email, adminUser.password);

    await admin.page.goto("/admin");
    await expect(admin.page.getByText("Пользователей", { exact: true })).toBeVisible();
    await expect(admin.page.getByText(/администраторы не имеют доступа к содержимому личных диалогов/)).toBeVisible();

    // Жалоба видна вместе с текстом только обжалованного сообщения
    await admin.page.goto("/admin/reports");
    await expect(admin.page.getByText("Привет! Давай в субботу в студии?")).toBeVisible();
    await expect(admin.page.getByText("Здравствуйте! Хочу поучаствовать в портретной съёмке.")).toHaveCount(0);

    // Саму переписку администратор открыть не может
    await admin.page.goto(conversationUrl);
    await expect(admin.page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();

    // Скрытие работы модератором
    await admin.page.goto(`/admin/content?q=${encodeURIComponent(workTitle)}`);
    await admin.page.getByRole("button", { name: "Скрыть" }).first().click();
    await admin.page.getByRole("dialog").getByRole("button", { name: "Скрыть" }).click();
    await expect(admin.page.getByText("Контент скрыт").first()).toBeVisible();
    const guest = await open(browser);
    await guest.page.goto(workUrl);
    await expect(guest.page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    // Автор видит пометку о скрытии
    await ph.page.goto(workUrl);
    await expect(ph.page.getByText("Работа скрыта модератором")).toBeVisible();

    // Блокировка пользователя
    await admin.page.goto(`/admin/users?q=${model.username}`);
    await admin.page.getByRole("button", { name: "Заблокировать" }).click();
    await admin.page.getByRole("dialog").getByRole("button", { name: "Заблокировать" }).click();
    await expect(admin.page.getByText("Пользователь заблокирован").first()).toBeVisible();

    await md.page.goto("/dashboard");
    await expect(md.page).toHaveURL(/\/banned$/);
    await guest.page.goto(`/users/${model.username}`);
    await expect(guest.page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();

    await guest.context.close();
    await admin.context.close();
  });
});
