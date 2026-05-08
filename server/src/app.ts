import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import propertiesRouter from './routes/properties';
import unitsRouter from './routes/units';
import projectsRouter from './routes/projects';
import lineItemsRouter from './routes/lineItems';
import invoicesRouter from './routes/invoices';
import contractorsRouter from './routes/contractors';
import permitsRouter from './routes/permits';
import loanDrawsRouter from './routes/loanDraws';
import equityRouter from './routes/equity';
import cashRouter from './routes/cash';
import yardiRouter from './routes/yardi';
import notificationsRouter from './routes/notifications';
import auditRouter from './routes/audit';
import benchmarksRouter from './routes/benchmarks';
import authRouter from './routes/auth';
import usersRouter from './routes/users';

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/properties', propertiesRouter);
app.use('/api/v1/units', unitsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/line-items', lineItemsRouter);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/contractors', contractorsRouter);
app.use('/api/v1/permits', permitsRouter);
app.use('/api/v1/loan-draws', loanDrawsRouter);
app.use('/api/v1/equity', equityRouter);
app.use('/api/v1/cash', cashRouter);
app.use('/api/v1/yardi', yardiRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/benchmarks', benchmarksRouter);

app.use(errorHandler);

export default app;
