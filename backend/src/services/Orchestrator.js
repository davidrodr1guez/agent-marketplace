import { contractService, AgentType, TaskStatus } from './ContractService.js';
import { AgentFactory } from './AIAgents.js';

/**
 * Orchestrator - Coordina la ejecución de tareas entre agentes
 */
class Orchestrator {
  constructor() {
    this.activeJobs = new Map();
  }

  /**
   * Procesa una tarea completa: selecciona agentes, ejecuta y completa
   */
  async processTask(taskId) {
    console.log(`🎯 Processing task ${taskId}`);

    try {
      // 1. Get task details
      const task = await contractService.getTask(taskId);
      console.log(`📋 Task: ${task.description}`);
      console.log(`💰 Budget: ${task.budget} ETH`);

      if (task.status !== TaskStatus.Created) {
        throw new Error(`Task is not in Created status (current: ${task.statusName})`);
      }

      // 2. Select best agents for the task
      const selectedAgents = await this.selectAgents(task.requiredAgentType, task.budget);
      console.log(`🤖 Selected agents: ${selectedAgents.map(a => a.tokenId).join(', ')}`);

      if (selectedAgents.length === 0) {
        throw new Error('No suitable agents found for this task');
      }

      // 3. Assign agents on-chain
      const agentIds = selectedAgents.map(a => parseInt(a.tokenId));
      await contractService.assignAgents(taskId, agentIds);
      console.log(`✅ Agents assigned on-chain`);

      // 4. Start task
      await contractService.startTask(taskId);
      console.log(`🚀 Task started`);

      // 5. Execute task with AI agents
      const result = await this.executeWithAgents(task, selectedAgents);
      console.log(`📝 Task executed, result length: ${result.length} chars`);

      // 6. Store result (in production, upload to IPFS)
      const resultURI = await this.storeResult(taskId, result);
      console.log(`💾 Result stored: ${resultURI}`);

      // 7. Complete task on-chain (triggers payments)
      await contractService.completeTask(taskId, resultURI);
      console.log(`✅ Task ${taskId} completed!`);

      return {
        taskId,
        status: 'completed',
        result,
        resultURI,
        agents: selectedAgents.map(a => ({ id: a.tokenId, name: a.name }))
      };

    } catch (error) {
      console.error(`❌ Error processing task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * Selecciona los mejores agentes para una tarea basándose en reputación y precio
   */
  async selectAgents(agentType, budgetEth) {
    // Get top agents by reputation
    const agents = await contractService.getAgentsByType(agentType);

    if (agents.length === 0) {
      return [];
    }

    // Filter by budget and sort by reputation
    const budget = parseFloat(budgetEth);
    const eligibleAgents = agents.filter(a => parseFloat(a.pricePerTask) <= budget);

    // Get reputation for each agent
    const agentsWithRep = await Promise.all(
      eligibleAgents.map(async (agent) => {
        try {
          const reputation = await contractService.getAgentReputation(agent.tokenId);
          return { ...agent, reputation };
        } catch {
          return { ...agent, reputation: { averageRating: 0 } };
        }
      })
    );

    // Sort by reputation (descending)
    agentsWithRep.sort((a, b) =>
      (b.reputation?.averageRating || 0) - (a.reputation?.averageRating || 0)
    );

    // Return top agent(s) - for now just 1, could be multiple for complex tasks
    return agentsWithRep.slice(0, 1);
  }

  /**
   * Ejecuta la tarea usando los agentes IA
   */
  async executeWithAgents(task, selectedAgents) {
    const results = [];

    for (const agent of selectedAgents) {
      const aiAgent = AgentFactory.create(task.requiredAgentType);

      let result;
      switch (task.requiredAgentType) {
        case AgentType.Searcher:
          result = await aiAgent.search(task.description);
          break;
        case AgentType.Analyst:
          result = await aiAgent.analyze(task.description);
          break;
        case AgentType.Writer:
          result = await aiAgent.write(task.description);
          break;
        default:
          result = await aiAgent.execute(task.description);
      }

      results.push({
        agentId: agent.tokenId,
        agentName: agent.name,
        ...result
      });
    }

    // Combine results if multiple agents
    const combinedResult = results.map(r =>
      `=== ${r.agentName} (ID: ${r.agentId}) ===\n${r.result}`
    ).join('\n\n');

    return combinedResult;
  }

  /**
   * Almacena el resultado (mock - en producción usar IPFS)
   */
  async storeResult(taskId, result) {
    // In production, upload to IPFS and return CID
    // For now, return a mock URI
    const mockCID = `Qm${Buffer.from(result.slice(0, 32)).toString('hex')}`;
    return `ipfs://${mockCID}`;
  }

  /**
   * Procesa tarea de forma asíncrona (para x402)
   */
  async processTaskAsync(taskId) {
    const jobId = `job_${taskId}_${Date.now()}`;

    this.activeJobs.set(jobId, {
      taskId,
      status: 'processing',
      startedAt: new Date()
    });

    // Process in background
    this.processTask(taskId)
      .then(result => {
        this.activeJobs.set(jobId, {
          ...this.activeJobs.get(jobId),
          status: 'completed',
          result,
          completedAt: new Date()
        });
      })
      .catch(error => {
        this.activeJobs.set(jobId, {
          ...this.activeJobs.get(jobId),
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        });
      });

    return jobId;
  }

  /**
   * Obtiene el estado de un job
   */
  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }
}

export const orchestrator = new Orchestrator();
export default orchestrator;
