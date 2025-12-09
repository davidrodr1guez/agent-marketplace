import { Router } from 'express';
import { contractService, AgentType } from '../services/ContractService.js';

const router = Router();

/**
 * GET /agents - Lista todos los agentes
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;

    let agents;
    if (type !== undefined) {
      const agentType = parseInt(type);
      if (isNaN(agentType) || agentType < 0 || agentType > 2) {
        return res.status(400).json({ error: 'Invalid agent type. Use 0=Searcher, 1=Analyst, 2=Writer' });
      }
      agents = await contractService.getAgentsByType(agentType);
    } else {
      agents = await contractService.getAllAgents();
    }

    res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /agents/types - Lista tipos de agentes disponibles
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    types: Object.entries(AgentType).map(([name, id]) => ({
      id,
      name,
      description: getAgentTypeDescription(id)
    }))
  });
});

/**
 * GET /agents/top/:type - Top agentes por tipo (por reputación)
 */
router.get('/top/:type', async (req, res) => {
  try {
    const agentType = parseInt(req.params.type);
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(agentType) || agentType < 0 || agentType > 2) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }

    const agents = await contractService.getTopAgents(agentType, limit);

    res.json({
      success: true,
      type: Object.keys(AgentType)[agentType],
      count: agents.length,
      agents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /agents/:id - Obtiene un agente específico
 */
router.get('/:id', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    const agent = await contractService.getAgent(tokenId);
    const reputation = await contractService.getAgentReputation(tokenId);

    res.json({
      success: true,
      agent: { ...agent, reputation }
    });
  } catch (error) {
    res.status(404).json({ error: 'Agent not found' });
  }
});

/**
 * POST /agents - Registra un nuevo agente
 */
router.post('/', async (req, res) => {
  try {
    const {
      agentType,
      name,
      description,
      endpoint,
      pricePerTask,
      paymentAddress,
      metadataURI = ''
    } = req.body;

    // Validate required fields
    if (agentType === undefined || !name || !endpoint || !pricePerTask || !paymentAddress) {
      return res.status(400).json({
        error: 'Missing required fields: agentType, name, endpoint, pricePerTask, paymentAddress'
      });
    }

    const result = await contractService.registerAgent(
      agentType,
      name,
      description || '',
      endpoint,
      pricePerTask,
      paymentAddress,
      metadataURI
    );

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully',
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getAgentTypeDescription(type) {
  const descriptions = {
    0: 'Busca información y datos relevantes',
    1: 'Analiza datos y proporciona insights',
    2: 'Genera contenido y documentación'
  };
  return descriptions[type] || 'Unknown';
}

export default router;
