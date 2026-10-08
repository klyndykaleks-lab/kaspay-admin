import { z } from "zod";

export const normalizeName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru");
export const findCategoryDuplicate = (categories, name, ownId) => {
  const normalized = normalizeName(name);
  return (
    normalized &&
    categories.find(
      (item) =>
        String(item.id) !== String(ownId) &&
        normalizeName(item.name) === normalized,
    )
  );
};
const numberField = (optional = false, minimum = 0) =>
  z.preprocess(
    (value) => {
      if (value === "" || value == null) return optional ? null : 0;
      return Number(String(value).trim().replace(",", "."));
    },
    optional
      ? z
          .number()
          .finite()
          .min(minimum, `Значение должно быть не меньше ${minimum}`)
          .nullable()
      : z
          .number()
          .finite()
          .min(minimum, "Значение не может быть отрицательным"),
  );

export const productSchema = z.object({
  name: z.string().trim().min(1, "Укажите полное название").max(512),
  shortName: z.string().trim().min(1, "Укажите короткое название").max(512),
  barcode: z
    .string()
    .trim()
    .min(1, "Укажите штрихкод")
    .max(16, "Не больше 16 символов"),
  categoryId: z.string().min(1, "Выберите категорию"),
  weight: numberField(true, 1),
  countryCode: z
    .string()
    .transform((value) => value || null)
    .nullable(),
  ingredients: z.string().trim().max(2048),
  unit: z.enum(["pcs", "ml", "gr"]),
  macronutrients: z.object({
    calories: numberField(),
    proteins: numberField(),
    fat: numberField(),
    carbohydrates: numberField(),
  }),
});
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(255),
  description: z.string().trim().max(2048),
});
export const productDefaults = (product) => ({
  name: product?.name ?? "",
  shortName: product?.shortName ?? "",
  barcode: product?.barcode ?? "",
  categoryId: product?.category?.id == null ? "" : String(product.category.id),
  weight: product?.weight ?? "",
  countryCode: product ? (product.country?.code ?? "") : "BLR",
  ingredients: product?.ingredients ?? "",
  unit: product?.unit ?? "pcs",
  macronutrients: {
    calories: product?.macronutrients?.calories ?? "",
    proteins: product?.macronutrients?.proteins ?? "",
    fat: product?.macronutrients?.fat ?? "",
    carbohydrates: product?.macronutrients?.carbohydrates ?? "",
  },
});
export const photoAction = (file, removed) =>
  file ? "replace" : removed ? "remove" : "keep";
export const pageAfterRemoval = (page, totalItems, size) =>
  Math.max(1, Math.min(page, Math.ceil(Math.max(0, totalItems - 1) / size)));
export function flattenCategories(items) {
  const result = new Map();
  function visit(category) {
    if (result.has(String(category.id))) return;
    result.set(String(category.id), category);
    (category.subCategories ?? []).forEach(visit);
  }
  items.forEach(visit);
  return [...result.values()];
}

export async function validatePhoto(file) {
  if (
    !["image/jpeg", "image/png", "image/jpg"].includes(file.type) ||
    !/\.(jpe?g|png)$/i.test(file.name)
  )
    throw new Error("Допустимые форматы: jpeg, jpg, png");
  if (file.size > 1024 * 1024)
    throw new Error("Максимальный размер файла: 1 MB");
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        image.naturalWidth <= 150 && image.naturalHeight <= 150
          ? resolve()
          : reject(new Error("Максимальное разрешение: 150 × 150 пикселей"));
      image.onerror = () =>
        reject(new Error("Файл повреждён или не является изображением"));
      image.src = url;
    });
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
