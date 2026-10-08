export const ENV = {
  CATALOG_V2: import.meta.env.VITE_CATALOG_V2 === "true",
  SERVER_URL: import.meta.env.VITE_SERVER_URL,
  VERSION_API: import.meta.env.VITE_VERSION_API,
  ORIGIN_APP: import.meta.env.VITE_ORIGIN_APP,
  AUTH_TOKENS: import.meta.env.VITE_AUTH_TOKENS,
};
