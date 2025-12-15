import {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
    ReactNode,
    useCallback,
} from "react";

interface WebSocketMessage {
    type: string;
    data?: any;
    [key: string]: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketContextType {
    lastMessage: WebSocketMessage | null;
    sendMessage: (message: any) => void;
    subscribe: (handler: MessageHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(
        null
    );
    const [ws, setWs] = useState<WebSocket | null>(null);
    const subscribersRef = useRef<Set<MessageHandler>>(new Set());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const socketRef = useRef<WebSocket | null>(null);
    const isUnmountedRef = useRef(false);
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000;

    useEffect(() => {
        isUnmountedRef.current = false;

        let wsUrl: string;
        const externalApiUrl = import.meta.env.VITE_API_URL;

        if (externalApiUrl) {
            wsUrl = externalApiUrl.replace(/^https?/, "wss") + "/ws";
        } else {
            const protocol =
                window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.host || "localhost:5000";
            wsUrl = `${protocol}//${host}/ws`;
        }

        const connect = () => {
            if (isUnmountedRef.current) return;

            try {
                console.log("[WebSocket] Connecting to:", wsUrl);
                const websocket = new WebSocket(wsUrl);
                socketRef.current = websocket;

                websocket.onopen = () => {
                    if (isUnmountedRef.current) {
                        websocket.close();
                        return;
                    }
                    console.log("[WebSocket] Connected successfully");
                    reconnectAttemptsRef.current = 0;
                };

                websocket.onmessage = (event) => {
                    if (isUnmountedRef.current) return;

                    try {
                        const data = JSON.parse(event.data);
                        console.log(
                            "[WebSocket] Message received:",
                            data.type,
                            data
                        );
                        setLastMessage(data);

                        subscribersRef.current.forEach((handler) => {
                            try {
                                handler(data);
                            } catch (error) {
                                console.error(
                                    "Error in WebSocket message handler:",
                                    error
                                );
                            }
                        });
                    } catch (error) {
                        console.error(
                            "Failed to parse WebSocket message:",
                            error
                        );
                    }
                };

                websocket.onerror = (error) => {
                    console.error("[WebSocket] Error:", error);
                };

                websocket.onclose = (event) => {
                    console.log("[WebSocket] Disconnected, code:", event.code);
                    socketRef.current = null;

                    if (isUnmountedRef.current) return;

                    setWs(null);

                    // Attempt to reconnect with exponential backoff
                    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                        const delay = Math.min(
                            baseReconnectDelay *
                                Math.pow(2, reconnectAttemptsRef.current),
                            30000
                        );
                        console.log(
                            `[WebSocket] Reconnecting in ${delay}ms (attempt ${
                                reconnectAttemptsRef.current + 1
                            }/${maxReconnectAttempts})`
                        );
                        reconnectTimeoutRef.current = setTimeout(() => {
                            reconnectAttemptsRef.current++;
                            connect();
                        }, delay);
                    } else {
                        console.log(
                            "[WebSocket] Max reconnect attempts reached"
                        );
                    }
                };

                setWs(websocket);
            } catch (error) {
                console.error(
                    "[WebSocket] Failed to create connection:",
                    error
                );
            }
        };

        connect();

        return () => {
            isUnmountedRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, []);

    const sendMessage = useCallback(
        (message: any) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        },
        [ws]
    );

    const subscribe = useCallback((handler: MessageHandler) => {
        subscribersRef.current.add(handler);

        return () => {
            subscribersRef.current.delete(handler);
        };
    }, []);

    return (
        <WebSocketContext.Provider
            value={{ lastMessage, sendMessage, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket(handler?: MessageHandler) {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }

    useEffect(() => {
        if (handler) {
            return context.subscribe(handler);
        }
    }, [handler, context]);

    return context;
}
