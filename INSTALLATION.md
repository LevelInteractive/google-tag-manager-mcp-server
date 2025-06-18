# Nginx and systemd Setup Guide

This guide provides a streamlined setup for running the MCP server in a production environment using Nginx as a reverse proxy and `systemd` to manage the server process.

## 1. Prerequisites

-   **Node.js** (v18.x or later)
-   **Nginx** installed on your server.
-   **A domain name** pointing to your server's IP.

## 2. Application Setup

1.  **Clone & Install:**
    ```bash
    git clone https://github.com/your-repo/google-tag-manager-mcp-server-public-http.git
    cd google-tag-manager-mcp-server-public-http
    npm install
    ```

2.  **Build the application:**
    ```bash
    npm run build
    ```
    This compiles the TypeScript code into JavaScript, typically in a `dist` folder.

3.  **(Optional) Create `.env` file:** If your application requires environment variables (e.g., `PORT`), create a `.env` file in the project root.
    ```
    PORT=3000
    ```

## 3. Systemd Service Setup

Using `systemd` ensures your Node.js server runs as a background service and restarts automatically.

1.  **Create a service file:**
    ```bash
    sudo nano /etc/systemd/system/gtm-mcp-server.service
    ```

2.  **Add the following content.**
    Update `User`, `Group`, `WorkingDirectory`, and `EnvironmentFile` with your specific paths and user details.

    ```ini
    [Unit]
    Description=GTM MCP Server
    After=network.target

    [Service]
    User=www-data
    Group=www-data
    Type=simple
    WorkingDirectory=/var/www/gtm-mcp-server
    ExecStart=/usr/bin/node dist/index.js
    Restart=on-failure

    # Set the port directly. Alternatively, use EnvironmentFile=
    Environment="PORT=9231"

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Enable and start the service:**
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable gtm-mcp-server.service
    sudo systemctl start gtm-mcp-server.service
    ```

4.  **Check the status:**
    ```bash
    sudo systemctl status gtm-mcp-server.service
    ```

## 4. Nginx Reverse Proxy Setup

This configuration proxies requests to your Node.js application and correctly handles Server-Sent Events (SSE).

1.  **Create an Nginx configuration file:**
    Replace `your-domain.com` with your actual domain.
    ```bash
    sudo nano /etc/nginx/sites-available/your-domain.com
    ```

2.  **Add the server block.** This example includes SSL setup with Let's Encrypt certificates.

    ```nginx
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Config (update with your cert paths)
        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # Return 404 for all other requests
        location / {
            return 404;
        }

        # The 'secure-hash' can be any secret path component.
        # The trailing slash on location and proxy_pass is important
        # as it strips '/secure-hash/mcp' and forwards only '/mcp'
        # to the backend service.
        location /secure-hash/mcp/ {
            proxy_pass http://127.0.0.1:9231/mcp/; # Match the port in your service file

            # --- Headers for SSE ---
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # --- SSE Streaming Specifics ---
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 12h; # Keep connection open
        }
    }
    ```

3.  **Enable the site and restart Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

Your server should now be accessible via `https://your-domain.com/mcp`. 