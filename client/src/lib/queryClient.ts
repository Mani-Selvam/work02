import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API base URL - uses environment variable for external server, otherwise relative path

export const API_BASE_URL =
    import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export function getApiUrl(path: string): string {
    if (path.startsWith("http")) return path;
    return `${API_BASE_URL}${path}`;
}

async function throwIfResNotOk(res: Response) {
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;

        if (res.status === 401) {
            try {
                const errorData = JSON.parse(text);
                if (errorData.code === "USER_INACTIVE") {
                    localStorage.clear();
                    window.location.href = "/Worklogix";
                    throw new Error(
                        "Your account has been disabled. You have been logged out."
                    );
                }
            } catch (parseError) {}
        }

        throw new Error(`${res.status}: ${text}`);
    }
}

export async function apiRequest(
    url: string,
    method: string,
    data?: unknown | undefined
): Promise<Response> {
    const user = localStorage.getItem("user");
    const userId = user ? JSON.parse(user).id : null;

    const headers: Record<string, string> = {};
    if (data) {
        headers["Content-Type"] = "application/json";
    }
    if (userId) {
        headers["x-user-id"] = userId.toString();
    }

    const res = await fetch(getApiUrl(url), {
        method,
        headers,
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
        const user = localStorage.getItem("user");
        const userId = user ? JSON.parse(user).id : null;

        const headers: Record<string, string> = {};
        if (userId) {
            headers["x-user-id"] = userId.toString();
        }

        const url = getApiUrl(queryKey.join("/") as string);
        const res = await fetch(url, {
            credentials: "include",
            headers,
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
            return null;
        }

        await throwIfResNotOk(res);
        return await res.json();
    };

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
