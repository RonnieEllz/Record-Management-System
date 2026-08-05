import React from 'react';
import { Check, Circle } from 'lucide-react';
import type { JobCard } from '../lib/jobCards';

interface TimelineStep {
  status: JobCard['status'];
  label: string;
  description?: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'RECEIVED', label: 'Received', description: 'Package received' },
  { status: 'IN_PROGRESS', label: 'In Progress', description: 'Technician working' },
  { status: 'WAITING_FOR_COLLECTION', label: 'Ready for Collection', description: 'Waiting for pickup' },
  { status: 'COLLECTED', label: 'Collected', description: 'Package collected' },
];

interface JobTimelineProps {
  currentStatus: JobCard['status'];
  createdAt: string;
  updatedAt?: string;
}

export const JobTimeline: React.FC<JobTimelineProps> = ({ currentStatus, createdAt, updatedAt }) => {
  const currentStepIndex = TIMELINE_STEPS.findIndex((step) => step.status === currentStatus);

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase text-slate-400 mb-4">Job Progression</div>
      
      <div className="space-y-4">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <div key={step.status} className="flex gap-4 min-w-0">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : isCurrent
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                        : 'bg-slate-900/40 border-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                </div>

                {/* Connecting line */}
                {index < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-12 mt-2 transition-colors ${
                      isCompleted ? 'bg-emerald-500/40' : 'bg-slate-700/40'
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="pt-1 pb-4 flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold transition-colors break-words ${
                    isCompleted
                      ? 'text-emerald-400'
                      : isCurrent
                        ? 'text-indigo-400'
                        : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-slate-500 mt-1 break-words">{step.description}</div>
                )}
                {isCurrent && updatedAt && (
                  <div className="text-xs text-slate-400 mt-2 break-words">
                    Last updated: {new Date(updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline metadata */}
      <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Created:</span>
          <span className="text-slate-300">{new Date(createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
