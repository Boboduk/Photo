/** Ограничения примерочной. Количество моделей и нарядов дублируется в триггерах БД. */
export const TRYON_LIMITS = {
  /** Сколько вещей можно надеть за одну генерацию */
  garmentsPerLook: 5,
  instructionsMax: 500,
  nameMax: 80,
  models: 20,
  garments: 300,
  /** Сколько моделей платформы показывать в списке */
  platformModels: 200,
} as const;

/** Длинная сторона изображения при загрузке (больше модели генерации не нужно). */
export const TRYON_UPLOAD_SIZE = {
  model: 2048,
  garment: 1600,
} as const;

/** Срок жизни подписанных ссылок на файлы из приватного бакета, секунды. */
export const TRYON_SIGNED_URL_TTL = 60 * 60 * 2;

/** Генерация, которая «висит» дольше, считается прерванной. */
export const TRYON_STALE_MS = 5 * 60 * 1000;
