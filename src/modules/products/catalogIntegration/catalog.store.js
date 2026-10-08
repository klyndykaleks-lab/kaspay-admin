import { create } from "zustand";

export const useCatalogStore = create((set, get) => ({
  products: [],
  categories: [],
  countries: [],
  ready: false,
  filters: { query: "", state: "active" },
  pagination: { page: 1, size: 10, totalItems: 0, totalPages: 0 },
  loading: { list: false, setup: true },
  error: { list: "", setup: "" },
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setCountries: (countries) => set({ countries }),
  setReady: (ready) => set({ ready }),
  setFilters: (data) =>
    set({
      filters: { ...get().filters, ...data },
      pagination: { ...get().pagination, page: 1 },
    }),
  setPagination: (data) =>
    set({ pagination: { ...get().pagination, ...data } }),
  setLoading: (data) => set({ loading: { ...get().loading, ...data } }),
  setError: (data) => set({ error: { ...get().error, ...data } }),
}));
