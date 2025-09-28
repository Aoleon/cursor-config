import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// CORRECTIF SÉCURITÉ: Fetcher non-authentifié pour routes publiques
export const getPublicQueryFn: QueryFunction<any> = async ({ queryKey }) => {
  const res = await fetch(queryKey.join("/") as string, {
    // CORRECTIF CRITIQUE: Pas de credentials pour routes publiques
    credentials: "omit",
  });

  // Gestion d'erreur appropriée pour routes publiques
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw { 
      status: res.status,
      message: `${res.status}: ${text}`,
      name: res.status === 404 ? 'NotFoundError' : 
            res.status === 401 ? 'UnauthorizedError' :
            res.status === 403 ? 'ForbiddenError' : 'Error'
    };
  }
  
  return await res.json();
};

// CORRECTIF SÉCURITÉ: API Request non-authentifié pour upload fournisseur
export async function apiRequestPublic(
  method: string,
  url: string,
  data?: unknown | FormData,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    // CORRECTIF CRITIQUE: Pas de credentials pour routes publiques
    credentials: "omit",
  });

  await throwIfResNotOk(res);
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
