const hre = require("hardhat");

async function main() {
  console.log("🟣 Deploying UltraMarket contracts to LOCAL network");
  console.log("   Powered by UltravioletaDAO");
  console.log("=".repeat(50));

  const [deployer, agent1, agent2, agent3] = await hre.ethers.getSigners();
  console.log("\n📍 Deployer:", deployer.address);

  // 1. Deploy UltraRegistry
  console.log("\n📝 Deploying UltraRegistry...");
  const UltraRegistry = await hre.ethers.getContractFactory("UltraRegistry");
  const ultraRegistry = await UltraRegistry.deploy();
  await ultraRegistry.waitForDeployment();
  const ultraRegistryAddress = await ultraRegistry.getAddress();
  console.log("✅ UltraRegistry:", ultraRegistryAddress);

  // 2. Deploy UltraTask
  console.log("\n📝 Deploying UltraTask...");
  const UltraTask = await hre.ethers.getContractFactory("UltraTask");
  const ultraTask = await UltraTask.deploy(ultraRegistryAddress);
  await ultraTask.waitForDeployment();
  const ultraTaskAddress = await ultraTask.getAddress();
  console.log("✅ UltraTask:", ultraTaskAddress);

  // 3. Deploy UltraReputation
  console.log("\n📝 Deploying UltraReputation...");
  const UltraReputation = await hre.ethers.getContractFactory("UltraReputation");
  const ultraReputation = await UltraReputation.deploy(ultraRegistryAddress, ultraTaskAddress);
  await ultraReputation.waitForDeployment();
  const ultraReputationAddress = await ultraReputation.getAddress();
  console.log("✅ UltraReputation:", ultraReputationAddress);

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
    const registry = ultraRegistry.connect(agent.owner);
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
  console.log("🟣 ULTRAMARKET DEPLOYMENT COMPLETE");
  console.log("   Powered by UltravioletaDAO");
  console.log("=".repeat(50));
  console.log("\nContract Addresses:");
  console.log(`  ULTRA_REGISTRY_ADDRESS=${ultraRegistryAddress}`);
  console.log(`  ULTRA_TASK_ADDRESS=${ultraTaskAddress}`);
  console.log(`  ULTRA_REPUTATION_ADDRESS=${ultraReputationAddress}`);

  console.log("\n📝 Copy these to your .env files:");
  console.log("\nBackend (.env):");
  console.log("─".repeat(40));
  console.log(`BASE_SEPOLIA_RPC_URL=http://127.0.0.1:8545`);
  console.log(`PRIVATE_KEY=${deployer.address.slice(2)}...`);
  console.log(`ULTRA_REGISTRY_ADDRESS=${ultraRegistryAddress}`);
  console.log(`ULTRA_TASK_ADDRESS=${ultraTaskAddress}`);
  console.log(`ULTRA_REPUTATION_ADDRESS=${ultraReputationAddress}`);

  console.log("\nFrontend (.env):");
  console.log("─".repeat(40));
  console.log(`VITE_ULTRA_REGISTRY_ADDRESS=${ultraRegistryAddress}`);
  console.log(`VITE_ULTRA_TASK_ADDRESS=${ultraTaskAddress}`);
  console.log(`VITE_ULTRA_REPUTATION_ADDRESS=${ultraReputationAddress}`);

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
      UltraRegistry: ultraRegistryAddress,
      UltraTask: ultraTaskAddress,
      UltraReputation: ultraReputationAddress
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
