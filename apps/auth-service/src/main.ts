import express from 'express';
import cors from 'cors';
import { errorMiddleware } from '@hakika/shared-utils';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { authRoutes } from '@hakika/auth-api';
import swaggerDocument from './config/swagger-output.json' with { type: "json" };



const app = express();

// CORS configuration
app.use(cors(
  {
    origin: 'http://localhost:4200',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }
));

// Body Parser & Cookie Parser
app.use(express.json());
app.use(cookieParser());

// Health Check Endpoint
app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

// Swagger Documentation Endpoint
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerDocument);
});

// Routes
app.use('/api/auth', authRoutes);

// Error Handling Middleware
app.use(errorMiddleware);

const port = process.env.PORT || 6001;;

// Server Initialization
const server = app.listen(port, () => {
  console.log(`Auth service listening at http://localhost:${port}/api`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
});
server.on('error', console.error);
