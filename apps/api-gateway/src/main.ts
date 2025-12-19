import express, { Request } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import proxy from 'express-http-proxy';
import { AuthenticatedRequest } from '@hakika/shared-types';

const app = express();

app.use(cors(
  {
    origin: 'http://localhost:4200',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }
));

app.use(morgan('dev'));

app.use(express.json(
  { limit: '100mb' }
));

app.use(express.urlencoded(
  { 
    extended: true,
    limit: '100mb', 
  }
  
));

app.use(cookieParser());

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user ? 1000 : 100;
  },
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown-ip';
  },
});

app.use(limiter);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});

app.use('/', proxy('http://localhost:6001')); // Auth Service

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
