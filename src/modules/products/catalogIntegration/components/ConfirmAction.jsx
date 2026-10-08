import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const ConfirmAction = ({
  title,
  description,
  pending,
  error,
  onCancel,
  onConfirm,
}) => (
  <Dialog open onOpenChange={(open) => !open && !pending && onCancel()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onCancel}>
          Отмена
        </Button>
        <Button disabled={pending} onClick={onConfirm}>
          Подтвердить
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
export default ConfirmAction;
