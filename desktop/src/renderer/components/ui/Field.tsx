import { createContext, forwardRef, useContext, useId } from "react";
import { cx } from "./cx";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

interface FieldCtx {
  id?: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldCtx>({ invalid: false });

export function Field({ label, hint, error, required, htmlFor, children, className }: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const messageId = `${id}-msg`;
  const hasMessage = Boolean(error || hint);

  return (
    <FieldContext.Provider value={{ id, describedBy: hasMessage ? messageId : undefined, invalid: Boolean(error) }}>
      <div className={cx("flex flex-col gap-1.5", className)}>
        {label && (
          <label htmlFor={id} className="text-label text-text-2">
            {label}
            {required && <span className="text-danger"> *</span>}
          </label>
        )}
        {children}
        {error ? (
          <span id={messageId} role="alert" className="text-caption text-danger">
            {error}
          </span>
        ) : (
          hint && (
            <span id={messageId} className="text-caption text-text-3">
              {hint}
            </span>
          )
        )}
      </div>
    </FieldContext.Provider>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body text-text outline-none transition-colors duration-[var(--dur-fast)] placeholder:text-text-3 focus:border-[var(--accent-border)] disabled:opacity-50 aria-[invalid=true]:border-danger-border";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, id, ...rest }, ref) {
    const ctx = useContext(FieldContext);
    return (
      <input
        ref={ref}
        id={id ?? ctx.id}
        aria-invalid={ctx.invalid || undefined}
        aria-describedby={ctx.describedBy}
        className={cx(inputBase, className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, id, ...rest }, ref) {
  const ctx = useContext(FieldContext);
  return (
    <textarea
      ref={ref}
      id={id ?? ctx.id}
      aria-invalid={ctx.invalid || undefined}
      aria-describedby={ctx.describedBy}
      className={cx(inputBase, "resize-none", className)}
      {...rest}
    />
  );
});
