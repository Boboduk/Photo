import "server-only";

import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { brand } from "@/config/brand";
import { siteUrl } from "@/config/site";
import { dictionaries } from "@/i18n/dictionaries";
import { defaultLocale } from "@/i18n/config";
import { AVAILABILITY_STATUSES, COLLAB_FORMATS, EXPERIENCE_LEVELS, PROJECT_STATUSES, TEAM_ROLES } from "@/lib/constants";
import { searchPortfolio, searchProfiles, searchProjects } from "@/lib/queries/search";
import { createTokenClient } from "@/lib/supabase/token";
import { fixKeyboardLayout } from "@/lib/translit";
import { TRYON_LIMITS, TRYON_SIGNED_URL_TTL } from "@/lib/tryon/config";
import { getTryOnStudio, requestTryOnPhoto, runTryOn } from "@/lib/tryon/service";
import type { TablesUpdate } from "@/types/database";
import type { Paged, PortfolioCardData } from "@/types/views";
import type { McpAuthInfo } from "./auth";
import { mergeSocialLinks, profileCompleteness, profilePatchSchema, resolveSpecializations } from "./profile";

/**
 * MCP-сервер FRAME: инструменты для ИИ-ассистентов. Экземпляр создаётся на каждый
 * HTTP-запрос и работает строго от имени владельца токена — данные фильтрует RLS,
 * как и для сайта. Описания инструментов адресованы модели, поэтому на английском.
 */

const t = dictionaries[defaultLocale];

const links = {
  profile: (username: string) => `${siteUrl}/users/${username}`,
  work: (id: string) => `${siteUrl}/portfolio/${id}`,
  project: (id: string) => `${siteUrl}/projects/${id}`,
  tryon: `${siteUrl}/dashboard/tryon`,
  editProfile: `${siteUrl}/dashboard/profile`,
  editPortfolio: `${siteUrl}/dashboard/portfolio`,
};

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.]{3,30}$/);

const SEARCH_HELP =
  "Typo-tolerant: misspellings, partial words and other word endings match (масква → Москва, свадебного → Свадебная съёмка). " +
  "Pass the user's own words; put the city into `city`, not `query` (мск, спб, питер, екб are expanded). " +
  "If nothing matches, the response has `did_you_mean` — retry with those terms, fewer words or fewer filters before telling the user nothing was found.";

