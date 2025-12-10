const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentMarket contracts to LOCAL network");
  console.log("=".repeat(50));

  const [deployer, agent1, agent2, agent3] = await hre.ethers.getSigners();
  console.log("\n📍 Deployer:", deployer.address);

  // 1. Deploy AgentRegistry
  console.log("\n📝 Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("✅ AgentRegistry:", agentRegistryAddress);

  // 2. Deploy TaskManager
  console.log("\n📝 Deploying TaskManager...");
  const TaskManager = await hre.ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy(agentRegistryAddress);
  await taskManager.waitForDeployment();
  const taskManagerAddress = await taskManager.getAddress();
  console.log("✅ TaskManager:", taskManagerAddress);

  // 3. Deploy ReputationSystem
  console.log("\n📝 Deploying ReputationSystem...");
  const ReputationSystem = await hre.ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy(agentRegistryAddress, taskManagerAddress);
  await reputationSystem.waitForDeployment();
  const reputationSystemAddress = await reputationSystem.getAddress();
  console.log("✅ ReputationSystem:", reputationSystemAddress);

  // 4. Register test agents
  console.log("\n🤖 Registering test agents...");

  const agents = [
    {
      type: 0, // Searcher
      name: "DeepSearch AI",
      description: "Advanced web and data search capabilities",
      endpoint: "http://localhost:3001/agents/searcher",
      price: "0.005",
      owner: agent1 || deployer
    },
    {
      type: 0, // Searcher
      name: "ResearchBot",
      description: "Academic and technical research specialist",
      endpoint: "http://localhost:3001/agents/searcher",
      price: "0.008",
      owner: deployer
    },
    {
      type: 1, // Analyst
      name: "DataMind",
      description: "Financial and market data analysis",
      endpoint: "http://localhost:3001/agents/analyst",
      price: "0.012",
      owner: agent2 || deployer
    },
    {
      type: 1, // Analyst
      name: "TrendSpotter",
      description: "Pattern recognition and trend analysis",
      endpoint: "http://localhost:3001/agents/analyst",
      price: "0.01",
      owner: deployer
    },
    {
      type: 2, // Writer
      name: "ContentCraft",
      description: "Professional content and copy generation",
      endpoint: "http://localhost:3001/agents/writer",
      price: "0.015",
      owner: agent3 || deployer
    },
    {
      type: 2, // Writer
      name: "TechWriter Pro",
      description: "Technical documentation specialist",
      endpoint: "http://localhost:3001/agents/writer",
      price: "0.02",
      owner: deployer
    }
  ];

  for (const agent of agents) {
    const registry = agentRegistry.connect(agent.owner);
    const tx = await registry.registerAgent(
      agent.type,
      agent.name,
      agent.description,
      agent.endpoint,
      hre.ethers.parseEther(agent.price),
      agent.owner.address,
      "" // metadata URI
    );
    await tx.wait();
    console.log(`   ✅ ${agent.name} (${['Searcher', 'Analyst', 'Writer'][agent.type]}) - ${agent.price} ETH`);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log("\nContract Addresses:");
  console.log(`  AGENT_REGISTRY_ADDRESS=${agentRegistryAddress}`);
  console.log(`  TASK_MANAGER_ADDRESS=${taskManagerAddress}`);
  console.log(`  REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);

  console.log("\n📝 Copy these to your .env files:");
  console.log("\nBackend (.env):");
  console.log("─".repeat(40));
  console.log(`BASE_SEPOLIA_RPC_URL=http://127.0.0.1:8545`);
  console.log(`PRIVATE_KEY=${deployer.address.slice(2)}...`);
  console.log(`AGENT_REGISTRY_ADDRESS=${agentRegistryAddress}`);
  console.log(`TASK_MANAGER_ADDRESS=${taskManagerAddress}`);
  console.log(`REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);

  console.log("\nFrontend (.env):");
  console.log("─".repeat(40));
  console.log(`VITE_AGENT_REGISTRY_ADDRESS=${agentRegistryAddress}`);
  console.log(`VITE_TASK_MANAGER_ADDRESS=${taskManagerAddress}`);
  console.log(`VITE_REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);

  console.log("\n💡 Test accounts with 10000 ETH each:");
  const accounts = await hre.ethers.getSigners();
  accounts.slice(0, 5).forEach((acc, i) => {
    console.log(`   Account ${i}: ${acc.address}`);
  });

  // Save to file
  const fs = require("fs");
  const path = require("path");

  const config = {
    network: "localhost",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    contracts: {
      AgentRegistry: agentRegistryAddress,
      TaskManager: taskManagerAddress,
      ReputationSystem: reputationSystemAddress
    },
    testAgents: agents.map((a, i) => ({ tokenId: i, ...a, owner: a.owner.address }))
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployments-local.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("\n💾 Config saved to contracts/deployments-local.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
