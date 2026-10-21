import { useState, useEffect } from "react";
// 所有页面遵循同一个请求过程：加载 → 成功 / 失败。离开页面时取消旧请求。
export function useRequest<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  version = 0,
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    void loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: error instanceof Error ? error : new Error("请求失败"),
          }));
      });
    return () => controller.abort();
  }, [loader, version]);
  return {
    ...state,
    setData: (update: (data: T) => T) =>
      setState((previous) =>
        previous.data ? { ...previous, data: update(previous.data) } : previous,
      ),
  };
}
