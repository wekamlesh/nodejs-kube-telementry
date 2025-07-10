const express = require("express");
const client = require("prom-client");

// --- App and Environment Setup ---
const app = express();
const port = 3000;

// Read pod and node name from environment variables passed by the Downward API
const podName = process.env.POD_NAME || "Unknown Pod";
const nodeName = process.env.NODE_NAME || "Unknown Node";

// --- Prometheus Metrics Setup (Same as before) ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.path,
  });
  res.on("finish", () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
    end();
  });
  next();
});

// --- Application Routes ---

// Main route now serves a styled HTML page
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>K8s Info App</title>
        <style>
            body { 
                background-color: #2c3e50; 
                color: #ecf0f1; 
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                text-align: center;
            }
            .container { 
                background-color: #34495e;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
            .info { margin: 15px 0; font-size: 1.2em; }
            .label { font-weight: bold; color: #95a5a6; }
            .value { color: #2ecc71; margin-left: 10px; }
            h1 { color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }
            footer { margin-top: 30px; font-size: 0.8em; color: #95a5a6; }
            a { color: #3498db; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Kubernetes App Info</h1>
            <div class="info">
                <span class="label">Serving from Pod:</span>
                <span class="value">${podName}</span>
            </div>
            <div class="info">
                <span class="label">Running on Node:</span>
                <span class="value">${nodeName}</span>
            </div>
            <footer>
                <p>Try other endpoints: <a href="/fast">/fast</a>, <a href="/slow">/slow</a>, <a href="/error">/error</a>, <a href="/metrics">/metrics</a></p>
            </footer>
        </div>
    </body>
    </html>
  `);
});

app.get("/fast", (req, res) => {
  res.status(200).send("This was fast!");
});

app.get("/slow", (req, res) => {
  const delay = Math.random() * 1500 + 500;
  setTimeout(() => {
    res.status(200).send(`This was slow! (delayed by ${delay.toFixed(2)}ms)`);
  }, delay);
});

app.get("/error", (req, res) => {
  res.status(500).send("Oops! Something went wrong.");
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
