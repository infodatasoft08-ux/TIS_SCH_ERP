import { cn } from "@/lib/utils";

export function Stepper({ currentStep, steps, lightBackground = false }) {
  return (
    <div className="flex justify-center w-full">
      <div className="flex items-center justify-between gap-2 sm:gap-6 max-w-md w-full">
        {steps.map((label, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const completed = step < currentStep;

          return (
            <div key={label} className="flex items-center gap-2 flex-1 justify-center">
              <div
                className={cn(
                  "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border text-xs sm:text-sm font-bold shrink-0 transition-all",
                  lightBackground
                    ? (active || completed ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-gray-100 text-gray-400 border-gray-300")
                    : (active || completed ? "bg-white text-indigo-700 border-white shadow-md scale-105" : "bg-white/20 text-white/80 border-white/30")
                )}
              >
                {step}
              </div>

              <span
                className={cn(
                  "text-xs sm:text-sm font-extrabold whitespace-nowrap transition-colors",
                  lightBackground
                    ? (active ? "text-gray-900 dark:text-white" : "text-gray-400")
                    : (active ? "text-white" : "text-white/70")
                )}
              >
                {label}
              </span>

              {index !== steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 min-w-[20px] max-w-[50px] mx-1 rounded-full",
                  lightBackground
                    ? (completed ? "bg-indigo-600" : "bg-gray-200")
                    : (completed ? "bg-white" : "bg-white/30")
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}