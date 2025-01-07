import { Check } from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentType, ReactNode } from 'react'

enum StepStatus {
  Past = 'past',
  Current = 'current',
  Future = 'future',
}

export type SteppedWalkthroughProps = {
  // Optional title of the walkthrough.
  title?: string
  // Optional description of the walkthrough.
  description?: string
  // Steps in the walkthrough.
  steps: {
    // Label for the step to display next to the step index.
    label: string
    // Optional content for the step. If not passed, only the label will be
    // displayed. The status refers to whether the step is in the past, is the
    // current step, or is a future step.
    content?: (status: `${StepStatus}`) => ReactNode
    // If passed, will override the default icon for the step.
    OverrideIcon?: ComponentType<{ className: string }>
    // Optional class names for the icon and its container.
    iconContainerClassName?: string
    iconClassName?: string
    // Optional statuses to override the default statuses to show the content
    // for.
    overrideShowStepContentStatuses?: `${StepStatus}`[]
  }[]
  // Index of the current step.
  stepIndex: number
  // Determines what step statuses the content should be shown for. Defaults to
  // only current.
  showStepContentStatuses?: `${StepStatus}`[]
  // Optional container class name.
  className?: string
  // Optional text class name, for the step number and step label.
  textClassName?: string
}

export const SteppedWalkthrough = ({
  title,
  description,
  steps,
  stepIndex,
  showStepContentStatuses = [StepStatus.Current],
  className,
  textClassName = 'link-text',
}: SteppedWalkthroughProps) => (
  <div className={className}>
    {(title || description) && (
      <div className="space-y-1 border-b border-border-secondary p-6">
        {title && <p className="title-text text-text-body">{title}</p>}

        {description && (
          <p className="secondary-text text-text-body">{description}</p>
        )}
      </div>
    )}

    <div className="flex flex-row items-stretch">
      <div className="w-8 border-r-4 border-border-primary"></div>
      <div className="flex grow flex-col py-4">
        {steps.map((step, index) => {
          const past = stepIndex > index
          const current = stepIndex === index
          const future = stepIndex < index
          const status = past
            ? StepStatus.Past
            : current
              ? StepStatus.Current
              : StepStatus.Future

          const stepContent = (
            step.overrideShowStepContentStatuses ?? showStepContentStatuses
          ).includes(status)
            ? step.content?.(status)
            : undefined

          const Icon = step.OverrideIcon ?? Check

          return (
            <div
              key={index}
              // Offset by half width of circle and half width of border, so
              // the orb is centered on the line (w-6 is 1.5rem, so half is
              // 0.75rem).
              className="relative left-[calc(-0.75rem-2px)] flex flex-col gap-2 py-3"
            >
              <div className="flex flex-row items-center gap-3">
                <div
                  className={clsx(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    ((current && stepIndex > 1) || future) &&
                      'bg-background-base'
                  )}
                >
                  <div
                    className={clsx(
                      'rounded-full',
                      {
                        'h-3 w-3': current || future,
                        'bg-icon-brand': current,
                        'bg-icon-interactive-disabled': future,
                        'flex h-4 w-4 items-center justify-center bg-background-button':
                          past,
                      },
                      step.iconContainerClassName
                    )}
                  >
                    {past && (
                      <Icon
                        className={clsx(
                          '!h-3 !w-3 text-background-base',
                          step.iconClassName
                        )}
                      />
                    )}
                  </div>
                </div>

                <p
                  className={clsx(
                    'w-4 font-mono',
                    {
                      'text-icon-primary': past,
                      'text-text-interactive-active': current,
                      'text-text-interactive-disabled': future,
                    },
                    textClassName
                  )}
                >
                  {index + 1}.
                </p>

                <p
                  className={clsx(
                    {
                      'text-text-primary': past,
                      'text-text-interactive-active': current,
                      'text-text-interactive-disabled': future,
                    },
                    textClassName
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* Orb is w-6, gap is w-3, step number is w-4, gap is w-3 */}
              {!!stepContent && <div className="py-2 pl-16">{stepContent}</div>}
            </div>
          )
        })}
      </div>
    </div>
  </div>
)
