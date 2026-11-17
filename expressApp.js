/**
 * Part B: Vehicle Management REST API using Express.js
 * ----------------------------------------------------
 * Implements full CRUD (Create, Read, Update, Delete) on vehicles.
 * Runs on port 4000.
 */

// ---- B1: Import Express and create the application ----
import express from 'express';

const PORT = 4000;
const app = express();

// Middleware: parse incoming JSON request bodies into req.body
app.use(express.json());

// In-memory "database": array with three sample vehicles (no real database used)
let vehicles = [
  { id: 1, vehicleName: 'Hyundai Creta', vehicleNumber: 'HR26AB1234', type: 'SUV', price: 1500000 },
  { id: 2, vehicleName: 'Honda City', vehicleNumber: 'DL3CAB4567', type: 'Sedan', price: 1200000 },
  { id: 3, vehicleName: 'Tata Nexon', vehicleNumber: 'UP14CD9876', type: 'SUV', price: 1100000 }
];

// ---- Validation helpers ----

// True if a value is undefined, null or an empty string
const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

// True only for real numbers greater than 0 (a string like "500" is rejected)
const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

// Checks vehicle fields. Returns an error message, or null if everything is valid.
const validateVehicle = (data) => {
  const missing = ['vehicleName', 'vehicleNumber', 'type', 'price'].filter((f) => isBlank(data[f]));
  if (missing.length > 0) return `Missing required fields: ${missing.join(', ')}`;
  if (!isPositiveNumber(data.price)) return 'Price must be a positive number';
  return null;
};

// ---- B2: CRUD endpoints ----

// READ ALL - GET /vehicles
app.get('/vehicles', (req, res) => {
  res.json(vehicles);
});

// READ ONE - GET /vehicles/:id  (:id is a route parameter)
app.get('/vehicles/:id', (req, res) => {
  const id = Number(req.params.id); // route params are strings, so convert
  const vehicle = vehicles.find((v) => v.id === id);

  // Vehicle not found -> 404
  if (!vehicle) return res.status(404).json({ error: `Vehicle with id ${req.params.id} not found` });

  res.json(vehicle);
});

// CREATE - POST /vehicles
app.post('/vehicles', (req, res) => {
  const data = req.body || {};

  // Validate required fields and price -> 400 on failure
  const error = validateVehicle(data);
  if (error) return res.status(400).json({ error });

  // Use the id sent by the client, or generate the next free one
  const id = isBlank(data.id) ? Math.max(0, ...vehicles.map((v) => v.id)) + 1 : Number(data.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  // Prevent duplicate ids
  if (vehicles.some((v) => v.id === id)) {
    return res.status(409).json({ error: `Vehicle with id ${id} already exists` });
  }

  const vehicle = {
    id,
    vehicleName: data.vehicleName,
    vehicleNumber: data.vehicleNumber,
    type: data.type,
    price: data.price
  };
  vehicles.push(vehicle);

  // 201 = Created
  res.status(201).json({ message: 'Vehicle added successfully', vehicle });
});

// UPDATE - PUT /vehicles/:id
app.put('/vehicles/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = vehicles.findIndex((v) => v.id === id);

  // Vehicle not found -> 404
  if (index === -1) return res.status(404).json({ error: `Vehicle with id ${req.params.id} not found` });

  // Validate the new data -> 400 on failure
  const data = req.body || {};
  const error = validateVehicle(data);
  if (error) return res.status(400).json({ error });

  // Replace the old record; the id itself is never changed
  vehicles[index] = {
    id,
    vehicleName: data.vehicleName,
    vehicleNumber: data.vehicleNumber,
    type: data.type,
    price: data.price
  };
  res.json({ message: 'Vehicle updated successfully', vehicle: vehicles[index] });
});

// DELETE - DELETE /vehicles/:id
app.delete('/vehicles/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = vehicles.findIndex((v) => v.id === id);

  // Vehicle not found -> 404
  if (index === -1) return res.status(404).json({ error: `Vehicle with id ${req.params.id} not found` });

  // Remove it from the array and return the deleted record
  const [deleted] = vehicles.splice(index, 1);
  res.json({ message: 'Vehicle deleted successfully', vehicle: deleted });
});

// ---- Error handling ----

// Any route not defined above -> 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error-handling middleware (must have 4 parameters)
app.use((err, req, res, next) => {
  // express.json() throws this error when the body is not valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Express Server running at http://localhost:${PORT}`);
});
