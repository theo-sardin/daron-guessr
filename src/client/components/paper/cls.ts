/**
 * `relative` unless the caller's classes already position the element (absolute, fixed,
 * sticky, static): two position utilities on one element resolve in stylesheet order, not in
 * class order, so a component must not add its own when the caller sets one.
 */
export const rel = (className?: string): string | null => (/(^|\s)!?(absolute|fixed|sticky|static|relative)(\s|$)/.test(className ?? '') ? null : 'relative');
