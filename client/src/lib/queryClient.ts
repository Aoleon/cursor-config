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
    // CORRECTION CRITIQUE : Supporter query keys hiérarchiques complètement
    // Query keys format : [baseUrl] ou [baseUrl, ...pathSegments] ou [baseUrl, params]
    const [baseUrl, ...additionalSegments] = queryKey;
    let url = baseUrl as string;
    
    // Gérer les segments additionnels du path (ex: ['/api/chatbot/history', conversationId])
    if (additionalSegments.length > 0) {
      const lastSegment = additionalSegments[additionalSegments.length - 1];
      
      // Si le dernier segment est un objet, c'est des query params
      if (lastSegment && typeof lastSegment === 'object' && !Array.isArray(lastSegment)) {
        // Segments du path (tous sauf le dernier qui est params)
        const pathSegments = additionalSegments.slice(0, -1);
        if (pathSegments.length > 0) {
          url += '/' + pathSegments.join('/');
        }
        
        // Query parameters (dernier segment)
        const params = lastSegment;
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      } else {
        // Tous les segments sont des parties du path
        url += '/' + additionalSegments.join('/');
      }
    }
    
    const res = await fetch(url, {
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
  // CORRECTION CRITIQUE : Supporter query keys hiérarchiques complètement
  // Query keys format : [baseUrl] ou [baseUrl, ...pathSegments] ou [baseUrl, params]
  const [baseUrl, ...additionalSegments] = queryKey;
  let url = baseUrl as string;
  
  // Gérer les segments additionnels du path (ex: ['/api/chatbot/history', conversationId])
  if (additionalSegments.length > 0) {
    const lastSegment = additionalSegments[additionalSegments.length - 1];
    
    // Si le dernier segment est un objet, c'est des query params
    if (lastSegment && typeof lastSegment === 'object' && !Array.isArray(lastSegment)) {
      // Segments du path (tous sauf le dernier qui est params)
      const pathSegments = additionalSegments.slice(0, -1);
      if (pathSegments.length > 0) {
        url += '/' + pathSegments.join('/');
      }
      
      // Query parameters (dernier segment)
      const params = lastSegment;
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    } else {
      // Tous les segments sont des parties du path
      url += '/' + additionalSegments.join('/');
    }
  }
  
  const res = await fetch(url, {
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
