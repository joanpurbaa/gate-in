import React from "react";

interface StepItem {
  title: string;
  desc: React.ReactNode;
}

interface NumberedStepsProps {
  steps: StepItem[];
}

export function NumberedSteps({ steps }: NumberedStepsProps) {
  return (
    <ol className="my-5 space-y-4">
      {steps.map((step, idx) => (
        <li key={idx} className="flex items-start gap-3.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gate text-xs font-bold text-white shadow-2xs">
            {idx + 1}
          </span>
          <div className="flex-1 pt-0.5">
            <h4 className="font-display text-sm font-bold text-ink">{step.title}</h4>
            <div className="mt-1 text-xs leading-relaxed text-muted">{step.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
