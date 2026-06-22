import { TIMELINE_STEPS } from "../config";

type Props = {
  currentStep: number;
};

export function OrderTimeline({ currentStep }: Props) {
  return (
    <div className="space-y-4">
      {TIMELINE_STEPS.map((label, index) => {
        const completed = index <= currentStep;

        return (
          <div key={label} className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm
                ${completed ? "bg-green-600 text-white" : "bg-stone-200"}`}
            >
              {completed ? "✓" : ""}
            </div>

            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
