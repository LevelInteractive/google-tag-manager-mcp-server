# MCP Server for Google Tag Manager

This is a MCP server that provides an interface to the Google Tag Manager API via an HTTP/SSE interface.

## Prerequisites

- Node.js (v16 or higher)
- A Google Cloud Platform project with the Google Tag Manager API enabled.
- Authentication credentials for the Google Tag Manager API.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/stape-io/google-tag-manager-mcp-server.git
    cd google-tag-manager-mcp-server/old
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    Create a `.env` file in the `old` directory and add the necessary configuration. You can use one of the following authentication methods:

    **a) Service Account (File Path):**
    ```
    GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/service-account-key.json
    ```

    **b) Service Account (JSON content):**
    ```
    GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", ...}'
    ```

    **c) OAuth 2.0:**
    ```
    CLIENT_ID=your-client-id
    CLIENT_SECRET=your-client-secret
    REFRESH_TOKEN=your-refresh-token
    ```

## Running the Server

-   **Development:** To start the server in development mode with auto-reloading:
    ```bash
    npm run dev
    ```
    The server will be available at `http://localhost:3000`.

-   **Production:** To build the server for production:
    ```bash
    npm run build
    ```
    This will compile the TypeScript files into the `dist` directory. You can then run the server with `node dist/index.js`.

## API Endpoints

The server exposes the following endpoints:

-   `GET /sse`: Establishes a Server-Sent Events (SSE) connection for the MCP transport.
-   `POST /sse/message`: The endpoint where the client sends messages to the server over the established SSE connection.
-   `GET /health`: A health check endpoint that returns the server's status.
