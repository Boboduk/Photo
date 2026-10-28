const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const QWERTY = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const JCUKEN = "йцукенгшщзхъфывапролджэячсмитьбюё";

/**
 * Текст, набранный в английской раскладке вместо русской: «vjcrdf» → «москва».
 * Возвращает null, если в тексте нет латиницы или уже есть кириллица.
 */
export function fixKeyboardLayout(value: string): string | null {
  if (!/[a-z]/i.test(value) || /[а-яё]/i.test(value)) return null;
  return value
    .toLowerCase()
    .split("")
    .map((char) => {
      const index = QWERTY.indexOf(char);
      return index === -1 ? char : JCUKEN[index];
    })
    .join("");
}

/** Предлагает адрес профиля по имени: «Анна Смирнова» → anna.smirnova */
export function suggestUsername(name: string): string {
  const latin = name
    .toLowerCase()
    .split("")
    .map((char) => MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
  return latin.slice(0, 30);
}
