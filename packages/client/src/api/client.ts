const BASE_URL = "/api/v1";

async function request<T>(
  path: string,
  options?: RequestInit & { hasBody?: boolean }
): Promise<T> {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  if (options?.hasBody) headers["Content-Type"] = "application/json";

  const { hasBody, ...fetchOpts } = options ?? {};
  void hasBody;

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      hasBody: body !== undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      hasBody: body !== undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
