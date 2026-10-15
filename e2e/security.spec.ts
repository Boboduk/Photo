import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { anonClient, createUser, fixture, runId, serviceClient } from "./helpers";

/**
 * Проверки прав доступа напрямую через API Supabase (в обход интерфейса):
 * политики RLS, привилегии на колонки и проверки внутри функций базы данных.
 */
test.describe.serial("Права доступа (RLS)", () => {
  let alice: Awaited<ReturnType<typeof createUser>>;
  let bob: Awaited<ReturnType<typeof createUser>>;
  let eve: Awaited<ReturnType<typeof createUser>>;
  let conversationId = "";
  let aliceItemId = "";

  test.beforeAll(async () => {
    alice = await createUser(`sa_${runId}`, "photographer");
    bob = await createUser(`sb_${runId}`, "model");
    eve = await createUser(`se_${runId}`, "both");
  });

  test("гость не видит приватные данные", async () => {
    const anon = anonClient();
    for (const table of ["profile_private", "messages", "conversations", "notifications", "reports", "project_applications"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(5);
      expect(error !== null || (data ?? []).length === 0, `${table} доступна гостю`).toBe(true);
    }
    const { error } = await anon.rpc("admin_stats");
    expect(error).not.toBeNull();
  });

  test("пользователь не может выдать себе роль или снять блокировку", async () => {
    const { error } = await alice.client.from("profiles").update({ role: "admin" }).eq("id", alice.id);
    expect(error?.code).toBe("42501");
    const { error: banError } = await alice.client.from("profiles").update({ banned_at: null }).eq("id", alice.id);
    expect(banError?.code).toBe("42501");
    const { data } = await serviceClient().from("profiles").select("role").eq("id", alice.id).single();
    expect(data?.role).toBe("user");
  });

  test("приватный профиль читает только владелец", async () => {
    await alice.client.from("profile_private").update({ contact_phone: "+7 900 000-00-00" }).eq("id", alice.id);
    const { data } = await bob.client.from("profile_private").select("*").eq("id", alice.id);
    expect(data).toEqual([]);
    // Контакты скрыты по умолчанию и в публичной функции
    const { data: details } = await bob.client.rpc("profile_public_details", { p_profile: alice.id });
    expect((details as { contacts: unknown }).contacts).toBeNull();
  });

  test("чужие работы нельзя редактировать и удалять", async () => {
    const { data: item, error } = await alice.client
      .from("portfolio_items")
      .insert({ title: "Работа Алисы", is_published: true })
      .select("id")
      .single();
    expect(error).toBeNull();
    aliceItemId = item!.id;

    const { data: updated } = await bob.client.from("portfolio_items").update({ title: "Взлом" }).eq("id", aliceItemId).select("id");
    expect(updated).toEqual([]);
    const { data: deleted } = await bob.client.from("portfolio_items").delete().eq("id", aliceItemId).select("id");
    expect(deleted).toEqual([]);
    // Подменить владельца нельзя: колонка owner_id закрыта для записи
    const { error: ownerError } = await bob.client.from("portfolio_items").insert({ title: "Чужая", owner_id: alice.id } as never);
    expect(ownerError).not.toBeNull();
    // Накрутить лайки нельзя
    const { error: likesError } = await alice.client.from("portfolio_items").update({ likes_count: 999 } as never).eq("id", aliceItemId);
    expect(likesError).not.toBeNull();
  });

  test("лайки и избранное: переключение и счётчик", async () => {
    const { data: liked, error } = await bob.client.rpc("toggle_like", { p_item: aliceItemId });
    expect(error).toBeNull();
    expect(liked).toMatchObject({ liked: true, likes_count: 1 });
    const { data: unliked } = await bob.client.rpc("toggle_like", { p_item: aliceItemId });
    expect(unliked).toMatchObject({ liked: false, likes_count: 0 });

    const { data: saved, error: saveError } = await bob.client.rpc("toggle_favorite", { p_item: aliceItemId });
    expect(saveError).toBeNull();
    expect(saved).toBe(true);
    const { data: savedProfile } = await bob.client.rpc("toggle_favorite", { p_profile: alice.id });
    expect(savedProfile).toBe(true);
    const { data: rows } = await bob.client.from("favorites").select("item_id, profile_id");
    expect(rows).toHaveLength(2);
    // Чужое избранное не видно
    const { data: aliceView } = await alice.client.from("favorites").select("*").eq("user_id", bob.id);
    expect(aliceView).toEqual([]);
  });

  test("файлы можно загружать только в свою папку", async () => {
    const file = readFileSync(fixture("avatar.jpg"));
    const own = await alice.client.storage.from("media").upload(`${alice.id}/test/${runId}.jpg`, file, { contentType: "image/jpeg" });
    expect(own.error).toBeNull();
    const foreign = await bob.client.storage.from("media").upload(`${alice.id}/test/${runId}-bob.jpg`, file, { contentType: "image/jpeg" });
    expect(foreign.error).not.toBeNull();
    const removed = await bob.client.storage.from("media").remove([`${alice.id}/test/${runId}.jpg`]);
    expect(removed.data ?? []).toEqual([]);
    // Недопустимый тип файла отклоняется хранилищем
    const wrongType = await alice.client.storage
      .from("media")
      .upload(`${alice.id}/test/${runId}.html`, Buffer.from("<script>alert(1)</script>"), { contentType: "text/html" });
    expect(wrongType.error).not.toBeNull();
  });

  test("диалоги: один на пару, переписка видна только участникам", async () => {
    const { data: first } = await alice.client.rpc("get_or_create_direct_conversation", { p_other: bob.id });
    const { data: second } = await bob.client.rpc("get_or_create_direct_conversation", { p_other: alice.id });
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    conversationId = first as string;

    const { error: sendError } = await alice.client.from("messages").insert({ conversation_id: conversationId, body: "Секрет" });
    expect(sendError).toBeNull();

    // Третий пользователь не видит и не может писать
    const { data: eveMessages } = await eve.client.from("messages").select("*").eq("conversation_id", conversationId);
    expect(eveMessages).toEqual([]);
    const { error: eveSend } = await eve.client.from("messages").insert({ conversation_id: conversationId, body: "Вмешательство" });
    expect(eveSend).not.toBeNull();
    const { data: eveList } = await eve.client.rpc("list_conversations", { p_conversation: conversationId });
    expect(eveList).toEqual([]);

    // Нельзя отправить сообщение от чужого имени
    const { error: spoofError } = await bob.client
      .from("messages")
      .insert({ conversation_id: conversationId, body: "Подделка", sender_id: alice.id } as never);
    expect(spoofError).not.toBeNull();

    // Боб видит сообщение и непрочитанный счётчик
    const { data: counts } = await bob.client.rpc("unread_counts");
    expect((counts as { messages: number }).messages).toBeGreaterThan(0);
  });

  test("администратор не читает переписки", async () => {
    const admin = await createUser(`sx_${runId}`);
    await serviceClient().from("profiles").update({ role: "admin" }).eq("id", admin.id);
    const { data: stats, error } = await admin.client.rpc("admin_stats");
    expect(error).toBeNull();
    expect((stats as { messages_total: number }).messages_total).toBeGreaterThan(0);
    const { data: messages } = await admin.client.from("messages").select("*").eq("conversation_id", conversationId);
    expect(messages).toEqual([]);
    // Обычному пользователю админские функции недоступны
    const { error: userError } = await alice.client.rpc("admin_stats");
    expect(userError?.code).toBe("42501");
    const { error: banError } = await alice.client.rpc("admin_set_user_ban", { p_user: bob.id, p_banned: true });
    expect(banError?.code).toBe("42501");
  });

  test("блокировка запрещает переписку в обе стороны", async () => {
    const { error } = await bob.client.from("user_blocks").insert({ blocked_id: alice.id });
    expect(error).toBeNull();
    const { error: sendError } = await alice.client.from("messages").insert({ conversation_id: conversationId, body: "После блокировки" });
    expect(sendError).not.toBeNull();
    const { error: newConversation } = await alice.client.rpc("get_or_create_direct_conversation", { p_other: bob.id });
    // Существующий диалог открыть можно, но писать — нельзя
    expect(newConversation).toBeNull();
    await bob.client.from("user_blocks").delete().eq("blocked_id", alice.id);
  });

  test("заблокированный пользователь не может публиковать", async () => {
    await serviceClient().from("profiles").update({ banned_at: new Date().toISOString() }).eq("id", eve.id);
    const { error } = await eve.client.from("portfolio_items").insert({ title: "После бана" });
    expect(error).not.toBeNull();
    const { error: projectError } = await eve.client.from("projects").insert({
      title: "Проект после бана",
      description: "Описание проекта после блокировки",
      looking_for: ["model"],
      collab_format: "tfp",
    });
    expect(projectError).not.toBeNull();
    // Профиль скрыт из публичного доступа
    const { data } = await anonClient().from("profiles").select("id").eq("id", eve.id);
    expect(data).toEqual([]);
  });

  test("ограничение частоты сообщений", async () => {
    const results = [];
    for (let i = 0; i < 22; i++) {
      results.push(await alice.client.from("messages").insert({ conversation_id: conversationId, body: `Флуд ${i}` }));
    }
    const limited = results.filter((r) => r.error?.message === "rate_limited");
    expect(limited.length).toBeGreaterThan(0);
  });

  test("удаление собственного аккаунта", async () => {
    const temp = await createUser(`sd_${runId}`);
    const { error } = await temp.client.rpc("delete_own_account");
    expect(error).toBeNull();
    const { data } = await serviceClient().from("profiles").select("id").eq("id", temp.id);
    expect(data).toEqual([]);
  });
});
