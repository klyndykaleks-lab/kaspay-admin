import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import AppTable from "@/shared/AppTable";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import ActiveSwitch from "./ActiveSwitch";
import CatalogPagination from "./CatalogPagination";
import ConfirmAction from "./ConfirmAction";
import ProductForm from "./ProductForm";
import ProductPhoto from "./ProductPhoto";
import StateFilter from "./StateFilter";
import {
  errorMessage,
  loadProducts,
  removeProduct,
  setProductActive,
} from "../catalog.processes";
import { useCatalogStore } from "../catalog.store";

const ProductList = () => {
  const {
    products,
    pagination,
    filters,
    loading,
    error,
    setFilters,
    setPagination,
  } = useCatalogStore(
    useShallow((store) => ({
      products: store.products,
      pagination: store.pagination,
      filters: store.filters,
      loading: store.loading,
      error: store.error,
      setFilters: store.setFilters,
      setPagination: store.setPagination,
    })),
  );
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 250);
    return () => clearTimeout(timer);
  }, [pagination.page, pagination.size, filters.query, filters.state]);
  const activate = async (product) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setActionError("");
    try {
      await setProductActive(product, true);
      await loadProducts();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const runConfirm = async () => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setActionError("");
    try {
      if (confirm.kind === "delete") await removeProduct(confirm.product);
      else await setProductActive(confirm.product, false);
      await loadProducts();
      setConfirm(null);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const columns = [
    {
      id: "image",
      header: "Фото",
      cell: ({ row }) => (
        <ProductPhoto
          path={row.original.imagePath}
          alt={row.original.shortName}
        />
      ),
    },
    {
      accessorKey: "barcode",
      header: "Штрихкод",
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    },
    { accessorKey: "name", header: "Полное название" },
    { accessorKey: "category.name", header: "Категория" },
    { accessorKey: "shortName", header: "Короткое название" },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row: { original: product } }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Редактировать ${product.shortName}`}
            disabled={pending}
            onClick={() => setForm({ product })}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ActiveSwitch
            active={product.isActive}
            label={product.shortName}
            disabled={pending}
            onChange={(active) => {
              if (active) activate(product);
              else {
                setActionError("");
                setConfirm({ kind: "deactivate", product });
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Удалить ${product.shortName}`}
            disabled={pending}
            onClick={() => {
              setActionError("");
              setConfirm({ kind: "delete", product });
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Каталог товаров</h2>
        <Button onClick={() => setForm({ product: null })}>
          Добавить товар
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <Input
              className="min-w-60 flex-1"
              placeholder="Поиск по полному или короткому названию, категории, штрихкоду"
              value={filters.query}
              onChange={(event) => setFilters({ query: event.target.value })}
            />
            <StateFilter
              value={filters.state}
              onChange={(state) => setFilters({ state })}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Найдено товаров: {pagination.totalItems}
          </p>
        </CardHeader>
        <CardContent>
          {loading.list ? (
            <p>Загрузка…</p>
          ) : error.list ? (
            <p role="alert" className="text-destructive">
              {error.list}
              <Button variant="outline" onClick={loadProducts}>
                Повторить
              </Button>
            </p>
          ) : (
            <AppTable
              data={products}
              columns={columns}
              paginationRequest={pagination}
            />
          )}
          {actionError && !confirm && (
            <p role="alert" className="text-destructive">
              {actionError}
            </p>
          )}
          <CatalogPagination
            pagination={pagination}
            disabled={loading.list || pending}
            onChange={setPagination}
          />
        </CardContent>
      </Card>
      {form && (
        <ProductForm product={form.product} onClose={() => setForm(null)} />
      )}
      {confirm && (
        <ConfirmAction
          title={
            confirm.kind === "delete"
              ? "Удалить товар?"
              : "Сделать товар неактивным?"
          }
          description={
            confirm.kind === "delete"
              ? `Товар «${confirm.product.name}» будет удалён. Связанные с учётом товары удалить нельзя.`
              : `Товар «${confirm.product.name}» сохранится и будет доступен через фильтр «Неактивные».`
          }
          pending={pending}
          error={actionError}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </div>
  );
};
export default ProductList;
