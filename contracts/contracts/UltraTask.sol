// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./UltraRegistry.sol";

/**
 * @title UltraTask
 * @dev Manages task creation, assignment, execution and payments for AI agents
 * Part of UltraMarket - Powered by UltravioletaDAO
 * Integrates with x402 for automatic payments via UltravioletaDAO facilitator
 */
contract UltraTask is ReentrancyGuard, Ownable {

    UltraRegistry public ultraRegistry;

    enum TaskStatus { Created, Assigned, InProgress, Completed, Disputed, Cancelled }

    struct Task {
        uint256 id;
        address requester;
        string description;
        UltraRegistry.AgentType requiredAgentType;
        uint256[] assignedAgents;    // Can be multiple agents for complex tasks
        uint256 budget;              // Total budget in wei
        uint256 depositedAmount;     // Amount deposited by requester
        TaskStatus status;
        string resultURI;            // IPFS URI for task result
        uint256 createdAt;
        uint256 completedAt;
    }

    uint256 private _nextTaskId;

    // taskId => Task
    mapping(uint256 => Task) public tasks;

    // requester => taskIds
    mapping(address => uint256[]) public requesterTasks;

    // agentId => taskIds
    mapping(uint256 => uint256[]) public agentTasks;

    // Platform fee (basis points, 100 = 1%)
    uint256 public platformFeeBps = 250; // 2.5%
    address public feeRecipient;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed requester,
        UltraRegistry.AgentType agentType,
        uint256 budget
    );
    event TaskAssigned(uint256 indexed taskId, uint256[] agentIds);
    event TaskStarted(uint256 indexed taskId);
    event TaskCompleted(uint256 indexed taskId, string resultURI);
    event TaskDisputed(uint256 indexed taskId, string reason);
    event TaskCancelled(uint256 indexed taskId);
    event PaymentReleased(uint256 indexed taskId, uint256 indexed agentId, uint256 amount);

    constructor(address _ultraRegistry) Ownable(msg.sender) {
        ultraRegistry = UltraRegistry(_ultraRegistry);
        feeRecipient = msg.sender;
    }

    /**
     * @dev Create a new task with payment
     */
    function createTask(
        string memory description,
        UltraRegistry.AgentType requiredAgentType
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must deposit payment");
        require(bytes(description).length > 0, "Description required");

        uint256 taskId = _nextTaskId++;

        tasks[taskId] = Task({
            id: taskId,
            requester: msg.sender,
            description: description,
            requiredAgentType: requiredAgentType,
            assignedAgents: new uint256[](0),
            budget: msg.value,
            depositedAmount: msg.value,
            status: TaskStatus.Created,
            resultURI: "",
            createdAt: block.timestamp,
            completedAt: 0
        });

        requesterTasks[msg.sender].push(taskId);

        emit TaskCreated(taskId, msg.sender, requiredAgentType, msg.value);

        return taskId;
    }

    /**
     * @dev Assign agents to a task (called by orchestrator/backend)
     */
    function assignAgents(uint256 taskId, uint256[] memory agentIds) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Created, "Task not available");
        require(agentIds.length > 0, "Must assign at least one agent");

        // Verify all agents exist and are active
        for (uint256 i = 0; i < agentIds.length; i++) {
            UltraRegistry.Agent memory agent = ultraRegistry.getAgent(agentIds[i]);
            require(agent.isActive, "Agent not active");
        }

        task.assignedAgents = agentIds;
        task.status = TaskStatus.Assigned;

        // Track task for each agent
        for (uint256 i = 0; i < agentIds.length; i++) {
            agentTasks[agentIds[i]].push(taskId);
        }

        emit TaskAssigned(taskId, agentIds);
    }

    /**
     * @dev Mark task as in progress
     */
    function startTask(uint256 taskId) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Assigned, "Task not assigned");

        task.status = TaskStatus.InProgress;
        emit TaskStarted(taskId);
    }

    /**
     * @dev Complete task and release payments to agents
     */
    function completeTask(uint256 taskId, string memory resultURI) external onlyOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.InProgress, "Task not in progress");
        require(bytes(resultURI).length > 0, "Result URI required");

        task.status = TaskStatus.Completed;
        task.resultURI = resultURI;
        task.completedAt = block.timestamp;

        // Calculate and distribute payments
        uint256 platformFee = (task.depositedAmount * platformFeeBps) / 10000;
        uint256 agentPayment = task.depositedAmount - platformFee;
        uint256 paymentPerAgent = agentPayment / task.assignedAgents.length;

        // Pay platform fee
        if (platformFee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: platformFee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        // Pay agents
        for (uint256 i = 0; i < task.assignedAgents.length; i++) {
            uint256 agentId = task.assignedAgents[i];
            UltraRegistry.Agent memory agent = ultraRegistry.getAgent(agentId);

            (bool success, ) = agent.paymentAddress.call{value: paymentPerAgent}("");
            require(success, "Agent payment failed");

            // Record completion in registry
            ultraRegistry.recordTaskCompletion(agentId, paymentPerAgent);

            emit PaymentReleased(taskId, agentId, paymentPerAgent);
        }

        emit TaskCompleted(taskId, resultURI);
    }

    /**
     * @dev Dispute a task (requester only)
     */
    function disputeTask(uint256 taskId, string memory reason) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.requester, "Not task requester");
        require(
            task.status == TaskStatus.InProgress || task.status == TaskStatus.Completed,
            "Cannot dispute this task"
        );

        task.status = TaskStatus.Disputed;
        emit TaskDisputed(taskId, reason);
    }

    /**
     * @dev Cancel task and refund (only if not started)
     */
    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(msg.sender == task.requester || msg.sender == owner(), "Not authorized");
        require(
            task.status == TaskStatus.Created || task.status == TaskStatus.Assigned,
            "Cannot cancel started task"
        );

        task.status = TaskStatus.Cancelled;

        // Refund requester
        if (task.depositedAmount > 0) {
            (bool success, ) = task.requester.call{value: task.depositedAmount}("");
            require(success, "Refund failed");
        }

        emit TaskCancelled(taskId);
    }

    /**
     * @dev Get task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /**
     * @dev Get tasks by requester
     */
    function getRequesterTasks(address requester) external view returns (uint256[] memory) {
        return requesterTasks[requester];
    }

    /**
     * @dev Get tasks assigned to an agent
     */
    function getAgentTasks(uint256 agentId) external view returns (uint256[] memory) {
        return agentTasks[agentId];
    }

    /**
     * @dev Total number of tasks
     */
    function totalTasks() external view returns (uint256) {
        return _nextTaskId;
    }

    /**
     * @dev Update platform fee (owner only)
     */
    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = _feeBps;
    }

    /**
     * @dev Update fee recipient (owner only)
     */
    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
    }
}
