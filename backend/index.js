/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import assignmentsRouter from './routes/assignments.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/assignments', assignmentsRouter);

// Root endpoint to verify API is running
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the Teachmo API' });
});
// Start the server
app.listen(PORT, () => {
  console.log(`Teachmo backend server running on port ${PORT}`);
});
