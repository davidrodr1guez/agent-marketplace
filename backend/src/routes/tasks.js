import { Router } from 'express';
import { contractService, AgentType, TaskStatus } from '../services/ContractService.js';
import { orchestrator } from '../services/Orchestrator.js';
import { processGaslessPayment, verifyAuthorization, getPaymentQuote } from '../services/X402Facilitator.js';

const router = Router();

// In-memory task store for gasless tasks (use database in production)
const gaslessTasks = new Map();

/**
 * GET /tasks - Lista tareas (filtrable por requester)
 */
router.get('/', async (req, res) => {
  try {
    const { requester } = req.query;

    if (requester) {
      const tasks = await contractService.getRequesterTasks(requester);
      return res.json({
        success: true,
        count: tasks.length,
        tasks
      });
    }

    // Without filter, return recent tasks count
    const totalTasks = await contractService.taskManager?.totalTasks() || 0;

    res.json({
      success: true,
      totalTasks: Number(totalTasks),
      message: 'Use ?requester=0x... to filter by requester'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tasks/statuses - Lista estados posibles de tareas
 */
router.get('/statuses', (req, res) => {
  res.json({
    success: true,
    statuses: Object.entries(TaskStatus).map(([name, id]) => ({ id, name }))
  });
});

/**
 * GET /tasks/:id - Obtiene detalles de una tarea
 */
router.get('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = await contractService.getTask(taskId);

    // Get assigned agents details if any
    let assignedAgentsDetails = [];
    if (task.assignedAgents.length > 0) {
      assignedAgentsDetails = await Promise.all(
        task.assignedAgents.map(id => contractService.getAgent(parseInt(id)))
      );
    }

    res.json({
      success: true,
      task: {
        ...task,
        assignedAgentsDetails
      }
    });
  } catch (error) {
    res.status(404).json({ error: 'Task not found' });
  }
});

/**
 * POST /tasks - Crea una nueva tarea
 * Nota: En producción, el usuario crea la tarea directamente on-chain
 * Este endpoint es para el orquestador/admin
 */
router.post('/', async (req, res) => {
  try {
    const { description, agentType, budgetEth } = req.body;

    if (!description || agentType === undefined || !budgetEth) {
      return res.status(400).json({
        error: 'Missing required fields: description, agentType, budgetEth'
      });
    }

    const result = await contractService.createTask(description, agentType, budgetEth);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /tasks/:id/process - Procesa una tarea con el orquestador
 * Selecciona agentes, ejecuta y completa la tarea
 */
router.post('/:id/process', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const { async: asyncMode } = req.query;

    if (asyncMode === 'true') {
      // Async processing - returns job ID immediately
      const jobId = await orchestrator.processTaskAsync(taskId);
      return res.json({
        success: true,
        message: 'Task processing started',
        jobId,
        statusEndpoint: `/tasks/jobs/${jobId}`
      });
    }

    // Sync processing - waits for completion
    const result = await orchestrator.processTask(taskId);

    res.json({
      success: true,
      message: 'Task processed successfully',
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tasks/jobs/:jobId - Obtiene estado de un job asíncrono
 */
router.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = orchestrator.getJobStatus(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    success: true,
    job
  });
});

/**
 * POST /tasks/:id/cancel - Cancela una tarea
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    await contractService.taskManager.cancelTask(taskId);

    res.json({
      success: true,
      message: 'Task cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /tasks/create-gasless - Create task with gasless USDC payment
 * Powered by UltravioletaDAO ERC-3009 facilitator
 *
 * Body: {
 *   authorization: { domain, types, message },
 *   signature: string,
 *   taskId: string,
 *   agentId: string,
 *   task: { description, agentType, budget, budgetUSDC }
 * }
 */
router.post('/create-gasless', async (req, res) => {
  try {
    const payerAddress = req.headers['x-402-payer'];
    const paymentMode = req.headers['x-402-mode'];

    if (paymentMode !== 'gasless') {
      return res.status(400).json({
        error: 'Invalid payment mode',
        reason: 'This endpoint only accepts gasless payments'
      });
    }

    const { authorization, signature, taskId, agentId, task } = req.body;

    // Validate required fields
    if (!authorization || !signature || !task) {
      return res.status(400).json({
        error: 'Missing required fields',
        reason: 'authorization, signature, and task are required'
      });
    }

    if (!task.description || task.agentType === undefined) {
      return res.status(400).json({
        error: 'Invalid task data',
        reason: 'Task must have description and agentType'
      });
    }

    // 1. Verify the ERC-3009 authorization signature
    const isValidSignature = verifyAuthorization(authorization, signature);
    if (!isValidSignature) {
      return res.status(402).json({
        error: 'Payment Invalid',
        reason: 'Invalid authorization signature'
      });
    }

    console.log(`[Gasless] Valid signature from ${payerAddress} for ${task.budgetUSDC} USDC`);

    // 2. Process payment through UltravioletaDAO facilitator
    let paymentResult;
    try {
      // Extract recipient from the authorization message
      const recipient = authorization.message?.to || authorization.to;

      paymentResult = await processGaslessPayment({
        authorization,
        signature,
        taskId,
        recipient
      });

      console.log(`[Gasless] Payment processed:`, paymentResult);
    } catch (paymentError) {
      console.error('[Gasless] Facilitator error:', paymentError.message);
      return res.status(402).json({
        error: 'Payment Failed',
        reason: paymentError.message,
        facilitator: 'https://facilitator.ultravioletadao.xyz',
        network: 'base-sepolia'
      });
    }

    // 3. Create the task (store in memory for demo, or call contract)
    const newTask = {
      id: taskId,
      description: task.description,
      agentType: task.agentType,
      budget: task.budget,
      budgetUSDC: task.budgetUSDC,
      requester: payerAddress,
      status: 'created',
      createdAt: new Date().toISOString(),
      payment: {
        mode: 'gasless',
        currency: 'USDC',
        amount: task.budgetUSDC,
        transactionHash: paymentResult.transactionHash,
        poweredBy: 'UltravioletaDAO'
      }
    };

    gaslessTasks.set(taskId, newTask);

    console.log(`[Gasless] Task created:`, newTask);

    // 4. Return success
    res.status(201).json({
      success: true,
      message: 'Task created with gasless payment!',
      taskId,
      transactionHash: paymentResult.transactionHash,
      task: newTask,
      payment: {
        mode: 'gasless',
        amount: task.budgetUSDC,
        currency: 'USDC',
        gasFee: '$0.00',
        poweredBy: 'UltravioletaDAO'
      }
    });

  } catch (error) {
    console.error('[Gasless] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      reason: error.message
    });
  }
});

/**
 * POST /payment/quote - Get USDC quote for ETH amount
 */
router.post('/payment/quote', async (req, res) => {
  try {
    const { ethAmount } = req.body;

    if (!ethAmount) {
      return res.status(400).json({ error: 'ethAmount is required' });
    }

    const quote = await getPaymentQuote({
      serviceType: 'agent-task',
      ethAmount
    });

    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tasks/gasless - List all gasless tasks
 */
router.get('/gasless', (req, res) => {
  const tasks = Array.from(gaslessTasks.values());
  res.json({
    success: true,
    count: tasks.length,
    tasks,
    poweredBy: 'UltravioletaDAO'
  });
});

export default router;
