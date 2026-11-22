import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import categoryRoutes from './routes/categories';
import budgetRoutes from './routes/budgets';
import accountRoutes from './routes/accounts';
import incomeGoalRoutes from './routes/incomeGoals';
import reportRoutes from './routes/reports';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: env.FRONTEND_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
const apiPrefix = env.API_PREFIX;

app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/transactions`, transactionRoutes);
app.use(`${apiPrefix}/categories`, categoryRoutes);
app.use(`${apiPrefix}/budgets`, budgetRoutes);
app.use(`${apiPrefix}/accounts`, accountRoutes);
app.use(`${apiPrefix}/income-goals`, incomeGoalRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
🚀 Expense Tracker API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${env.NODE_ENV}
Port: ${PORT}
API Prefix: ${apiPrefix}
Frontend: ${env.FRONTEND_URL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;