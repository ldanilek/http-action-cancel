import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../convex/_generated/api";

const SITE_URL_OVERRIDE: string | undefined = undefined;

interface HttpEndpointTesterProps {
  endpoint: string;
  description: string;
}

type ErrorState = {
  phase: 'fetch' | 'streaming';
  message: string;
} | null;

function HttpEndpointTester({ endpoint, description }: HttpEndpointTesterProps) {
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const siteUrl = SITE_URL_OVERRIDE ?? useQuery(api.messages.siteUrl);
  const fullUrl = `${siteUrl}/${endpoint}`;

  async function handleTest() {
    // Cancel any existing request
    abortControllerRef.current?.abort();
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsInitialLoading(true);
    setIsStreaming(false);
    setResponse(null);
    setError(null);
    
    try {
      const response = await fetch(fullUrl, {
        signal: abortController.signal
      });
      setIsInitialLoading(false);
      setIsStreaming(true);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      let result = "";
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Convert the Uint8Array to a string
          const chunk = new TextDecoder().decode(value);
          result += chunk;
          setResponse(result);
        } catch (streamError) {
          if (streamError instanceof Error) {
            setError({
              phase: 'streaming',
              message: streamError.name === "AbortError" 
                ? "Streaming cancelled by user" 
                : "Streaming failed: " + streamError.message
            });
          }
          break;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setError({
          phase: 'fetch',
          message: error.name === "AbortError" 
            ? "Connection cancelled by user" 
            : "Connection failed: " + error.message
        });
      } else {
        setError({
          phase: 'fetch',
          message: "Connection failed with unknown error"
        });
      }
    } finally {
      setIsInitialLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  const isLoading = isInitialLoading || isStreaming;

  return (
    <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button 
            onClick={handleTest} 
            disabled={isLoading}
          >
            {isInitialLoading ? "Connecting..." : 
             isStreaming ? "Receiving..." : 
             "Fetch"}
          </button>
          {isLoading && (
            <>
              <button
                onClick={handleCancel}
                style={{
                  backgroundColor: "#ff6b6b",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Abort
              </button>
              {isStreaming && (
                <div style={{ 
                  width: "20px", 
                  height: "20px", 
                  border: "2px solid #ccc",
                  borderTopColor: "#666",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
              )}
            </>
          )}
        </div>
        <div style={{ 
          marginTop: "0.5rem", 
          color: "#666",
          fontSize: "0.9em"
        }}>
          <p>{fullUrl}</p>
          <p>{description}</p>
        </div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>

      <div style={{ 
        width: "50%",
        padding: "0.5rem", 
        backgroundColor: "#f5f5f5", 
        borderRadius: "4px",
        minHeight: "3rem",
        transition: "all 0.3s ease"
      }}>
        <div style={{ 
          backgroundColor: error 
            ? error.phase === 'fetch' ? "#ffe6e6" : "#fff0e6"
            : isStreaming ? "#e6ffe6" : "#f5f5f5",
          padding: "0.5rem",
          borderRadius: "4px",
          height: "100%",
          transition: "background-color 0.3s ease"
        }}>
          {error ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: error.phase === 'fetch' ? '#cc0000' : '#cc3300'
            }}>
              <span style={{ fontSize: '1.2em' }}>
                {error.phase === 'fetch' ? '🔌' : '📡'}
              </span>
              <span>{error.message}</span>
            </div>
          ) : (
            <div style={{ 
              color: response ? 'inherit' : '#666',
              fontStyle: response ? 'normal' : 'italic'
            }}>
              {response ? `Response: ${response}` : 'No response yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <h1>HTTP Action Test</h1>
      <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
        <HttpEndpointTester 
          endpoint="delayed"
          description="sleep(3) before returning response"
        />
        <HttpEndpointTester 
          endpoint="delayedBody"
          description="send first response chunk, then sleep(3), then send second chunk"
        />
        <HttpEndpointTester 
          endpoint="delayedCancel"
          description="sleep(3), return different response on abort"
        />
        <HttpEndpointTester 
          endpoint="throwError"
          description="endpoint throws error"
        />
        <HttpEndpointTester 
          endpoint="throwErrorBody"
          description="endpoint returns streamed body, then throws error"
        />
        <HttpEndpointTester 
          endpoint="streamAi"
          description="stream ai response (requires OPENAI_API_KEY)"
        />
      </div>
    </main>
  );
}
