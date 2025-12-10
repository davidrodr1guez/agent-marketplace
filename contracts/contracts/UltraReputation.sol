// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./UltraRegistry.sol";
import "./UltraTask.sol";

/**
 * @title UltraReputation
 * @dev On-chain reputation and feedback system for AI agents
 * Part of UltraMarket - Powered by UltravioletaDAO
 */
contract UltraReputation is Ownable {

    UltraRegistry public ultraRegistry;
    UltraTask public ultraTask;

    struct Review {
        uint256 taskId;
        uint256 agentId;
        address reviewer;
        uint8 rating;           // 1-5 stars
        string comment;
        uint256 timestamp;
    }

    struct AgentReputation {
        uint256 totalReviews;
        uint256 totalRating;    // Sum of all ratings
        uint256 averageRating;  // Scaled by 100 (e.g., 450 = 4.5 stars)
        uint256 successfulTasks;
        uint256 disputedTasks;
    }

    // agentId => AgentReputation
    mapping(uint256 => AgentReputation) public agentReputations;

    // agentId => Review[]
    mapping(uint256 => Review[]) public agentReviews;

    // taskId => agentId => hasReviewed
    mapping(uint256 => mapping(uint256 => bool)) public hasReviewed;

    // Minimum reputation score to be featured (scaled by 100)
    uint256 public featuredThreshold = 400; // 4.0 stars

    event ReviewSubmitted(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed reviewer,
        uint8 rating
    );
    event ReputationUpdated(uint256 indexed agentId, uint256 newAverage);
    event DisputeRecorded(uint256 indexed agentId, uint256 indexed taskId);

    constructor(address _ultraRegistry, address _ultraTask) Ownable(msg.sender) {
        ultraRegistry = UltraRegistry(_ultraRegistry);
        ultraTask = UltraTask(_ultraTask);
    }

    /**
     * @dev Submit a review for an agent after task completion
     */
    function submitReview(
        uint256 taskId,
        uint256 agentId,
        uint8 rating,
        string memory comment
    ) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");

        // Get task and verify
        UltraTask.Task memory task = ultraTask.getTask(taskId);
        require(task.requester == msg.sender, "Not task requester");
        require(
            task.status == UltraTask.TaskStatus.Completed,
            "Task not completed"
        );
        require(!hasReviewed[taskId][agentId], "Already reviewed");

        // Verify agent was assigned to this task
        bool agentAssigned = false;
        for (uint256 i = 0; i < task.assignedAgents.length; i++) {
            if (task.assignedAgents[i] == agentId) {
                agentAssigned = true;
                break;
            }
        }
        require(agentAssigned, "Agent not assigned to task");

        // Create review
        Review memory review = Review({
            taskId: taskId,
            agentId: agentId,
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        });

        agentReviews[agentId].push(review);
        hasReviewed[taskId][agentId] = true;

        // Update reputation
        AgentReputation storage reputation = agentReputations[agentId];
        reputation.totalReviews++;
        reputation.totalRating += rating;
        reputation.averageRating = (reputation.totalRating * 100) / reputation.totalReviews;
        reputation.successfulTasks++;

        emit ReviewSubmitted(taskId, agentId, msg.sender, rating);
        emit ReputationUpdated(agentId, reputation.averageRating);
    }

    /**
     * @dev Record a dispute against an agent (called by UltraTask)
     */
    function recordDispute(uint256 agentId, uint256 taskId) external {
        // In production, add access control for UltraTask only
        AgentReputation storage reputation = agentReputations[agentId];
        reputation.disputedTasks++;

        emit DisputeRecorded(agentId, taskId);
    }

    /**
     * @dev Get agent reputation
     */
    function getReputation(uint256 agentId) external view returns (AgentReputation memory) {
        return agentReputations[agentId];
    }

    /**
     * @dev Get all reviews for an agent
     */
    function getAgentReviews(uint256 agentId) external view returns (Review[] memory) {
        return agentReviews[agentId];
    }

    /**
     * @dev Get review count for an agent
     */
    function getReviewCount(uint256 agentId) external view returns (uint256) {
        return agentReviews[agentId].length;
    }

    /**
     * @dev Check if agent qualifies as featured (high reputation)
     */
    function isFeaturedAgent(uint256 agentId) external view returns (bool) {
        AgentReputation memory reputation = agentReputations[agentId];
        return reputation.totalReviews >= 3 &&
               reputation.averageRating >= featuredThreshold &&
               reputation.disputedTasks == 0;
    }

    /**
     * @dev Get top agents by type (returns agentIds sorted by reputation)
     */
    function getTopAgentsByType(
        UltraRegistry.AgentType agentType,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] memory allAgents = ultraRegistry.getActiveAgentsByType(agentType);

        if (allAgents.length == 0) {
            return new uint256[](0);
        }

        uint256 resultLength = allAgents.length < limit ? allAgents.length : limit;
        uint256[] memory topAgents = new uint256[](resultLength);

        // Simple sorting (bubble sort for small arrays)
        // Copy to memory for sorting
        uint256[] memory sorted = new uint256[](allAgents.length);
        for (uint256 i = 0; i < allAgents.length; i++) {
            sorted[i] = allAgents[i];
        }

        // Sort by reputation (descending)
        for (uint256 i = 0; i < sorted.length - 1; i++) {
            for (uint256 j = 0; j < sorted.length - i - 1; j++) {
                if (agentReputations[sorted[j]].averageRating <
                    agentReputations[sorted[j + 1]].averageRating) {
                    uint256 temp = sorted[j];
                    sorted[j] = sorted[j + 1];
                    sorted[j + 1] = temp;
                }
            }
        }

        // Take top N
        for (uint256 i = 0; i < resultLength; i++) {
            topAgents[i] = sorted[i];
        }

        return topAgents;
    }

    /**
     * @dev Update featured threshold (owner only)
     */
    function setFeaturedThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 500, "Max 5 stars");
        featuredThreshold = _threshold;
    }
}
