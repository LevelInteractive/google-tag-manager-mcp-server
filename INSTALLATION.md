# Installation

This document provides instructions on how to install and run the Google Tag Manager MCP Server in a production environment using nginx as a reverse proxy and systemd to manage the service.

**Note:** This guide assumes you are deploying to a Linux server. `systemd` is not available on Windows.

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm
*   nginx
*   A Linux server

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/stape-io/google-tag-manager-mcp-server.git
    cd google-tag-manager-mcp-server
    ```

2.  Install dependencies:
    ```bash
    npm install --omit=dev
    ```

3.  Build the application:
    ```bash
    npm run build
    ```

## Running the Application

You can run the application directly using Node.js:

```bash
node dist/index.js
```

By default, the application runs on port 3000. You can change the port by setting the `PORT` environment variable:

```bash
PORT=4000 node dist/index.js
```

## Configuring Nginx

1.  Create a new nginx configuration file. The name does not matter, but something like `gtm-mcp.conf` is recommended. Place it in `/etc/nginx/sites-available/`.

    ```bash
    sudo nano /etc/nginx/sites-available/gtm-mcp.conf
    ```

2.  Add the following content to the file. **Remember to replace `your_domain.com` with your actual domain or server IP address.** The default port is 3000. If you have configured the application to run on a different port, you must update the `proxy_pass` directive.

    ```nginx
    server {
        listen 80;
        server_name your_domain.com;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # For SSE
        location /sse {
            proxy_pass http://127.0.0.1:3000/sse;
            proxy_set_header Connection '';
            proxy_http_version 1.1;
            chunked_transfer_encoding off;
            proxy_buffering off;
            proxy_cache off;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
    ```

3.  Enable the new configuration by creating a symbolic link to it in the `sites-enabled` directory:

    ```bash
    sudo ln -s /etc/nginx/sites-available/gtm-mcp.conf /etc/nginx/sites-enabled/
    ```

4.  Test the nginx configuration for syntax errors:

    ```bash
    sudo nginx -t
    ```

5.  If the test is successful, restart nginx to apply the changes:

    ```bash
    sudo systemctl restart nginx
    ```

## Configuring systemd

1.  Create a new systemd service file:

    ```bash
    sudo nano /etc/systemd/system/gtm-mcp.service
    ```

2.  Add the following content to the file. **Remember to replace `/path/to/your/google-tag-manager-mcp-server-public` with the actual path to the project's root directory.** You can also customize the `User` and `Group` if needed.

    ```systemd
    [Unit]
    Description=Google Tag Manager MCP Server
    After=network.target

    [Service]
    # You can customize the user, group, and working directory.
    # User=your-user
    # Group=your-group

    # The port can be controlled by setting the PORT environment variable.
    # See the "Controlling the Port" section below.
    EnvironmentFile=-/etc/default/gtm-mcp

    # The working directory should be the root of the project.
    WorkingDirectory=/path/to/your/google-tag-manager-mcp-server-public

    # The command to start the application.
    # Make sure to replace /usr/bin/node with the actual path to node if it's different.
    ExecStart=/usr/bin/node dist/index.js

    # Restart the service if it fails.
    Restart=on-failure

    [Install]
    WantedBy=multi-user.target
    ```

3.  Reload the systemd daemon to recognize the new service:

    ```bash
    sudo systemctl daemon-reload
    ```

4.  Enable the service to start on boot:

    ```bash
    sudo systemctl enable gtm-mcp.service
    ```

5.  Start the service:

    ```bash
    sudo systemctl start gtm-mcp.service
    ```

6.  You can check the status of the service using:
    ```bash
    sudo systemctl status gtm-mcp.service
    ```

## Controlling the Port

The application port can be controlled via the `PORT` environment variable. When using the systemd service, you can set this variable in an environment file.

1.  Create a file at `/etc/default/gtm-mcp`:

    ```bash
    sudo nano /etc/default/gtm-mcp
    ```

2.  Add the `PORT` variable to this file. For example, to run the application on port 4000:

    ```
    PORT=4000
    ```

3.  Restart the systemd service to apply the new port:

    ```bash
    sudo systemctl restart gtm-mcp.service
    ```

4.  **Important:** If you change the port, remember to also update the `proxy_pass` directive in your nginx configuration to match the new port. 