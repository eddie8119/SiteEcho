import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';

const paddleApiKey = process.env.PADDLE_API_KEY;
const paddleEnvironment =
  process.env.PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production;

if (!paddleApiKey) {
  console.warn('[Paddle] PADDLE_API_KEY is not set. Paddle billing features remain disabled.');
}

export const paddleClient = paddleApiKey
  ? new Paddle(paddleApiKey, {
      environment: paddleEnvironment,
      logLevel: LogLevel.warn,
    })
  : null;
