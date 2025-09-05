/**
 * 사용하기 쉬운 request 함수
 * host를 고정하지 않고 상대 경로나 전체 URL 모두 지원
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface RequestResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

/**
 * 간단한 HTTP 요청 함수
 * @param url - 요청할 URL (상대경로 또는 절대경로)
 * @param options - 요청 옵션
 */
export async function request<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<RequestResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 10000,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    let data;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      data,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      console.error(`[Request Error] ${url}:`, error.message);
      throw error;
    }

    throw new Error(`Unknown error occurred while requesting ${url}`);
  }
}

// 편의 메서드들
export const get = <T = any>(url: string, options?: Omit<RequestOptions, 'method'>) =>
  request<T>(url, { ...options, method: 'GET' });

export const post = <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(url, { ...options, method: 'POST', body });

export const put = <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(url, { ...options, method: 'PUT', body });

export const del = <T = any>(url: string, options?: Omit<RequestOptions, 'method'>) =>
  request<T>(url, { ...options, method: 'DELETE' });