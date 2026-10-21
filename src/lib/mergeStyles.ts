// 同时保留公共类名和组件类名，让公共样式与本地覆盖一起生效。
export function mergeStyles(
  shared: Record<string, string>,
  local: Record<string, string>,
) {
  return Object.fromEntries(
    [...new Set([...Object.keys(shared), ...Object.keys(local)])].map((key) => [
      key,
      [shared[key], local[key]].filter(Boolean).join(" "),
    ]),
  );
}
