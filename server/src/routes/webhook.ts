import express, { type Request } from 'express';
import { Buffer } from 'node:buffer';

import { handlePaddleWebhook } from '@/controllers/billing';

const webhookRouter = express.Router();

const rawBodyMiddleware = [
  // Use */* to be resilient to content-type variations like application/json; charset variants
  express.raw({ type: '*/*' }),
  (req: Request, _res: express.Response, next: express.NextFunction) => {
    // express.raw stores the raw Buffer at req.body; controller expects req.rawBody
    (req as Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
    next();
  },
];

// Main billing webhook endpoint (Paddle)
webhookRouter.post('/api/billing/webhook', ...rawBodyMiddleware, handlePaddleWebhook);

// Dedicated Paddle webhook endpoint
webhookRouter.post('/api/billing/paddle/webhook', ...rawBodyMiddleware, handlePaddleWebhook);

export default webhookRouter;
