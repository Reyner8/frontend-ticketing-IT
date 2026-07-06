const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TOKEN_KEY = 'ticketing_auth_token';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginatedMeta;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, auth = true, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers,
    body: requestBody,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload?.errors);
  }

  return payload as T;
}

export async function apiGet<T>(path: string, params?: RequestOptions['params']): Promise<T> {
  return apiRequest<T>(path, { method: 'GET', params });
}

export async function apiPost<T>(path: string, body?: unknown, auth = true): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body, auth });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}

export async function apiGetPaginated<T>(
  path: string,
  params?: RequestOptions['params']
): Promise<{ data: T; meta: PaginatedMeta }> {
  const response = await apiGet<ApiSuccessResponse<T>>(path, params);
  return {
    data: response.data,
    meta: response.meta ?? {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: Array.isArray(response.data) ? response.data.length : 0,
    },
  };
}
