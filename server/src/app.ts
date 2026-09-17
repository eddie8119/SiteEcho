import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

// 細微的 Node.js 執行順序問題：dotenv.config() 必須在 routes / appleIapVerification 之前執行，
// 否則它們讀到的 process.env 會是 undefined。
import routes from '@/routes/index';
import webhookRouter from '@/routes/webhook';
import { getAppleIapVerificationService } from '@/services/appleIapVerification';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());

// IMPORTANT: Billing webhook must be registered with express.raw BEFORE any JSON/body parsers
app.use(webhookRouter);

// Regular parsers for the rest of the app
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Main routes (includes /api/billing for non-webhook endpoints)
app.use(routes);

async function startServer() {
  // Eagerly initialize Apple JWS verifier to catch certificate/config issues at startup
  if (process.env.APPLE_IAP_VERIFY_ENABLED === 'true') {
    try {
      const verificationService = getAppleIapVerificationService();
      await verificationService.initialize();
      console.log('[AppleIAP] Verifier eager initialization completed');
    } catch (error) {
      console.error('[AppleIAP] Verifier eager initialization failed:', error);
    }
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();

// 順序觀念
// 它會立刻去載入 routes/index.ts
// routes/index.ts 又會去 import 你的 invoiceController。
// invoiceController 接著 import 你的 supabase 客戶端。
// 在 lib/supabase.ts 中，createClient(...) 這行程式碼被立即執行。此時，它嘗試讀取 process.env.SUPABASE_ANON_KEY。
// 然而，因為這一切都發生在 import 階段，app.ts 中第 6 行的 dotenv.config() 根本還沒有機會執行！
// 結果就是 createClient 拿到的是 undefined，於是它默默地降級成使用匿名金鑰。
