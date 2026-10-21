// 浏览器统一请求入口。身份凭据由 HttpOnly Cookie 自动携带，不读取 token。
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(body?.error ?? "请求失败，请稍后重试", response.status);
  if (body === null) throw new ApiError("服务器返回了无效数据", 502);
  return body as T;
}
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  return readResponse<T>(response);
}
