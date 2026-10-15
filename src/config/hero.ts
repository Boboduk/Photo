/**
 * Изображения для главного экрана, если в базе ещё мало работ.
 * Как только участники опубликуют портфолио, главная покажет их работы.
 */
export const heroFallbackImages = [
  {
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&h=1600&q=80",
    width: 1200,
    height: 1600,
    alt: "Fashion-портрет",
  },
  {
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&h=1600&q=80",
    width: 1200,
    height: 1600,
    alt: "Editorial-съёмка",
  },
  {
    url: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=1200&h=1600&q=80",
    width: 1200,
    height: 1600,
    alt: "Фотостудия",
  },
] as const;