const json = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});
const fail = (message: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

const clip = (value: string | null | undefined, max: number) =>
  value && value.length > max ? `${value.slice(0, max - 1)}…` : (value ?? null);

const text = (max: number) => z.string().trim().max(max);
const paging = {
  limit: z.number().int().min(1).max(50).default(10).describe("Page size (1–50)"),
  offset: z.number().int().min(0).max(10_000).default(0).describe("Offset for pagination: use next_offset from the previous page"),
};

const workCard = (work: PortfolioCardData) => ({
  id: work.id,
  title: work.title,
  category: work.category_slug,
  author: {
    username: work.owner_username,
    display_name: work.owner_display_name,
  },
  likes: work.likes_count,
  images: work.images_count,
  cover_image_url: work.cover_image_url,
  created_at: work.created_at,
  url: links.work(work.id),
});

/** Инструкции MCP-сервера — их же получает ассистент на сайте (lib/assistant). */
export const FRAME_MCP_INSTRUCTIONS = [
  `${brand.name} is a community platform where photographers, models and shoot crews find each other, publish portfolios and post shoot projects (casting calls). Most content is in Russian.`,
  "Use search_people, search_portfolio and search_projects to find content; call list_filters first to learn valid category and profile type slugs.",
  "Search forgives typos, partial words, city abbreviations and text typed in the wrong keyboard layout. When the user's request is vague or misspelled, work out what they mean, search, and if nothing is found use did_you_mean and retry before giving up.",
  "To help the user fill in their profile: call get_my_profile, ask only about the missing fields (one or two at a time), draft texts like the bio from their answers, show the draft and save with update_my_profile after they agree. Photos and portfolio works are uploaded on the website.",
  `The virtual fitting room keeps the model's appearance and changes only the outfit. The model is either the user's own upload or a registered ${brand.name} model who opted in to try-ons (platform_models); garments are always the user's own uploads. Call tryon_list for ids, then tryon_generate. Models listed in models_without_photo have not opened a photo yet: with the user's consent, tryon_request_model asks them to. New photos are uploaded on the website: ${links.tryon}`,
].join("\n");

export function createFrameMcpServer(auth: McpAuthInfo) {
  const db = createTokenClient(auth.token);
  const userId = auth.extra.userId;

  const server = new McpServer(
    { name: "frame", title: brand.name, version: "1.0.0", websiteUrl: siteUrl },
    {
      instructions: FRAME_MCP_INSTRUCTIONS,
    },
  );

  /**
   * Поиск с подстраховкой: если ничего не нашлось, пробуем исправить раскладку клавиатуры
   * («vjcrdf» → «москва»), а затем подсказываем похожие имена, города, категории и теги.
   */
  async function helpfulSearch<T>(
    input: { query?: string; city?: string },
    run: (input: { query?: string; city?: string }) => Promise<Paged<T>>,
  ) {
    const page = await run(input);
    if (page.total > 0 || (!input.query && !input.city)) return { page };

    const layout = {
      query: input.query ? fixKeyboardLayout(input.query) : null,
      city: input.city ? fixKeyboardLayout(input.city) : null,
    };
    if (layout.query || layout.city) {
      const retry = {
        query: layout.query ?? input.query,
        city: layout.city ?? input.city,
      };
      const second = await run(retry);
      if (second.total > 0)
        return {
          page: second,
          corrected: { ...retry, reason: "keyboard_layout" },
        };
    }

    const terms = [input.query, input.city].filter((term): term is string => Boolean(term));
    const suggestions = await Promise.all(terms.map((term) => db.rpc("search_suggestions", { p_query: term, p_limit: 5 })));
    const didYouMean = suggestions.flatMap(({ data }) => data ?? []).map(({ term, kind }) => ({ term, kind }));
    return {
      page,
      did_you_mean: didYouMean,
      hint: didYouMean.length
        ? "Nothing matched. Retry with a did_you_mean term (kind tells which field it belongs to: city → city, category → specializations/category slug via list_filters)."
        : "Nothing matched. Retry with fewer words or fewer filters.",
    };
  }

  const helpFields = ({ corrected, did_you_mean, hint }: { corrected?: object; did_you_mean?: object[]; hint?: string }) => ({
    ...(corrected ? { corrected } : {}),
    ...(did_you_mean ? { did_you_mean } : {}),
    ...(hint ? { hint } : {}),
  });

  /** Свой профиль целиком: поля, приватные параметры, что не заполнено и допустимые значения. */
  async function ownProfile() {
    const [{ data: profile }, { data: details }, { data: categories }, { data: profileTypes }, { count: worksCount }] = await Promise.all([
      db
        .from("profiles")
        .select(
          "username, display_name, avatar_url, city, bio, profile_type, specializations, experience, availability, collab_formats, social_links",
        )
        .eq("id", userId)
        .single(),
      db
        .from("profile_private")
        .select("birth_date, show_age, height_cm, clothing_size, shoe_size, hair_color, eye_color, show_params")
        .eq("id", userId)
        .maybeSingle(),
      db.from("categories").select("slug, name, for_photographers, for_models").eq("is_active", true).order("sort_order"),
      db.from("profile_types").select("slug, name, shows_in_model_catalog").eq("is_active", true).order("sort_order"),
      db.from("portfolio_items").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("is_published", true),
    ]);
    if (!profile) return null;
    const isModel = Boolean(profileTypes?.find((type) => type.slug === profile.profile_type)?.shows_in_model_catalog);
    const { avatar_url, ...fields } = profile;
    return {
      profile: {
        ...fields,
        has_avatar: Boolean(avatar_url),
        url: links.profile(profile.username),
      },
      private_details: details,
      published_works: worksCount ?? 0,
      completeness: profileCompleteness(profile, details, {
        isModel,
        worksCount: worksCount ?? 0,
        editUrl: links.editProfile,
        portfolioUrl: links.editPortfolio,
      }),
      options: {
        profile_types: (profileTypes ?? []).map(({ slug, name }) => ({
          slug,
          name,
        })),
        specializations: categories ?? [],
        experience: t.enums.experience,
        availability: t.enums.availability,
        collab_formats: t.enums.collabFormat,
      },
      edit_on_website: links.editProfile,
    };
  }

  server.registerTool(
    "whoami",
    {
      title: "Current user",
      description: `The ${brand.name} account this assistant is connected to.`,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const { data } = await db
        .from("profiles")
        .select("username, display_name, profile_type, city, specializations, created_at")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return fail("Profile not found");
      return json({ ...data, url: links.profile(data.username) });
    },
  );

  server.registerTool(
    "list_filters",
    {
      title: "Filter values",
      description:
        "Valid values for search filters: shoot categories/specializations, profile types, experience, availability, collaboration formats, team roles, project statuses and garment categories — with Russian labels.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const [{ data: categories }, { data: profileTypes }] = await Promise.all([
        db.from("categories").select("slug, name, for_works, for_photographers, for_models").eq("is_active", true).order("sort_order"),
        db.from("profile_types").select("slug, name").eq("is_active", true).order("sort_order"),
      ]);
      return json({
        categories: categories ?? [],
        profile_types: profileTypes ?? [],
        experience: t.enums.experience,
        availability: t.enums.availability,
        collab_formats: t.enums.collabFormat,
        team_roles: t.enums.teamRole,
        project_statuses: t.enums.projectStatus,
        garment_categories: t.enums.garmentCategory,
      });
    },
  );

  server.registerTool(
    "search_people",
    {
      title: "Search photographers and models",
      description: `Search members by name or keywords (also matches city, bio, profile type and genres), city and filters. Returns public profile cards with links. ${SEARCH_HELP}`,
      inputSchema: z.object({
        kind: z.enum(["photographer", "model"]).optional().describe("Catalog to search; omit to search everyone"),
        query: text(100).optional().describe("Name or keywords"),
        city: text(80).optional(),
        profile_types: z
          .array(z.string().regex(/^[a-z0-9-]{2,40}$/))
          .max(10)
          .optional()
          .describe("Profile type slugs (list_filters)"),
        specializations: z.array(text(40)).max(12).optional().describe("Category slugs (list_filters)"),
        experience: z.array(z.enum(EXPERIENCE_LEVELS)).optional(),
        availability: z.array(z.enum(AVAILABILITY_STATUSES)).optional(),
        collab_formats: z.array(z.enum(COLLAB_FORMATS)).optional(),
        sort: z.enum(["relevance", "newest", "active"]).default("relevance"),
        ...paging,
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const found = await helpfulSearch({ query: args.query || undefined, city: args.city || undefined }, ({ query, city }) =>
        searchProfiles(
          {
            kind: args.kind,
            q: query,
            city,
            types: args.profile_types ?? [],
            specializations: args.specializations ?? [],
            experience: args.experience ?? [],
            availability: args.availability ?? [],
            formats: args.collab_formats ?? [],
            tags: [],
            sort: args.sort,
          },
          args.offset,
          args.limit,
          db,
        ),
      );
      const { page } = found;
      return json({
        total: page.total,
        next_offset: page.nextOffset,
        ...helpFields(found),
        items: page.items.map((p) => ({
          username: p.username,
          display_name: p.display_name,
          profile_type: p.profile_type,
          city: p.city,
          bio: clip(p.bio, 300),
          specializations: p.specializations,
          experience: p.experience,
          availability: p.availability,
          collab_formats: p.collab_formats,
          works_count: p.works_count,
          last_active_at: p.last_active_at,
          url: links.profile(p.username),
        })),
      });
    },
  );

  server.registerTool(
    "get_profile",
    {
      title: "Get profile",
      description: "Public profile by username: bio, specializations, public details the member chose to show, and recent portfolio works.",
      inputSchema: z.object({
        username: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9_.]{3,30}$/),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ username }) => {
      const { data: profile } = await db
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, city, bio, profile_type, specializations, experience, availability, collab_formats, social_links, created_at, last_active_at",
        )
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (!profile) return fail("Profile not found");
      const [{ data: details }, works] = await Promise.all([
        db.rpc("profile_public_details", { p_profile: profile.id }),
        searchPortfolio({ owner: profile.id, sort: "newest" }, 0, 12, db),
      ]);
      const { id: _id, ...rest } = profile;
      return json({
        ...rest,
        url: links.profile(profile.username),
        public_details: details,
        recent_works: works.items.map(workCard),
      });
    },
  );

  server.registerTool(
    "search_portfolio",
    {
      title: "Search portfolio works",
      description: `Search published portfolio works (photo series) by keywords (title, description, author, genre, tags), category, tag or author. ${SEARCH_HELP}`,
      inputSchema: z.object({
        query: text(100).optional(),
        category: text(40).optional().describe("Category slug (list_filters)"),
        tag: text(32).optional(),
        username: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9_.]{3,30}$/)
          .optional()
          .describe("Only works by this author"),
        sort: z.enum(["newest", "popular"]).default("newest"),
        ...paging,
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      let owner: string | undefined;
      if (args.username) {
        const { data } = await db.from("profiles").select("id").eq("username", args.username.toLowerCase()).maybeSingle();
        if (!data) return fail("Author not found");
        owner = data.id;
      }
      const found = await helpfulSearch({ query: args.query || undefined }, ({ query }) =>
        searchPortfolio(
          {
            q: query,
            category: args.category || undefined,
            tag: args.tag || undefined,
            owner,
            sort: args.sort,
          },
          args.offset,
          args.limit,
          db,
        ),
      );
      const { page } = found;
      return json({
        total: page.total,
        next_offset: page.nextOffset,
        ...helpFields(found),
        items: page.items.map(workCard),
      });
    },
  );

  server.registerTool(
    "get_portfolio_item",
    {
      title: "Get portfolio work",
      description: "A portfolio work with its description, all image URLs, tags and credited crew.",
      inputSchema: z.object({ id: z.uuid() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const { data } = await db
        .from("portfolio_items")
        .select(
          `id, title, description, category_slug, shot_on, likes_count, created_at,
          author:profiles!portfolio_items_owner_id_fkey(username, display_name),
          images:portfolio_images(url, width, height, position),
          tags:portfolio_tags(tag),
          credits:portfolio_credits(role, name, profile:profiles!portfolio_credits_profile_id_fkey(username, display_name))`,
        )
        .eq("id", id)
        .order("position", { referencedTable: "portfolio_images" })
        .maybeSingle();
      if (!data) return fail("Work not found");
      return json({
        ...data,
        images: data.images.map(({ url, width, height }) => ({
          url,
          width,
          height,
        })),
        tags: data.tags.map((tag) => tag.tag),
        url: links.work(data.id),
      });
    },
  );

  server.registerTool(
    "search_projects",
    {
      title: "Search shoot projects",
      description: `Search shoot projects and casting calls: who is needed, format, city and date. ${SEARCH_HELP}`,
      inputSchema: z.object({
        query: text(100).optional(),
        city: text(80).optional(),
        category: text(40).optional().describe("Category slug (list_filters)"),
        collab_format: z.enum(COLLAB_FORMATS).optional(),
        looking_for: z.enum(TEAM_ROLES).optional().describe("Role the project is looking for"),
        include_closed: z.boolean().default(false).describe("Also return projects that are no longer recruiting"),
        sort: z.enum(["newest", "soon"]).default("newest").describe("soon = nearest shoot date first"),
        ...paging,
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const found = await helpfulSearch({ query: args.query || undefined, city: args.city || undefined }, ({ query, city }) =>
        searchProjects(
          {
            q: query,
            city,
            category: args.category || undefined,
            format: args.collab_format,
            role: args.looking_for,
            statuses: args.include_closed ? [...PROJECT_STATUSES] : ["open"],
            sort: args.sort,
          },
          args.offset,
          args.limit,
          db,
        ),
      );
      const { page } = found;
      return json({
        total: page.total,
        next_offset: page.nextOffset,
        ...helpFields(found),
        items: page.items.map((p) => ({
          id: p.id,
          title: p.title,
          description: clip(p.description, 400),
          city: p.city,
          shoot_date: p.shoot_date,
          category: p.category_slug,
          looking_for: p.looking_for,
          collab_format: p.collab_format,
          spots: p.spots,
          status: p.status,
          applications: p.applications_count,
          author: {
            username: p.author_username,
            display_name: p.author_display_name,
          },
          url: links.project(p.id),
        })),
      });
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get shoot project",
      description: "Full shoot project: description, terms, image usage rights, requirements and author. Applying is done on the website.",
      inputSchema: z.object({ id: z.uuid() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const { data } = await db
        .from("projects")
        .select(
          `id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights,
          requirements, spots, status, applications_count, cover_url, created_at,
          author:profiles!projects_author_id_fkey(username, display_name, city)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (!data) return fail("Project not found");
      return json({ ...data, url: links.project(data.id) });
    },
  );

  server.registerTool(
    "tryon_list",
    {
      title: "Fitting room: models, garments and looks",
      description: `The user's virtual fitting room: own model photos, registered platform models who allowed try-ons, the user's garments and generated looks, with ids. Image URLs are private and expire in ${TRYON_SIGNED_URL_TTL / 3600} hours.`,
      inputSchema: z.object({
        results_limit: z.number().int().min(0).max(50).default(10).describe("How many recent looks to include"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ results_limit }) => {
      const studio = await getTryOnStudio(db, userId, results_limit);
      return json({
        upload_page: links.tryon,
        models: studio.models.map(({ id, name, url, is_shared }) => ({
          id,
          name,
          url,
          shared_with_others: is_shared,
        })),
        platform_models: studio.platformModels.map(({ id, url, owner }) => ({
          id,
          url,
          model: {
            username: owner.username,
            display_name: owner.display_name,
            city: owner.city,
            profile_url: links.profile(owner.username),
          },
        })),
        models_without_photo: studio.modelProfiles.map(({ username, display_name, city, requested_at }) => ({
          username,
          display_name,
          city,
          already_requested: requested_at !== null,
          profile_url: links.profile(username),
        })),
        requests_to_open_my_photo: studio.incomingRequests,
        garments: studio.garments.map(({ id, name, category, url }) => ({
          id,
          name,
          category,
          url,
        })),
        looks: studio.results.map(({ id, status, model_id, garment_ids, instructions, error, created_at, url }) => ({
          id,
          status,
          model_id,
          garment_ids,
          instructions,
          error,
          created_at,
          url,
        })),
      });
    },
  );

  server.registerTool(
    "tryon_generate",
    {
      title: "Fitting room: try garments on a model",
      description: `Generate a photo of the same model (face, body, pose and background unchanged) wearing 1–${TRYON_LIMITS.garmentsPerLook} of the user's garments. model_id may be the user's own model or a platform model from tryon_list. Takes 15–60 seconds and is rate limited.`,
      inputSchema: z.object({
        model_id: z.uuid(),
        garment_ids: z.array(z.uuid()).min(1).max(TRYON_LIMITS.garmentsPerLook),
        instructions: text(TRYON_LIMITS.instructionsMax).optional().describe("Optional styling notes, e.g. 'tuck the shirt in'"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      const outcome = await runTryOn(db, userId, {
        modelId: args.model_id,
        garmentIds: args.garment_ids,
        instructions: args.instructions || null,
      });
      if (!outcome.ok) return fail(`${outcome.code}: ${t.tryon.errors[outcome.code]}`);

      // Ассистенту отдаём уменьшенную копию: полный файл доступен по ссылке.
      const preview = await sharp(outcome.image.bytes)
        .resize({
          width: 1024,
          height: 1024,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                look_id: outcome.result.id,
                url: outcome.result.url,
                url_expires_in_hours: TRYON_SIGNED_URL_TTL / 3600,
                fitting_room: links.tryon,
              },
              null,
              2,
            ),
          },
          {
            type: "image",
            data: preview.toString("base64"),
            mimeType: "image/jpeg",
          },
        ],
      };
    },
  );

  server.registerTool(
    "tryon_request_model",
    {
      title: "Fitting room: ask a model to open a photo",
      description:
        "Ask a FRAME model from tryon_list.models_without_photo to open a photo for try-ons. The model gets a notification from the user and decides herself; the same model can be asked once per 30 days. Confirm with the user before calling.",
      inputSchema: z.object({ username: usernameSchema }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ username }) => {
      const { data: profile } = await db.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
      if (!profile) return fail("not_found: Model not found");
      const status = await requestTryOnPhoto(db, profile.id);
      if (status === "requested") return json({ status, message: t.tryon.requests.status.requested });
      return fail(`${status}: ${status === "generic" ? t.errors.generic : t.tryon.requests.status[status]}`);
    },
  );

  server.registerTool(
    "get_my_profile",
    {
      title: "My profile and what to fill in",
      description:
        "The connected user's own profile with private details, completeness (percent and missing fields with hints) and valid options for every field. Use it before helping the user fill in or improve the profile.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const data = await ownProfile();
      return data ? json(data) : fail("Profile not found");
    },
  );

  server.registerTool(
    "update_my_profile",
    {
      title: "Update my profile",
      description:
        "Update fields of the user's own profile; omitted fields stay unchanged. Show the user what will be saved and get their agreement first. Returns the updated profile and what is still missing. Photos and portfolio works are uploaded on the website.",
      inputSchema: profilePatchSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (patch) => {
      const { data: current } = await db.from("profiles").select("username, social_links, onboarded_at").eq("id", userId).single();
      if (!current) return fail("Profile not found");
      const update: TablesUpdate<"profiles"> = {};
      const problems: string[] = [];

      if (patch.display_name !== undefined) update.display_name = patch.display_name;
      if (patch.bio !== undefined) update.bio = patch.bio || null;
      if (patch.city !== undefined) {
        if (!patch.city) update.city = null;
        else {
          const { data: city } = await db.rpc("normalize_city", {
            p_city: patch.city,
          });
          const value = (city ?? patch.city).trim();
          update.city = value.charAt(0).toUpperCase() + value.slice(1);
        }
      }
      if (patch.profile_type !== undefined) {
        const { data: type } = await db
          .from("profile_types")
          .select("slug")
          .eq("slug", patch.profile_type)
          .eq("is_active", true)
          .maybeSingle();
        if (type) update.profile_type = type.slug;
        else problems.push(`profile_type: unknown "${patch.profile_type}" (see options.profile_types)`);
      }
      if (patch.specializations !== undefined) {
        const { data: categories } = await db.from("categories").select("slug, name").eq("is_active", true);
        const { resolved, unknown } = resolveSpecializations(patch.specializations, categories ?? []);
        if (unknown.length)
          problems.push(`specializations: unknown ${unknown.map((v) => `"${v}"`).join(", ")} (see options.specializations)`);
        else update.specializations = resolved;
      }
      if (patch.experience !== undefined) update.experience = patch.experience;
      if (patch.availability !== undefined) update.availability = patch.availability;
      if (patch.collab_formats !== undefined) update.collab_formats = [...new Set(patch.collab_formats)];
      if (patch.social !== undefined) {
        const { links: merged, invalid } = mergeSocialLinks(current.social_links, patch.social);
        if (invalid.length) problems.push(`social: not a valid link or @handle for ${invalid.join(", ")}`);
        else update.social_links = merged;
      }
      if (patch.birth_date && !(new Date(patch.birth_date) < new Date() && new Date(patch.birth_date) > new Date("1900-01-01"))) {
        problems.push("birth_date: not a valid date of birth");
      }
      // Ничего не сохраняем, пока есть ошибки: ассистент исправит и повторит запрос целиком.
      if (problems.length) return fail(`Nothing saved. ${problems.join("; ")}`);

      const privateKeys = [
        "birth_date",
        "show_age",
        "height_cm",
        "clothing_size",
        "shoe_size",
        "hair_color",
        "eye_color",
        "show_params",
      ] as const;
      const privateUpdate: Record<string, string | number | boolean | null> = {};
      for (const key of privateKeys) {
        const value = patch[key];
        if (value !== undefined) privateUpdate[key] = typeof value === "string" ? value || null : value;
      }
      if (Object.keys(update).length === 0 && Object.keys(privateUpdate).length === 0) return fail("Nothing to update");

      if (Object.keys(update).length > 0) {
        if (!current.onboarded_at) update.onboarded_at = new Date().toISOString();
        const { error } = await db.from("profiles").update(update).eq("id", userId);
        if (error) return fail(`Not saved: ${error.message}`);
      }
      if (Object.keys(privateUpdate).length > 0) {
        const { error } = await db
          .from("profile_private")
          .update(privateUpdate as TablesUpdate<"profile_private">)
          .eq("id", userId);
        if (error) return fail(`Profile saved, private details not saved: ${error.message}`);
      }

      revalidatePath("/dashboard", "layout");
      revalidatePath(`/users/${current.username}`);
      const data = await ownProfile();
      return json({
        saved: [...Object.keys(update).filter((key) => key !== "onboarded_at"), ...Object.keys(privateUpdate)],
        ...data,
      });
    },
  );

  return server;
}
