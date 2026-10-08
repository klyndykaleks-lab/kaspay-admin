import { useEffect } from "react";

import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import Categories from "./Categories";
import ProductList from "./ProductList";
import { initializeCatalog } from "../catalog.processes";
import { useCatalogStore } from "../catalog.store";

const CatalogSection = () => {
  const ready = useCatalogStore((state) => state.ready);
  const loading = useCatalogStore((state) => state.loading.setup);
  const error = useCatalogStore((state) => state.error.setup);
  useEffect(() => {
    initializeCatalog();
  }, []);
  if (loading) return <p>Загрузка каталога…</p>;
  if (!ready)
    return (
      <div role="alert" className="space-y-3">
        <p className="text-destructive">
          {error || "Каталог временно недоступен"}
        </p>
        <Button onClick={initializeCatalog}>Повторить</Button>
      </div>
    );
  return (
    <Tabs defaultValue="catalog">
      <TabsList>
        <TabsTrigger value="catalog">Каталог товаров</TabsTrigger>
        <TabsTrigger value="categories">Категории</TabsTrigger>
      </TabsList>
      <TabsContent value="catalog">
        <ProductList />
      </TabsContent>
      <TabsContent value="categories">
        <Categories />
      </TabsContent>
    </Tabs>
  );
};
export default CatalogSection;
