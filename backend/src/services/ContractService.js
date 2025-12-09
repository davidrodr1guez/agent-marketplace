import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// ABIs (simplified - in production, import from artifacts)
const AgentRegistryABI = [
  "function registerAgent(uint8 agentType, string name, string description, string endpoint, uint256 pricePerTask, address paymentAddress, string metadataURI) returns (uint256)",
  "function getAgent(uint256 tokenId) view returns (tuple(uint8 agentType, string name, string description, string endpoint, uint256 pricePerTask, address paymentAddress, bool isActive, uint256 totalTasksCompleted, uint256 totalEarnings))",
  "function getActiveAgentsByType(uint8 agentType) view returns (uint256[])",
  "function totalAgents() view returns (uint256)",
  "function updateAgent(uint256 tokenId, bool isActive, uint256 pricePerTask, string endpoint)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed owner, uint8 agentType, string name, uint256 pricePerTask)"
];

const TaskManagerABI = [
  "function createTask(string description, uint8 requiredAgentType) payable returns (uint256)",
  "function assignAgents(uint256 taskId, uint256[] agentIds)",
  "function startTask(uint256 taskId)",
  "function completeTask(uint256 taskId, string resultURI)",
  "function cancelTask(uint256 taskId)",
  "function getTask(uint256 taskId) view returns (tuple(uint256 id, address requester, string description, uint8 requiredAgentType, uint256[] assignedAgents, uint256 budget, uint256 depositedAmount, uint8 status, string resultURI, uint256 createdAt, uint256 completedAt))",
  "function getRequesterTasks(address requester) view returns (uint256[])",
  "function totalTasks() view returns (uint256)",
  "event TaskCreated(uint256 indexed taskId, address indexed requester, uint8 agentType, uint256 budget)",
  "event TaskCompleted(uint256 indexed taskId, string resultURI)"
];

const ReputationSystemABI = [
  "function getReputation(uint256 agentId) view returns (tuple(uint256 totalReviews, uint256 totalRating, uint256 averageRating, uint256 successfulTasks, uint256 disputedTasks))",
  "function getTopAgentsByType(uint8 agentType, uint256 limit) view returns (uint256[])",
  "function isFeaturedAgent(uint256 agentId) view returns (bool)"
];

// Agent types enum
export const AgentType = {
  Searcher: 0,
  Analyst: 1,
  Writer: 2
};

