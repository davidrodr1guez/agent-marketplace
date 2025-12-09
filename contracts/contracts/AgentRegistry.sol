// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @dev ERC-8004 inspired registry for autonomous AI agents
 * Each agent is an NFT with on-chain metadata including capabilities and pricing
 */
contract AgentRegistry is ERC721, ERC721URIStorage, Ownable {

    uint256 private _nextTokenId;

    enum AgentType { Searcher, Analyst, Writer }

    struct Agent {
        AgentType agentType;
        string name;
        string description;
        string endpoint;          // API endpoint for the agent
        uint256 pricePerTask;     // Price in wei per task
        address paymentAddress;   // Address to receive payments
        bool isActive;
        uint256 totalTasksCompleted;
        uint256 totalEarnings;
    }

    // tokenId => Agent
    mapping(uint256 => Agent) public agents;

    // Track agents by type for discovery
    mapping(AgentType => uint256[]) public agentsByType;

    // Owner address => their agent tokenIds
    mapping(address => uint256[]) public ownerAgents;

    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed owner,
        AgentType agentType,
        string name,
        uint256 pricePerTask
    );

    event AgentUpdated(uint256 indexed tokenId, bool isActive, uint256 pricePerTask);
    event AgentTaskCompleted(uint256 indexed tokenId, uint256 earnings);

    constructor() ERC721("AgentMarket Agents", "AGENT") Ownable(msg.sender) {}

    /**
     * @dev Register a new AI agent as an NFT
     */
    function registerAgent(
        AgentType agentType,
        string memory name,
        string memory description,
        string memory endpoint,
        uint256 pricePerTask,
        address paymentAddress,
        string memory metadataURI
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(endpoint).length > 0, "Endpoint required");
        require(pricePerTask > 0, "Price must be > 0");
        require(paymentAddress != address(0), "Invalid payment address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        agents[tokenId] = Agent({
            agentType: agentType,
            name: name,
            description: description,
            endpoint: endpoint,
            pricePerTask: pricePerTask,
            paymentAddress: paymentAddress,
            isActive: true,
            totalTasksCompleted: 0,
            totalEarnings: 0
        });

        agentsByType[agentType].push(tokenId);
        ownerAgents[msg.sender].push(tokenId);

        emit AgentRegistered(tokenId, msg.sender, agentType, name, pricePerTask);

        return tokenId;
    }

    /**
     * @dev Update agent status and pricing (only owner)
     */
    function updateAgent(
        uint256 tokenId,
        bool isActive,
        uint256 pricePerTask,
        string memory endpoint
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        require(pricePerTask > 0, "Price must be > 0");

        agents[tokenId].isActive = isActive;
        agents[tokenId].pricePerTask = pricePerTask;
        agents[tokenId].endpoint = endpoint;

        emit AgentUpdated(tokenId, isActive, pricePerTask);
    }

    /**
     * @dev Record task completion (called by TaskManager)
     */
    function recordTaskCompletion(uint256 tokenId, uint256 earnings) external {
        // In production, add access control for TaskManager only
        agents[tokenId].totalTasksCompleted++;
        agents[tokenId].totalEarnings += earnings;

        emit AgentTaskCompleted(tokenId, earnings);
    }

    /**
     * @dev Get all agents of a specific type
     */
    function getAgentsByType(AgentType agentType) external view returns (uint256[] memory) {
        return agentsByType[agentType];
    }

    /**
     * @dev Get all active agents of a specific type
     */
    function getActiveAgentsByType(AgentType agentType) external view returns (uint256[] memory) {
        uint256[] memory allAgents = agentsByType[agentType];
        uint256 activeCount = 0;

        // Count active agents
        for (uint256 i = 0; i < allAgents.length; i++) {
            if (agents[allAgents[i]].isActive) {
                activeCount++;
            }
        }

        // Build active agents array
        uint256[] memory activeAgents = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allAgents.length; i++) {
            if (agents[allAgents[i]].isActive) {
                activeAgents[index] = allAgents[i];
                index++;
            }
        }

        return activeAgents;
    }

    /**
     * @dev Get agent details
     */
    function getAgent(uint256 tokenId) external view returns (Agent memory) {
        require(tokenId < _nextTokenId, "Agent does not exist");
        return agents[tokenId];
    }

    /**
     * @dev Get total number of registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _nextTokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
