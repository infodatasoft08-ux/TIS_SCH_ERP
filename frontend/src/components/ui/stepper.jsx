import { cn } from "@/lib/utils";

export function Stepper({ currentStep, steps }) {
  return (
    <div className="flex justify-center mb-1">
      <div className="flex items-center gap-12">
        {steps.map((label, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const completed = step < currentStep;

          return (
            <div key={label} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                  active || completed
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground"
                )}
              >
                {step}
              </div>

              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>

              {index !== steps.length - 1 && (
                <div className="w-20 h-px bg-border" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}