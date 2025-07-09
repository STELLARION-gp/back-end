// index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import userRoutes from "./routes/user.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use("/api/user", userRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    console.log(`📁 Static files served from /uploads`);
});
