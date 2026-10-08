import { toast } from "sonner";

import { catalogAPI } from "./catalog.api";
import { useCatalogStore } from "./catalog.store";
import { flattenCategories } from "./helpers/catalog";

export const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Не удалось сохранить изменения";
export const checkProductDuplicates = (barcode, name, excludeId) =>
  catalogAPI.validate({
    barcode: barcode.trim(),
    name: name.trim(),
    excludeId,
  });
let listRequest = 0;
export async function initializeCatalog() {
  const store = useCatalogStore.getState();
  store.setLoading({ setup: true });
  store.setError({ setup: "" });
  store.setReady(false);
  try {
    const capabilities = await catalogAPI.capabilities();
    if (
      capabilities.contractVersion !== 2 ||
      !capabilities.atomicProductPhoto ||
      !capabilities.idempotentCreate
    )
      throw new Error("Для этого раздела требуется обновлённый API каталога");
    const [categories, countries] = await Promise.all([
      catalogAPI.categories(),
      catalogAPI.countries(),
    ]);
    store.setCategories(flattenCategories(categories));
    store.setCountries(countries);
    store.setReady(true);
  } catch (error) {
    store.setError({ setup: errorMessage(error) });
  } finally {
    store.setLoading({ setup: false });
  }
}
export async function loadProducts() {
  const store = useCatalogStore.getState();
  if (!store.ready) return;
  const request = ++listRequest;
  const { pagination, filters } = store;
  store.setLoading({ list: true });
  store.setError({ list: "" });
  try {
    const response = await catalogAPI.list({
      page: pagination.page,
      size: pagination.size,
      query: filters.query.trim(),
      state: filters.state,
    });
    if (request !== listRequest) return;
    const lastPage = Math.max(1, response.totalPages);
    if (pagination.page > lastPage) {
      store.setPagination({ page: lastPage });
      return;
    }
    store.setProducts(response.items);
    store.setPagination({
      totalItems: response.totalItems,
      totalPages: response.totalPages,
    });
  } catch (error) {
    if (request === listRequest) {
      store.setProducts([]);
      store.setError({ list: errorMessage(error) });
    }
  } finally {
    if (request === listRequest) store.setLoading({ list: false });
  }
}
async function mutate(operation, message) {
  try {
    const result = await operation();
    toast.success(message, { position: "top-center" });
    return result;
  } catch (error) {
    toast.error(errorMessage(error), { position: "top-center" });
    throw error;
  }
}
export function saveProduct(id, values, file, action, version, idempotencyKey) {
  const data = new FormData();
  data.append(
    "product",
    new Blob(
      [
        JSON.stringify({
          ...values,
          photoAction: action,
          ...(id ? { version } : {}),
        }),
      ],
      { type: "application/json" },
    ),
  );
  if (file) data.append("file", file);
  return mutate(
    () => catalogAPI.save(id, data, idempotencyKey),
    id ? "Товар обновлён" : "Товар добавлен",
  );
}
export const setProductActive = (product, isActive) =>
  mutate(
    () => catalogAPI.setActive(product.id, isActive, product.version),
    isActive ? "Товар активен" : "Товар неактивен",
  );
export const removeProduct = (product) =>
  mutate(() => catalogAPI.remove(product.id, product.version), "Товар удалён");
export async function refreshCategories() {
  const categories = flattenCategories(await catalogAPI.categories());
  useCatalogStore.getState().setCategories(categories);
  return categories;
}
export const saveCategory = (category, values) =>
  mutate(
    () =>
      catalogAPI.saveCategory(category?.id, {
        ...values,
        ...(category ? { version: category.version } : {}),
      }),
    "Категория сохранена",
  );
export const setCategoryActive = (category, isActive) =>
  mutate(
    () => catalogAPI.setCategoryActive(category.id, isActive, category.version),
    isActive ? "Категория активна" : "Категория неактивна",
  );
export const removeCategory = (category) =>
  mutate(
    () => catalogAPI.removeCategory(category.id, category.version),
    "Категория удалена",
  );
export async function loadImage(path) {
  return URL.createObjectURL(await catalogAPI.image(path));
}