// Task status enum
export const TaskStatus = {
  Created: 0,
  Assigned: 1,
  InProgress: 2,
  Completed: 3,
  Disputed: 4,
  Cancelled: 5
};

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.agentRegistry = null;
    this.taskManager = null;
    this.reputationSystem = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (process.env.PRIVATE_KEY) {
      this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      console.log('🔑 Signer initialized:', this.signer.address);
    }

    // Initialize contracts if addresses are set
    if (process.env.AGENT_REGISTRY_ADDRESS) {
      this.agentRegistry = new ethers.Contract(
        process.env.AGENT_REGISTRY_ADDRESS,
        AgentRegistryABI,
        this.signer || this.provider
      );
    }

    if (process.env.TASK_MANAGER_ADDRESS) {
      this.taskManager = new ethers.Contract(
        process.env.TASK_MANAGER_ADDRESS,
        TaskManagerABI,
        this.signer || this.provider
      );
    }

    if (process.env.REPUTATION_SYSTEM_ADDRESS) {
      this.reputationSystem = new ethers.Contract(
        process.env.REPUTATION_SYSTEM_ADDRESS,
        ReputationSystemABI,
        this.signer || this.provider
      );
    }

    this.initialized = true;
    console.log('📝 ContractService initialized');
  }

  // ============ Agent Registry Methods ============

  async getAgent(tokenId) {
    await this.initialize();
    const agent = await this.agentRegistry.getAgent(tokenId);
    return this._formatAgent(tokenId, agent);
  }

  async getAgentsByType(agentType) {
    await this.initialize();
    const tokenIds = await this.agentRegistry.getActiveAgentsByType(agentType);
    const agents = await Promise.all(
      tokenIds.map(id => this.getAgent(id))
    );
    return agents;
  }

  async getAllAgents() {
    await this.initialize();
    const total = await this.agentRegistry.totalAgents();
    const agents = [];
    for (let i = 0; i < total; i++) {
      try {
        const agent = await this.getAgent(i);
        agents.push(agent);
      } catch (e) {
        // Skip if agent doesn't exist
      }
    }
    return agents;
  }

  async registerAgent(agentType, name, description, endpoint, pricePerTask, paymentAddress, metadataURI) {
    await this.initialize();
    const tx = await this.agentRegistry.registerAgent(
      agentType,
      name,
      description,
      endpoint,
      ethers.parseEther(pricePerTask.toString()),
      paymentAddress,
      metadataURI
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        return this.agentRegistry.interface.parseLog(log)?.name === 'AgentRegistered';
      } catch { return false; }
    });
    const parsed = this.agentRegistry.interface.parseLog(event);
    return { tokenId: parsed.args.tokenId.toString(), txHash: receipt.hash };
  }

  // ============ Task Manager Methods ============

  async createTask(description, agentType, budgetEth) {
    await this.initialize();
    const tx = await this.taskManager.createTask(
      description,
      agentType,
      { value: ethers.parseEther(budgetEth.toString()) }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        return this.taskManager.interface.parseLog(log)?.name === 'TaskCreated';
      } catch { return false; }
    });
    const parsed = this.taskManager.interface.parseLog(event);
    return { taskId: parsed.args.taskId.toString(), txHash: receipt.hash };
  }

  async getTask(taskId) {
    await this.initialize();
    const task = await this.taskManager.getTask(taskId);
    return this._formatTask(task);
  }

  async assignAgents(taskId, agentIds) {
    await this.initialize();
    const tx = await this.taskManager.assignAgents(taskId, agentIds);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async startTask(taskId) {
    await this.initialize();
    const tx = await this.taskManager.startTask(taskId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async completeTask(taskId, resultURI) {
    await this.initialize();
    const tx = await this.taskManager.completeTask(taskId, resultURI);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async getRequesterTasks(address) {
    await this.initialize();
    const taskIds = await this.taskManager.getRequesterTasks(address);
    const tasks = await Promise.all(
      taskIds.map(id => this.getTask(id))
    );
    return tasks;
  }

  // ============ Reputation Methods ============

  async getAgentReputation(agentId) {
    await this.initialize();
    const rep = await this.reputationSystem.getReputation(agentId);
    return {
      totalReviews: Number(rep.totalReviews),
      totalRating: Number(rep.totalRating),
      averageRating: Number(rep.averageRating) / 100, // Convert from scaled
      successfulTasks: Number(rep.successfulTasks),
      disputedTasks: Number(rep.disputedTasks)
    };
  }

  async getTopAgents(agentType, limit = 10) {
    await this.initialize();
    const tokenIds = await this.reputationSystem.getTopAgentsByType(agentType, limit);
    const agents = await Promise.all(
      tokenIds.map(async (id) => {
        const agent = await this.getAgent(id);
        const reputation = await this.getAgentReputation(id);
        return { ...agent, reputation };
      })
    );
    return agents;
  }

  // ============ Helper Methods ============

  _formatAgent(tokenId, agent) {
    return {
      tokenId: tokenId.toString(),
      agentType: Number(agent.agentType),
      agentTypeName: Object.keys(AgentType)[agent.agentType],
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpoint,
      pricePerTask: ethers.formatEther(agent.pricePerTask),
      paymentAddress: agent.paymentAddress,
      isActive: agent.isActive,
      totalTasksCompleted: Number(agent.totalTasksCompleted),
      totalEarnings: ethers.formatEther(agent.totalEarnings)
    };
  }

  _formatTask(task) {
    return {
      id: task.id.toString(),
      requester: task.requester,
      description: task.description,
      requiredAgentType: Number(task.requiredAgentType),
      requiredAgentTypeName: Object.keys(AgentType)[task.requiredAgentType],
      assignedAgents: task.assignedAgents.map(id => id.toString()),
      budget: ethers.formatEther(task.budget),
      depositedAmount: ethers.formatEther(task.depositedAmount),
      status: Number(task.status),
      statusName: Object.keys(TaskStatus)[task.status],
      resultURI: task.resultURI,
      createdAt: new Date(Number(task.createdAt) * 1000).toISOString(),
      completedAt: task.completedAt > 0
        ? new Date(Number(task.completedAt) * 1000).toISOString()
        : null
    };
  }
}

export const contractService = new ContractService();
export default contractService;
