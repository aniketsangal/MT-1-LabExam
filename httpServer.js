/**
 * Part A: HTTP Module and Server Creation
 * ---------------------------------------
 * Uses only Node's built-in `http` and `fs` modules (no Express).
 * Runs on port 3000.
 */

// ---- A1: Import built-in modules ----
import http from 'http';   // used to create the web server
import fs from 'fs';       // used to read the static file public/info.html
import path from 'path';   // used to build file paths safely
import { fileURLToPath } from 'url'; // needed to get __dirname in ES modules

const PORT = 3000;

// ES modules do not have __dirname, so we create it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fields that every vehicle sent to POST /add-vehicle must contain
const REQUIRED_FIELDS = ['id', 'vehicleName', 'vehicleNumber', 'type', 'price'];

// In-memory "database": an array of vehicle objects (no real database used)
const vehicles = [
  { id: 1, vehicleName: 'Hyundai Creta', vehicleNumber: 'HR26AB1234', type: 'SUV', price: 1500000 },
  { id: 2, vehicleName: 'Honda City', vehicleNumber: 'DL3CAB4567', type: 'Sedan', price: 1200000 },
  { id: 3, vehicleName: 'Tata Nexon', vehicleNumber: 'UP14CD9876', type: 'SUV', price: 1100000 }
];

// ---- Helper functions to send responses with the correct Content-Type ----

// Sends a JSON response with the given status code
const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2)); // null, 2 = pretty-print
};

// Sends an HTML response with the given status code
const sendHtml = (res, statusCode, html) => {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
};

// ---- A3: POST /add-vehicle ----
const handleAddVehicle = (req, res) => {
  let body = '';

  // The request body arrives in chunks; collect them into one string
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  // When all chunks have arrived, process the body
  req.on('end', () => {
    let vehicle;

    // Step 1: body must be valid JSON, otherwise respond 400
    try {
      vehicle = JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    // Step 2: body must be a JSON object (not an array, number, null, ...)
    if (vehicle === null || typeof vehicle !== 'object' || Array.isArray(vehicle)) {
      return sendJson(res, 400, { error: 'Request body must be a JSON object' });
    }

    // Step 3: check that all required fields are present
    const missing = REQUIRED_FIELDS.filter(
      (field) => vehicle[field] === undefined || vehicle[field] === null || vehicle[field] === ''
    );
    if (missing.length > 0) {
      return sendJson(res, 400, { error: 'Missing required fields', missingFields: missing });
    }

    // Step 4: do not allow two vehicles with the same id
    if (vehicles.some((v) => v.id === vehicle.id)) {
      return sendJson(res, 409, { error: `Vehicle with id ${vehicle.id} already exists` });
    }

    // Step 5: keep only the known fields, add to the array, send success message
    const newVehicle = {
      id: vehicle.id,
      vehicleName: vehicle.vehicleName,
      vehicleNumber: vehicle.vehicleNumber,
      type: vehicle.type,
      price: vehicle.price
    };
    vehicles.push(newVehicle);
    sendJson(res, 201, { message: 'Vehicle added successfully', vehicle: newVehicle });
  });

  // If reading the request fails, tell the client
  req.on('error', () => sendJson(res, 400, { error: 'Error reading request body' }));
};

// ---- A4: Static file serving using fs.readFile() ----
const serveInfoPage = (res) => {
  const filePath = path.join(__dirname, 'public', 'info.html');

  fs.readFile(filePath, (err, content) => {
    // If the file is missing or unreadable, respond with status 500
    if (err) {
      return sendJson(res, 500, { error: 'Internal Server Error: unable to read info.html' });
    }
    // Otherwise send the file content as HTML
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
};

// ---- A1: Create the HTTP server (this function runs for every request) ----
const server = http.createServer((req, res) => {
  const { method } = req;

  // Get only the path part of the URL (ignore ?query=string)
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  // ---- A2: Routing ----

  // Home page: welcome page in HTML
  if (pathname === '/' && method === 'GET') {
    return sendHtml(
      res,
      200,
      `<html><head><title>Vehicle Management</title></head>
       <body style="font-family: Arial, sans-serif; text-align:center; margin-top:60px;">
         <h1>Welcome to the Vehicle Management Application</h1>
         <p>Built with the Node.js HTTP module.</p>
         <p><a href="/vehicles">Vehicles</a> | <a href="/about">About</a> | <a href="/info">Info</a></p>
       </body></html>`
    );
  }

  // GET /vehicles: list of all vehicles as JSON
  if (pathname === '/vehicles' && method === 'GET') {
    return sendJson(res, 200, vehicles);
  }

  // POST /add-vehicle: add a new vehicle
  if (pathname === '/add-vehicle' && method === 'POST') {
    return handleAddVehicle(req, res);
  }

  // /about: application information
  if (pathname === '/about' && method === 'GET') {
    return sendJson(res, 200, {
      application: 'Vehicle Management Web Application',
      version: '1.0.0',
      description: 'Maintains vehicle records using the Node.js HTTP module with in-memory storage.',
      technologies: ['Node.js', 'HTTP Module', 'FS Module']
    });
  }

  // /info: static file served using the fs module
  if (pathname === '/info' && method === 'GET') {
    return serveInfoPage(res);
  }

  // Route exists but the HTTP method is wrong -> 405 Method Not Allowed
  if (['/', '/vehicles', '/about', '/info', '/add-vehicle'].includes(pathname)) {
    return sendJson(res, 405, { error: `Method ${method} not allowed on ${pathname}` });
  }

  // ---- A5: Any other route -> 404 Not Found ----
  sendJson(res, 404, { error: 'Route not found' });
});

// Start listening and print a message when the server starts
server.listen(PORT, () => {
  console.log(`HTTP Server running at http://localhost:${PORT}`);
});
