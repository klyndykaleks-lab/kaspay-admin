import assert from "node:assert/strict";
import test from "node:test";

import {
  categorySchema,
  findCategoryDuplicate,
  flattenCategories,
  photoAction,
  productDefaults,
  productSchema,
  validatePhoto,
} from "../src/modules/products/catalogIntegration/helpers/catalog.js";

const input = {
  ...productDefaults(),
  name: "Полное название",
  shortName: "Короткое",
  barcode: "000123",
  categoryId: "1",
};
test("required fields reject blank input; optional fields remain empty and barcode keeps zeroes", () => {
  for (const field of ["name", "shortName", "barcode", "categoryId"])
    assert.equal(
      productSchema.safeParse({ ...input, [field]: "" }).success,
      false,
    );
  for (const field of ["name", "shortName", "barcode"])
    assert.equal(
      productSchema.safeParse({ ...input, [field]: "   " }).success,
      false,
    );
  const result = productSchema.parse({
    ...input,
    countryCode: "",
    ingredients: "",
    weight: "",
  });
  assert.equal(result.weight, null);
  assert.equal(result.countryCode, null);
  assert.equal(result.barcode, "000123");
});
test("default country only for create and units preserved", () => {
  assert.equal(productDefaults().countryCode, "BLR");
  assert.equal(productDefaults({ country: null }).countryCode, "");
  for (const unit of ["pcs", "ml", "gr"])
    assert.equal(productSchema.parse({ ...input, unit }).unit, unit);
});
test("weight and nutrients reject invalid numbers; decimals survive", () => {
  for (const weight of ["0", "-1", "abc", "Infinity"])
    assert.equal(productSchema.safeParse({ ...input, weight }).success, false);
  assert.equal(
    productSchema.parse({
      ...input,
      weight: "1,5",
      macronutrients: { ...input.macronutrients, carbohydrates: "10,6" },
    }).macronutrients.carbohydrates,
    10.6,
  );
  assert.equal(
    productSchema.safeParse({
      ...input,
      macronutrients: { ...input.macronutrients, proteins: "-1" },
    }).success,
    false,
  );
});
test("category duplicate check includes inactive, case/whitespace, own ID excluded", () => {
  const categories = [
    { id: "1", name: "Готовая еда", isActive: false },
    { id: "2", name: "Снеки", isActive: true },
  ];
  assert.equal(findCategoryDuplicate(categories, "  ГОТОВАЯ   ЕДА ").id, "1");
  assert.equal(findCategoryDuplicate(categories, "Снеки", "2"), undefined);
  assert.equal(findCategoryDuplicate(categories, "Готовая еда", "2").id, "1");
  assert.equal(
    categorySchema.parse({ name: "Новая", description: "" }).description,
    "",
  );
});
test("hierarchical categories flattened once preserving stable IDs", () => {
  assert.equal(
    flattenCategories([{ id: "1", subCategories: [{ id: "2" }] }, { id: "2" }])
      .length,
    2,
  );
});
test("photo changes remain explicit, never confuse removal with keep", () => {
  assert.equal(photoAction(null, false), "keep");
  assert.equal(photoAction(null, true), "remove");
  assert.equal(photoAction({}, true), "replace");
});
test("photo limits are enforced on both dimensions and size; invalid URLs released", async () => {
  const originalURL = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalImage = globalThis.Image;
  let width = 150;
  let height = 150;
  let revocations = 0;
  URL.createObjectURL = () => "blob:photo";
  URL.revokeObjectURL = () => revocations++;
  globalThis.Image = class {
    set src(_) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this.onload();
    }
  };
  const file = { name: "photo.png", type: "image/png", size: 1024 };
  try {
    assert.equal(await validatePhoto(file), "blob:photo");
    width = 151;
    await assert.rejects(validatePhoto(file), /150/);
    width = 150;
    height = 151;
    await assert.rejects(validatePhoto(file), /150/);
    assert.equal(revocations, 2);
    await assert.rejects(
      validatePhoto({ ...file, size: 1024 * 1024 + 1 }),
      /1 MB/,
    );
    await assert.rejects(validatePhoto({ ...file, type: "image/gif" }), /jpeg/);
    await assert.rejects(validatePhoto({ ...file, name: "photo.gif" }), /jpeg/);
  } finally {
    URL.createObjectURL = originalURL;
    URL.revokeObjectURL = originalRevoke;
    globalThis.Image = originalImage;
  }
});
