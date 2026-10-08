import instanceAxios from "@/config/axios";

// Proposed catalog-v2 contract. Do not route activity changes to legacy DELETE /products/{id}.
export const catalogAPI = {
  validate: async (params) =>
    (await instanceAxios.get("products/catalog/validation", { params })).data,
  capabilities: async () =>
    (await instanceAxios.get("products/catalog/capabilities")).data,
  list: async (params) =>
    (await instanceAxios.get("products/catalog", { params })).data,
  save: async (id, data, idempotencyKey) =>
    (
      await instanceAxios.request({
        method: id ? "put" : "post",
        url: id
          ? `products/catalog/${encodeURIComponent(id)}`
          : "products/catalog",
        data,
        headers: id ? undefined : { "Idempotency-Key": idempotencyKey },
      })
    ).data,
  setActive: async (id, isActive, version) =>
    (
      await instanceAxios.patch(
        `products/catalog/${encodeURIComponent(id)}/active`,
        { isActive, version },
      )
    ).data,
  remove: async (id, version) =>
    (
      await instanceAxios.delete(`products/catalog/${encodeURIComponent(id)}`, {
        params: { version },
      })
    ).data,
  categories: async () =>
    (
      await instanceAxios.get("products/categories", {
        params: { includeInactive: true },
      })
    ).data,
  saveCategory: async (id, data) =>
    (
      await instanceAxios.request({
        method: id ? "put" : "post",
        url: id
          ? `products/categories/${encodeURIComponent(id)}`
          : "products/categories",
        data,
      })
    ).data,
  setCategoryActive: async (id, isActive, version) =>
    (
      await instanceAxios.patch(
        `products/categories/${encodeURIComponent(id)}/active`,
        { isActive, version },
      )
    ).data,
  removeCategory: async (id, version) =>
    (
      await instanceAxios.delete(
        `products/categories/${encodeURIComponent(id)}`,
        { params: { version } },
      )
    ).data,
  countries: async () => (await instanceAxios.get("countries")).data,
  image: async (id) =>
    (
      await instanceAxios.get(`images/${encodeURIComponent(id)}`, {
        responseType: "blob",
      })
    ).data,
};
