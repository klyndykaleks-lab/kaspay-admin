import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

import {
  checkProductDuplicates,
  errorMessage,
  loadImage,
  loadProducts,
  saveProduct,
} from "../catalog.processes";
import { useCatalogStore } from "../catalog.store";
import {
  photoAction,
  productDefaults,
  productSchema,
  validatePhoto,
} from "../helpers/catalog";

const TextField = ({ form, name, label, type = "text", multiline = false }) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          {multiline ? (
            <Textarea {...field} />
          ) : (
            <Input
              {...field}
              type={type}
              step={type === "number" ? "any" : undefined}
            />
          )}
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);
const Choice = ({ form, name, label, options, optional = false }) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select
          value={field.value || "__none__"}
          onValueChange={(value) =>
            field.onChange(value === "__none__" ? "" : value)
          }
        >
          <FormControl>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите значение" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {optional && <SelectItem value="__none__">Не указана</SelectItem>}
            {options.map((item) => (
              <SelectItem key={item.value} value={String(item.value)}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

// Mounted only while open: every cancel discards the complete draft, including photo changes.
const ProductForm = ({ product, onClose }) => {
  const { categories, countries } = useCatalogStore();
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: productDefaults(product),
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  const alive = useRef(true);
  const urls = useRef(new Set());
  const savingRef = useRef(false);
  const createKey = useRef({ signature: "", key: crypto.randomUUID() });
  const photoChanged = useRef(false);
  const [duplicates, setDuplicates] = useState({
    barcodeDuplicate: null,
    nameDuplicate: null,
  });
  const barcode = form.watch("barcode");
  const name = form.watch("name");
  useEffect(() => {
    let cancelled = false;
    setDuplicates({ barcodeDuplicate: null, nameDuplicate: null });
    const timer = setTimeout(
      () =>
        checkProductDuplicates(barcode, name, product?.id)
          .then((result) => {
            if (!cancelled) setDuplicates(result);
          })
          .catch(() => {}),
      300,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [barcode, name, product?.id]);
  const uploadRef = useRef(null);
  useEffect(() => {
    alive.current = true;
    if (product?.imagePath)
      loadImage(product.imagePath)
        .then((url) => {
          if (!alive.current) {
            URL.revokeObjectURL(url);
            return;
          }
          urls.current.add(url);
          // Do not overwrite a replacement/removal made while the old image was loading.
          if (!photoChanged.current) setPreview(url);
        })
        .catch(() => {});
    const resources = urls.current;
    return () => {
      alive.current = false;
      request.current++;
      resources.forEach((url) => URL.revokeObjectURL(url));
      resources.clear();
    };
  }, [product?.imagePath]);
  const upload = async (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    const token = ++request.current;
    setPhotoPending(true);
    setPhotoError("");
    try {
      const url = await validatePhoto(selected);
      if (!alive.current || request.current !== token) {
        URL.revokeObjectURL(url);
        return;
      }
      urls.current.add(url);
      photoChanged.current = true;
      setFile(selected);
      setPreview(url);
      setRemoved(false);
    } catch (error) {
      if (alive.current && request.current === token)
        setPhotoError(error.message);
    } finally {
      if (alive.current && request.current === token) setPhotoPending(false);
    }
  };
  const removePhoto = () => {
    request.current++;
    photoChanged.current = true;
    setFile(null);
    setPreview(null);
    setRemoved(true);
    setPhotoError("");
  };
  const submit = async (values) => {
    if (
      savingRef.current ||
      photoPending ||
      photoError ||
      duplicates.barcodeDuplicate
    )
      return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const action = photoAction(file, removed);
      const signature = JSON.stringify({
        values,
        action,
        photoRequest: request.current,
      });
      if (createKey.current.signature !== signature)
        createKey.current = { signature, key: crypto.randomUUID() };
      await saveProduct(
        product?.id,
        values,
        file,
        action,
        product?.version,
        createKey.current.key,
      );
      await loadProducts();
      onClose();
    } catch (error) {
      setSaveError(errorMessage(error));
      const field = error?.response?.data?.field;
      if (field && field in values)
        form.setError(field, { message: errorMessage(error) });
    } finally {
      savingRef.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const categoryOptions = categories
    .filter(
      (category) =>
        category.isActive ||
        String(category.id) === String(product?.category?.id),
    )
    .map((category) => ({
      value: category.id,
      label: `${category.name}${category.isActive ? "" : " (неактивна)"}`,
    }));
  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.code === "BLR" ? "Беларусь" : country.name,
  }));
  if (!countryOptions.some((country) => country.value === "BLR"))
    countryOptions.push({ value: "BLR", label: "Беларусь" });
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {product ? "Редактировать товар" : "Добавить товар"}
          </DialogTitle>
          <DialogDescription>Поля со знаком * обязательны</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <TextField
              form={form}
              name="name"
              label="Полное название (как в накладной) *"
            />
            {duplicates.nameDuplicate && (
              <p className="text-sm text-muted-foreground">
                Товар с таким полным названием уже существует
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                form={form}
                name="shortName"
                label="Короткое название (на терминале) *"
              />
              <TextField form={form} name="barcode" label="Штрихкод *" />
            </div>
            {duplicates.barcodeDuplicate && (
              <p role="alert" className="text-sm text-destructive">
                Штрихкод уже используется: {duplicates.barcodeDuplicate.name}
              </p>
            )}
            <Choice
              form={form}
              name="categoryId"
              label="Категория *"
              options={categoryOptions}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                form={form}
                name="weight"
                label="Вес (г)"
                type="number"
              />
              <Choice
                form={form}
                name="unit"
                label="Единица учёта"
                options={[
                  { value: "pcs", label: "ШТ" },
                  { value: "ml", label: "МЛ" },
                  { value: "gr", label: "ГР" },
                ]}
              />
            </div>
            <Choice
              form={form}
              name="countryCode"
              label="Страна"
              options={countryOptions}
              optional
            />
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                ["calories", "Калории (ккал на 100 г)"],
                ["proteins", "Белки (г на 100 г)"],
                ["fat", "Жиры (г на 100 г)"],
                ["carbohydrates", "Углеводы (г на 100 г)"],
              ].map(([key, label]) => (
                <TextField
                  key={key}
                  form={form}
                  name={`macronutrients.${key}`}
                  label={label}
                  type="number"
                />
              ))}
            </div>
            <TextField
              form={form}
              name="ingredients"
              label="Состав"
              multiline
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Изображение товара</p>
              <Input
                ref={uploadRef}
                type="file"
                aria-label="Изображение товара"
                accept=".jpeg,.jpg,.png"
                disabled={saving || photoPending}
                onChange={upload}
              />
              {photoPending && <p>Проверка изображения…</p>}
              {photoError && (
                <div role="alert" className="text-destructive">
                  {photoError}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPhotoError("")}
                  >
                    Отменить загрузку
                  </Button>
                </div>
              )}
              {preview && (
                <div className="flex items-end gap-3">
                  <img
                    src={preview}
                    alt="Предпросмотр"
                    className="h-32 w-32 rounded object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || photoPending}
                    onClick={removePhoto}
                  >
                    Удалить фото
                  </Button>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                <p>Максимальный размер загружаемого файла: 1 MB</p>
                <p>Максимальное разрешение: 150 × 150 пикселей</p>
                <p>Допустимые форматы: jpeg, jpg, png</p>
              </div>
            </div>
            {saveError && (
              <p role="alert" className="text-destructive">
                {saveError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={onClose}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  photoPending ||
                  !!photoError ||
                  !!duplicates.barcodeDuplicate
                }
              >
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ProductForm;
