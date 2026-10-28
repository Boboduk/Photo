import "server-only";

import type { GarmentCategory } from "@/lib/constants";

/**
 * Генерация образа через OpenAI Images (редактирование по фото модели и фото вещей).
 * Ключ хранится только на сервере: OPENAI_API_KEY, модель и качество меняются
 * через OPENAI_IMAGE_MODEL / OPENAI_IMAGE_QUALITY, OPENAI_BASE_URL — адрес совместимого
 * шлюза вместо api.openai.com. TRYON_PROVIDER=mock — заглушка
 * для разработки и e2e-тестов без ключа.
 */

export type TryOnInputImage = { bytes: Uint8Array; mimeType: string };

export type TryOnJob = {
  model: TryOnInputImage & { width: number | null; height: number | null };
  garments: (TryOnInputImage & { name: string; category: GarmentCategory })[];
  instructions: string | null;
};

export type TryOnFailureCode = "blocked" | "no_image" | "no_credits" | "region_blocked" | "provider_busy" | "provider_error" | "timeout";

/** Сервис не принимает запросы из страны, где работает сервер. */
export const looksLikeRegionBlock = (text: string) =>
  /location is not supported|unsupported_country|country, region, or territory not supported/i.test(text);

export class TryOnProviderError extends Error {
  constructor(
    readonly code: TryOnFailureCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface TryOnProvider {
  readonly name: string;
  /** Возвращает байты готового изображения. */
  generate(job: TryOnJob): Promise<Uint8Array>;
}

const DEFAULT_OPENAI_MODEL = "gpt-image-1";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const OPENAI_TIMEOUT_MS = 105_000;
const OPENAI_QUALITIES = ["low", "medium", "high", "auto"] as const;

export function getTryOnProvider(): TryOnProvider | null {
  // Заглушка для локальной разработки и e2e-тестов без ключа: возвращает фото модели как есть.
  if (process.env.TRYON_PROVIDER === "mock" && process.env.NODE_ENV !== "production") {
    return mockProvider;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? openAiProvider(apiKey) : null;
}

export function isTryOnConfigured() {
  return getTryOnProvider() !== null;
}

const mockProvider: TryOnProvider = {
  name: "mock",
  async generate(job) {
    return job.model.bytes;
  },
};

const GARMENT_HINTS: Record<GarmentCategory, string> = {
  top: "top (shirt, blouse, T-shirt, sweater)",
  bottom: "bottom (trousers, jeans, skirt, shorts)",
  dress: "dress or jumpsuit",
  outerwear: "outerwear (coat, jacket, blazer)",
  shoes: "shoes",
  accessory: "accessory (bag, hat, jewelry, glasses, belt or scarf)",
  full_look: "complete outfit that replaces the whole current outfit",
};

export function buildTryOnPrompt(job: Pick<TryOnJob, "garments" | "instructions">) {
  const lines = [
    "You are a professional virtual try-on and fashion retouching system.",
    "The first image is the reference photo of the model. Each following image is a clothing item to put on this model.",
    "Create ONE photorealistic photo of the SAME person wearing these items.",
    "",
    "Keep exactly as in the reference photo:",
    "- identity: face, facial features, expression, makeup, skin tone, tattoos and birthmarks;",
    "- hair: style, color and length;",
    "- body: shape, proportions and pose;",
    "- camera angle, framing, background and lighting.",
    "",
    "Change only the clothing: put on the provided items and replace the clothes they cover; keep the rest of the original outfit unless it conflicts with the new items.",
    "Reproduce every item faithfully — color, print, pattern, fabric, texture, logos, cut, length and fit — with natural drape, folds and shadows that match the scene lighting.",
    "If a clothing image shows the item worn by another person, take only the item and ignore that person's face, body and pose.",
    "Fit the clothes to the person, never the person to the clothes. Do not add other people, text, watermarks or items that were not provided.",
  ];
  if (job.instructions) {
    lines.push("", "Additional styling instructions from the user (may be written in Russian):", job.instructions);
  }
  return lines.join("\n");
}

const looksLikeSafetyBlock = (text: string) => /safety|prohibited|blocked|policy|harm/i.test(text);

// --- OpenAI Images -----------------------------------------------------------

type OpenAiImageResponse = {
  data?: { b64_json?: string }[];
  error?: { message?: string; type?: string; code?: string | null };
};

/** Размеры, которые принимает OpenAI Images: портрет, пейзаж или квадрат — по исходному фото. */
function openAiSize(width: number | null, height: number | null) {
  if (!width || !height) return "1024x1536";
  const ratio = width / height;
  if (ratio < 0.85) return "1024x1536";
  if (ratio > 1.18) return "1536x1024";
  return "1024x1024";
}

const extensionFor = (mimeType: string) => (mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp");

function openAiProvider(apiKey: string): TryOnProvider {
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_MODEL;
  const quality = OPENAI_QUALITIES.find((value) => value === process.env.OPENAI_IMAGE_QUALITY) ?? "medium";
  return {
    name: `openai:${model}`,
    async generate(job) {
      // Подписи к изображениям идут в тексте запроса: порядок файлов совпадает с порядком описаний.
      const prompt = [
        buildTryOnPrompt(job),
        "",
        "Images: image 1 is the reference photo of the model.",
        ...job.garments.map((garment, index) => `Image ${index + 2}: ${GARMENT_HINTS[garment.category]} — "${garment.name}".`),
      ].join("\n");

      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", openAiSize(job.model.width, job.model.height));
      form.append("quality", quality);
      // PNG поддерживают все модели gpt-image (webp — не все); в WebP результат перекодируется позже.
      form.append("output_format", "png");
      // Максимально точно сохраняет лицо и детали исходных фото (поддерживает gpt-image-1).
      if (model === "gpt-image-1") form.append("input_fidelity", "high");
      const images = [job.model, ...job.garments];
      images.forEach((image, index) => {
        const blob = new Blob([new Uint8Array(image.bytes)], { type: image.mimeType });
        form.append("image[]", blob, `${index === 0 ? "model" : `item-${index}`}.${extensionFor(image.mimeType)}`);
      });

      let response: Response;
      try {
        response = await fetch(`${(process.env.OPENAI_BASE_URL || OPENAI_BASE_URL).replace(/\/$/, "")}/images/edits`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
          cache: "no-store",
        });
      } catch (error) {
        if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
          throw new TryOnProviderError("timeout");
        }
        throw new TryOnProviderError("provider_error", error instanceof Error ? error.message : String(error));
      }

      const json = (await response.json().catch(() => null)) as OpenAiImageResponse | null;
      if (!response.ok) {
        const message = json?.error?.message ?? `HTTP ${response.status}`;
        const code = json?.error?.code ?? "";
        // 429 бывает и при нехватке средств на счёте — это не «перегрузка», ждать бесполезно.
        if (code === "unsupported_country_region_territory" || looksLikeRegionBlock(message))
          throw new TryOnProviderError("region_blocked", message);
        if (code === "insufficient_quota" || code === "billing_hard_limit_reached" || /no credits|billing|quota/i.test(message)) {
          throw new TryOnProviderError("no_credits", message);
        }
        if (response.status === 429) throw new TryOnProviderError("provider_busy", message);
        if (code === "moderation_blocked" || looksLikeSafetyBlock(`${code} ${message}`)) throw new TryOnProviderError("blocked", message);
        throw new TryOnProviderError("provider_error", message);
      }

      const data = json?.data?.[0]?.b64_json;
      if (!data) throw new TryOnProviderError("no_image");
      return new Uint8Array(Buffer.from(data, "base64"));
    },
  };
}
