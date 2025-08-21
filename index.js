// Teachmo backend API entry point
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint to verify API is running
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the Teachmo API' });
});

// Import and mount API routes
import assignmentsRouter from './assignments.js';
app.use('/api/assignments', assignmentsRouter);

// Start the server only if this file is executed directly
if (import.meta.main) {
  app.listen(PORT, () => {
    console.log(`Teachmo backend server running on port ${PORT}`);
  });
}

export default app;
