import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const CatalogPagination = ({ pagination, disabled, onChange }) => {
  const totalPages = Math.max(1, pagination.totalPages);
  const from = pagination.totalItems
    ? (pagination.page - 1) * pagination.size + 1
    : 0;
  const to = Math.min(pagination.page * pagination.size, pagination.totalItems);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span>Показывать по</span>
        <Select
          value={String(pagination.size)}
          disabled={disabled}
          onValueChange={(value) => onChange({ size: Number(value), page: 1 })}
        >
          <SelectTrigger aria-label="Размер страницы" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span>
          {from}–{to} из {pagination.totalItems}
        </span>
        <Button
          variant="outline"
          disabled={disabled || pagination.page <= 1}
          onClick={() => onChange({ page: pagination.page - 1 })}
        >
          Назад
        </Button>
        <span>
          Стр. {pagination.page} из {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={disabled || pagination.page >= totalPages}
          onClick={() => onChange({ page: pagination.page + 1 })}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
};
export default CatalogPagination;
