import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import agentsRouter from './routes/agents.js';
import tasksRouter from './routes/tasks.js';
import { x402Payment, getPaymentInfo } from './middleware/x402.js';
import { contractService } from './services/ContractService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    x402Enabled: process.env.X402_ENABLED === 'true'
  });
});

// API Info
app.get('/', (req, res) => {
  res.json({
    name: 'AgentMarket API',
    version: '1.0.0',
    description: 'Marketplace de Agentes Autónomos con ERC-8004 y x402',
    endpoints: {
      agents: '/api/agents',
      tasks: '/api/tasks',
      x402: '/api/x402/info'
    }
  });
});

// x402 Payment Info
app.get('/api/x402/info', (req, res) => {
  const priceWei = req.query.price || '1000000000000000'; // Default 0.001 ETH
  res.json({
    success: true,
    paymentInfo: getPaymentInfo(priceWei)
  });
});

// Payment quote endpoint for frontend
app.post('/api/payment/quote', (req, res) => {
  const { ethAmount } = req.body;
  if (!ethAmount) {
    return res.status(400).json({ error: 'ethAmount is required' });
  }

  // Calculate USDC equivalent (using approximate ETH price)
  const ethValue = parseFloat(ethAmount);
  const ethPrice = 2500; // Approximate ETH price in USD
  const usdcAmount = ethValue * ethPrice;
  const fee = usdcAmount * 0.025; // 2.5% facilitator fee
  const total = usdcAmount + fee;

  res.json({
    ethAmount,
    usdcAmount: usdcAmount.toFixed(2),
    usdcRaw: Math.ceil(usdcAmount * 1e6),
    fee: fee.toFixed(2),
    total: total.toFixed(2),
    totalRaw: Math.ceil(total * 1e6),
    ethPrice,
    poweredBy: 'UltravioletaDAO'
  });
});

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/tasks', tasksRouter);

// Protected endpoint example with x402
app.post('/api/premium/execute',
  x402Payment('1000000000000000'), // 0.001 ETH
  async (req, res) => {
    const { description, agentType } = req.body;

    res.json({
      success: true,
      message: 'Premium execution started',
      payment: req.x402Payment,
      task: { description, agentType }
    });
  }
);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize and start
async function start() {
  try {
    // Initialize contract service
    await contractService.initialize();

    app.listen(PORT, () => {
      console.log(`🚀 AgentMarket Backend running on port ${PORT}`);
      console.log(`📝 API: http://localhost:${PORT}`);
      console.log(`💳 x402 Payments: ${process.env.X402_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
