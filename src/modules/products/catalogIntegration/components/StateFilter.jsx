import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const StateFilter = ({ value, onChange }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-40" aria-label="Состояние">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="active">Активные</SelectItem>
      <SelectItem value="inactive">Неактивные</SelectItem>
      <SelectItem value="all">Все</SelectItem>
    </SelectContent>
  </Select>
);
export default StateFilter;
