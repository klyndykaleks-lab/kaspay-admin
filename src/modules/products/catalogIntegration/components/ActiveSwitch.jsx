const ActiveSwitch = ({ active, disabled, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    aria-label={`${label}: ${active ? "Активен" : "Неактивен"}`}
    disabled={disabled}
    onClick={() => onChange(!active)}
    className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${active ? "bg-primary" : "bg-muted-foreground"}`}
  >
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-background transition-transform ${active ? "translate-x-5" : "translate-x-0"}`}
    />
  </button>
);
export default ActiveSwitch;
