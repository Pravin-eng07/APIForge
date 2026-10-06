import { useCallback, useEffect, useState } from "react";
import "./App.css";

function App() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("");
  const [requestBody, setRequestBody] = useState("");

  const [response, setResponse] = useState(null);
  const [status, setStatus] = useState(null);
  const [responseTime, setResponseTime] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem("apiForgeHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    localStorage.setItem(
      "apiForgeHistory",
      JSON.stringify(history)
    );
  }, [history]);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter an API URL.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);
    setStatus(null);
    setResponseTime(null);
    setCopied(false);

    const startTime = performance.now();

    try {
      let parsedHeaders = {};

      if (headers.trim()) {
        parsedHeaders = JSON.parse(headers);
      }

      const options = {
        method: method,
        headers: parsedHeaders,
      };

      if (
        method !== "GET" &&
        method !== "DELETE" &&
        requestBody.trim()
      ) {
        JSON.parse(requestBody);
        options.body = requestBody;
      }

      const result = await fetch(url, options);

      const endTime = performance.now();
      const time = Math.round(endTime - startTime);

      setStatus(result.status);
      setResponseTime(time);

      const contentType = result.headers.get("content-type");

      let data;

      if (
        contentType &&
        contentType.includes("application/json")
      ) {
        data = await result.json();
      } else {
        data = await result.text();
      }

      setResponse(data);

      const historyItem = {
        id: Date.now(),
        method: method,
        url: url,
        headers: headers,
        requestBody: requestBody,
        status: result.status,
        responseTime: time,
        timestamp: new Date().toLocaleString(),
      };

      setHistory((previousHistory) => [
        historyItem,
        ...previousHistory,
      ]);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError(
          "Invalid JSON in headers or request body."
        );
      } else {
        setError(
          "Unable to fetch the API. Check the URL or CORS settings."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [url, headers, requestBody, method]);

  // Global Ctrl + Enter shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        sendRequest();
      }
    };

    window.addEventListener(
      "keydown",
      handleGlobalKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleGlobalKeyDown
      );
    };
  }, [url, headers, requestBody, method, sendRequest]);

  const copyResponse = async () => {
    if (!response) return;

    const textToCopy =
      typeof response === "string"
        ? response
        : JSON.stringify(response, null, 2);

    await navigator.clipboard.writeText(textToCopy);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const formatJson = (value, setter) => {
    if (!value.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(value);

      setter(JSON.stringify(parsed, null, 2));

      setError("");
    } catch {
      setError(
        "Invalid JSON. Please check your JSON format."
      );
    }
  };

  const loadHistoryRequest = (item) => {
    setMethod(item.method);
    setUrl(item.url);
    setHeaders(item.headers || "");
    setRequestBody(item.requestBody || "");

    setResponse(null);
    setStatus(null);
    setResponseTime(null);
    setError("");
    setCopied(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("apiForgeHistory");
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>APIForge</h1>
          <p>Test APIs. Inspect Responses. Track Requests.</p>
        </div>
      </header>

      <main className="main-container">
        <div className="workspace">

          {/* REQUEST PANEL */}
          <section className="request-panel">
            <h2>Request</h2>

            <div className="request-bar">
              <div
                className={`method-badge ${method.toLowerCase()}`}
              >
                {method}
              </div>

              <select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value)
                }
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>

              <input
                type="text"
                value={url}
                onChange={(e) =>
                  setUrl(e.target.value)
                }
                placeholder="Enter API URL..."
              />

              <button
                onClick={sendRequest}
                disabled={loading}
              >
                {loading
                  ? "Sending..."
                  : "Send Request"}
              </button>
            </div>

            {/* HEADERS */}
            <div className="input-section">
              <h3>Headers</h3>

              <button
                type="button"
                className="format-button"
                onClick={() =>
                  formatJson(
                    headers,
                    setHeaders
                  )
                }
              >
                Format JSON
              </button>

              <textarea
                value={headers}
                onChange={(e) =>
                  setHeaders(e.target.value)
                }
                placeholder='Example: {"Content-Type": "application/json"}'
              />
            </div>

            {/* REQUEST BODY */}
            <div className="input-section">
              <h3>Request Body</h3>

              <button
                type="button"
                className="format-button"
                onClick={() =>
                  formatJson(
                    requestBody,
                    setRequestBody
                  )
                }
              >
                Format JSON
              </button>

              <textarea
                value={requestBody}
                onChange={(e) =>
                  setRequestBody(e.target.value)
                }
                placeholder='Example: {"name": "Om", "role": "Developer"}'
              />
            </div>

            <p className="keyboard-hint">
              Press <strong>Ctrl + Enter</strong> to send request
            </p>
          </section>

          {/* RESPONSE PANEL */}
          <section className="response-panel">
            <div className="response-header">
              <h2>Response</h2>

              <div className="response-actions">
                <div className="response-info">
                  <span
                    className={`status-badge ${
                      status === null
                        ? ""
                        : status >= 200 && status < 300
                        ? "status-success"
                        : "status-error"
                    }`}
                  >
                    Status: {status ?? "—"}
                  </span>

                  <span
                    className={`time-badge ${
                      responseTime !== null
                        ? "time-active"
                        : ""
                    }`}
                  >
                    Time:{" "}
                    {responseTime !== null
                      ? `${responseTime} ms`
                      : "—"}
                  </span>
                </div>

                <button
                  className="copy-button"
                  onClick={copyResponse}
                  disabled={!response}
                >
                  {copied
                    ? "Copied!"
                    : "Copy Response"}
                </button>
              </div>
            </div>

            <div className="response-body">
              {error ? (
                <p className="error-message">
                  {error}
                </p>
              ) : response ? (
                <pre>
                  {typeof response === "string"
                    ? response
                    : JSON.stringify(
                        response,
                        null,
                        2
                      )}
                </pre>
              ) : (
                <p>
                  Response will appear here...
                </p>
              )}
            </div>
          </section>
        </div>

        {/* HISTORY */}
        <section className="history-panel">
          <div className="history-header">
            <h2>Request History</h2>

            <button
              className="clear-history-button"
              onClick={clearHistory}
              disabled={history.length === 0}
            >
              Clear History
            </button>
          </div>

          {history.length === 0 ? (
            <p className="empty-history">
              No requests yet. Your API requests
              will appear here.
            </p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div
                  className="history-item"
                  key={item.id}
                  onClick={() =>
                    loadHistoryRequest(item)
                  }
                  title="Click to load this request"
                >
                  <span className="history-method">
                    {item.method}
                  </span>

                  <span className="history-url">
                    {item.url}
                  </span>

                  <span>
                    Status: {item.status}
                  </span>

                  <span>
                    {item.responseTime} ms
                  </span>

                  <span>
                    {item.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;