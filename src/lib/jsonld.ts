/**
 * Safely serialize a value into a JSON-LD `<script>` block.
 *
 * Vanilla `JSON.stringify` can leak the `</script>` sequence if a
 * user-controlled string contains it, breaking out of the script
 * context and executing arbitrary JS — a classic stored-XSS vector
 * since event titles / bios / comments are attacker-influenced.
 *
 * The standard mitigation: escape `<`, `>`, `&`, and U+2028/U+2029
 * line-separator codepoints so the serialized output is safe to embed
 * inside `<script type="application/ld+json">…</script>`. U+2028/29
 * are JSON-valid but JavaScript-invalid inside string literals, so
 * browsers that eval embedded JSON as JS choke without the escape.
 *
 * The RegExp constructor is used for U+2028/29 so the source file
 * itself stays pure ASCII — grep / diff / editors with lazy Unicode
 * handling won't mangle it.
 */

const U2028 = new RegExp(" ", "g");
const U2029 = new RegExp(" ", "g");

export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(U2028, "\\u2028")
    .replace(U2029, "\\u2029");
}
