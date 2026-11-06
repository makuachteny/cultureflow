"use client";

/**
 * AutoSubmitSelect — a <select> that submits its parent <form> when the user
 * picks an option. Keeps the filter/sort interactions one-click while still
 * working without JS (falls back to `form submit button` — but we always
 * pair this with a hidden submit button when used server-side).
 *
 * Used by the /browse page's inline filter pills and the Sort dropdown.
 */
export default function AutoSubmitSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.submit();
      }}
    />
  );
}
