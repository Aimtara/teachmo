import React, { useCallback, useEffect, useMemo, useState } from 'react';

export type OnboardingStep = {
  id: string;
  title?: string;
  /**
   * A step runner. May be synchronous or async; errors are captured and surfaced.
   */
  run: () => Promise<void> | void;
};

type OnboardingManagerProps = {
  steps: OnboardingStep[];
  autoStart?: boolean;
  stopOnError?: boolean;
  onComplete?: () => void;
  onError?: (error: unknown, step: OnboardingStep) => void;
};

type RunState = 'idle' | 'running' | 'complete' | 'error';

export default function OnboardingManager({
  steps,
  autoStart = true,
  stopOnError = true,
  onComplete,
  onError,
}: OnboardingManagerProps) {
  const [state, setState] = useState<RunState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [failure, setFailure] = useState<{ step: OnboardingStep; error: unknown } | null>(null);

  const totalSteps = useMemo(() => steps.length || 1, [steps.length]);

  const executeStep = useCallback(
    async (step: OnboardingStep, index: number) => {
      setCurrentStep(step);
      try {
        await Promise.resolve(step.run());
        setProgress((index + 1) / totalSteps);
        return true;
      } catch (error) {
        setFailure({ step, error });
        onError?.(error, step);
        return false;
      }
    },
    [onError, totalSteps],
  );

  const runSteps = useCallback(async () => {
    if (!steps.length) {
      setState('complete');
      onComplete?.();
      return;
    }

    setState('running');
    setFailure(null);
    setProgress(0);

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const success = await executeStep(step, index);
      if (!success && stopOnError) {
        setState('error');
        return;
      }
    }

    setState('complete');
    onComplete?.();
  }, [executeStep, onComplete, steps, stopOnError]);

  useEffect(() => {
    if (autoStart) runSteps();
  }, [autoStart, runSteps]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
        <span>Onboarding</span>
        <span>
          {Math.round(progress * 100)}% • {state === 'running' && currentStep ? currentStep.title ?? currentStep.id : state}
        </span>
      </div>
      <div className="mb-3 h-2 rounded bg-gray-100">
        <div className="h-2 rounded bg-sky-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {failure ? (
        <p className="text-sm text-red-600" role="alert">
          {failure.step.title ?? failure.step.id}: {(failure.error as Error)?.message ?? 'An unexpected error occurred.'}
        </p>
      ) : null}
      {state === 'idle' ? (
        <button
          className="mt-2 rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white"
          onClick={runSteps}
          type="button"
        >
          Start onboarding
        </button>
      ) : null}
    </div>
  );
}
