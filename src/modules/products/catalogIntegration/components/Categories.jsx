import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import AppTable from "@/shared/AppTable";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import ActiveSwitch from "./ActiveSwitch";
import ConfirmAction from "./ConfirmAction";
import StateFilter from "./StateFilter";
import {
  errorMessage,
  refreshCategories,
  removeCategory,
  saveCategory,
  setCategoryActive,
} from "../catalog.processes";
import { useCatalogStore } from "../catalog.store";
import {
  categorySchema,
  findCategoryDuplicate,
  normalizeName,
} from "../helpers/catalog";

const CategoryForm = ({ category, onClose, onSaved }) => {
  const categories = useCatalogStore((state) => state.categories);
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
    },
  });
  const name = form.watch("name");
  const duplicate = findCategoryDuplicate(categories, name, category?.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const submit = async (values) => {
    if (lock.current || duplicate) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const saved = await saveCategory(category, {
        ...values,
        name: values.name.trim().replace(/\s+/g, " "),
      });
      onSaved(saved);
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Редактировать категорию" : "Добавить категорию"}
          </DialogTitle>
          <DialogDescription>
            Название обязательно, описание необязательно
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название *</FormLabel>
                  <FormControl>
                    <Input {...field} aria-invalid={!!duplicate} />
                  </FormControl>
                  <FormMessage />
                  {duplicate && (
                    <p role="alert" className="text-sm text-destructive">
                      Категория с таким названием уже существует
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onClose}
              >
                Отмена
              </Button>
              <Button disabled={pending || !!duplicate}>Сохранить</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
const Categories = () => {
  const categories = useCatalogStore((state) => state.categories);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("active");
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const filtered = useMemo(
    () =>
      categories.filter(
        (category) =>
          (state === "all" || category.isActive === (state === "active")) &&
          (!normalizeName(query) ||
            normalizeName(category.name).includes(normalizeName(query)) ||
            normalizeName(category.description).includes(normalizeName(query))),
      ),
    [categories, query, state],
  );
  const replace = (saved) =>
    useCatalogStore
      .getState()
      .setCategories(
        categories.some((category) => String(category.id) === String(saved.id))
          ? categories.map((category) =>
              String(category.id) === String(saved.id) ? saved : category,
            )
          : [...categories, saved],
      );
  const toggle = async (category, active) => {
    if (lock.current) return;
    lock.current = true;
    setPending(category.id);
    setError("");
    try {
      replace(await setCategoryActive(category, active));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      lock.current = false;
      setPending(null);
    }
  };
  const remove = async () => {
    if (lock.current) return;
    lock.current = true;
    setPending(deleting.id);
    setError("");
    try {
      await removeCategory(deleting);
      useCatalogStore
        .getState()
        .setCategories(
          categories.filter((category) => category.id !== deleting.id),
        );
      setDeleting(null);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      lock.current = false;
      setPending(null);
    }
  };
  const columns = [
    { accessorKey: "name", header: "Название" },
    {
      accessorKey: "description",
      header: "Описание",
      cell: ({ getValue }) => getValue() || "—",
    },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row: { original: category } }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Редактировать ${category.name}`}
            disabled={!!pending}
            onClick={() => setForm({ category })}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ActiveSwitch
            active={category.isActive}
            label={category.name}
            disabled={!!pending}
            onChange={(active) => toggle(category, active)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Удалить ${category.name}`}
            disabled={!!pending}
            onClick={() => {
              setError("");
              setDeleting(category);
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
        <h2 className="text-xl font-semibold">Категории</h2>
        <Button onClick={() => setForm({ category: null })}>
          Добавить категорию
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          className="min-w-60 flex-1"
          placeholder="Поиск по названию или описанию"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <StateFilter value={state} onChange={setState} />
        <Button
          variant="outline"
          onClick={() =>
            refreshCategories().catch((error) => setError(errorMessage(error)))
          }
        >
          Обновить
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Найдено категорий: {filtered.length} из {categories.length}
      </p>
      {error && !deleting && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <AppTable columns={columns} data={filtered} />
      {form && (
        <CategoryForm
          category={form.category}
          onClose={() => setForm(null)}
          onSaved={replace}
        />
      )}
      {deleting && (
        <ConfirmAction
          title="Удалить категорию?"
          description={`Категория «${deleting.name}» будет удалена. Категорию с товарами удалить нельзя.`}
          pending={!!pending}
          error={error}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
};
export default Categories;
