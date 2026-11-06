/**
 * Form field wrapper. Supports an optional hint (block under the input
 * OR right-aligned with the label, for things like a char-count "80/80"),
 * a required asterisk, and arbitrary children (input/select/textarea).
 *
 *   <Field label="Name" required><input … /></Field>
 *   <Field label="Bio" hint="120/600" hintPosition="right"><textarea … /></Field>
 */

type HintPosition = "bottom" | "right";

export default function Field({
  label,
  hint,
  hintPosition = "bottom",
  required,
  children
}: {
  label: string;
  hint?: string;
  hintPosition?: HintPosition;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">
          {label} {required && <span className="text-hibiscus" aria-hidden>*</span>}
        </span>
        {hint && hintPosition === "right" && (
          <span className="text-[12px] text-ink-500">{hint}</span>
        )}
      </div>
      {children}
      {hint && hintPosition === "bottom" && (
        <span className="mt-1 block text-[12px] text-ink-500">{hint}</span>
      )}
    </label>
  );
}
