import React, { useState } from "react";
import { useLocation } from "react-router";

import { ENV } from "@/constants";
import { PAGE_TITLES } from "@/constants/routes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import CatalogSection from "./catalogIntegration/components/CatalogSection";
//import ProductsCoffeeMachineSection from './components/productsCoffeeMachine/ProductsCoffeeMachineSection';
import MatricesSection from "./matrices/components/MatricesSection";
import ProductCreate from "./productsCatalog/components/ProductCreate";
import ProductList from "./productsCatalog/components/ProductList";

function ProductsPage() {
  const { pathname, state } = useLocation();
  const [activeTab, setActiveTab] = useState(state?.tab || "products");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{PAGE_TITLES[pathname]}</h1>
        <p className="text-muted-foreground">
          Управление каталогом товаров и шаблонами матриц
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Товары</TabsTrigger>
          {/* <TabsTrigger value="coffeeMachineProducts">Товары для кофемашины</TabsTrigger> */}
          <TabsTrigger value="matrix-templates">Шаблоны матриц</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          {ENV.CATALOG_V2 ? (
            <CatalogSection />
          ) : (
            <>
              <div className="mt-5 mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Каталог товаров</h2>
                <ProductCreate />
              </div>
              <ProductList />
            </>
          )}
        </TabsContent>

        <TabsContent value="coffeeMachineProducts">
          {/* <ProductsCoffeeMachineSection /> */}
        </TabsContent>

        <TabsContent value="matrix-templates">
          <MatricesSection />
        </TabsContent>
      </Tabs>

      {/* <div className="mt-5 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Каталог товаров</h2>
        <ProductCreate />
      </div>
      <ProductList /> */}
    </div>
  );
}

export const Component = ProductsPage;
