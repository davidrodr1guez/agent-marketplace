import { Router } from 'express';
import { contractService, AgentType, TaskStatus } from '../services/ContractService.js';
import { orchestrator } from '../services/Orchestrator.js';

const router = Router();

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

export default router;
