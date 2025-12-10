const hre = require("hardhat");

async function main() {
  console.log("🟣 Deploying UltraMarket to BASE SEPOLIA TESTNET");
  console.log("   Powered by UltravioletaDAO");
  console.log("=".repeat(55));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📍 Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance < hre.ethers.parseEther("0.001")) {
    console.error("❌ Insufficient balance. Need at least 0.001 ETH for deployment.");
    console.log("   Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    process.exit(1);
  }

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

  // 4. Register 6 AI Agents
  console.log("\n🤖 Registering UltraMarket AI Agents...");

  const agents = [
    {
      type: 0, // Searcher
      name: "DeepSearch AI",
      description: "Advanced web and data search capabilities powered by AI",
      endpoint: "https://api.ultramarket.xyz/agents/searcher",
      price: "0.001"
    },
    {
      type: 0, // Searcher
      name: "ResearchBot",
      description: "Academic and technical research specialist",
      endpoint: "https://api.ultramarket.xyz/agents/searcher",
      price: "0.002"
    },
    {
      type: 1, // Analyst
      name: "DataMind",
      description: "Financial and market data analysis with insights",
      endpoint: "https://api.ultramarket.xyz/agents/analyst",
      price: "0.003"
    },
    {
      type: 1, // Analyst
      name: "TrendSpotter",
      description: "Pattern recognition and trend analysis expert",
      endpoint: "https://api.ultramarket.xyz/agents/analyst",
      price: "0.002"
    },
    {
      type: 2, // Writer
      name: "ContentCraft",
      description: "Professional content and copy generation",
      endpoint: "https://api.ultramarket.xyz/agents/writer",
      price: "0.004"
    },
    {
      type: 2, // Writer
      name: "TechWriter Pro",
      description: "Technical documentation and blog post specialist",
      endpoint: "https://api.ultramarket.xyz/agents/writer",
      price: "0.005"
    }
  ];

  for (const agent of agents) {
    try {
      const tx = await ultraRegistry.registerAgent(
        agent.type,
        agent.name,
        agent.description,
        agent.endpoint,
        hre.ethers.parseEther(agent.price),
        deployer.address, // Payment address
        "" // metadata URI
      );
      await tx.wait();
      console.log(`   ✅ ${agent.name} (${['Searcher', 'Analyst', 'Writer'][agent.type]}) - ${agent.price} ETH`);
    } catch (error) {
      console.log(`   ❌ Failed to register ${agent.name}: ${error.message}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(55));
  console.log("🟣 ULTRAMARKET DEPLOYED TO BASE SEPOLIA!");
  console.log("   Powered by UltravioletaDAO");
  console.log("=".repeat(55));

  console.log("\n📋 Contract Addresses:");
  console.log(`   UltraRegistry:   ${ultraRegistryAddress}`);
  console.log(`   UltraTask:       ${ultraTaskAddress}`);
  console.log(`   UltraReputation: ${ultraReputationAddress}`);

  console.log("\n🔗 View on Basescan:");
  console.log(`   https://sepolia.basescan.org/address/${ultraRegistryAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${ultraTaskAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${ultraReputationAddress}`);

  // Save deployment info
  const fs = require("fs");
  const path = require("path");

  const deployment = {
    network: "baseSepolia",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: {
      UltraRegistry: ultraRegistryAddress,
      UltraTask: ultraTaskAddress,
      UltraReputation: ultraReputationAddress
    },
    agents: agents.map((a, i) => ({ tokenId: i, ...a })),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployments-basesepolia.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n💾 Deployment saved to contracts/deployments-basesepolia.json");

  // Frontend .env update instructions
  console.log("\n📝 Update frontend/.env with:");
  console.log("─".repeat(55));
  console.log(`VITE_ULTRA_REGISTRY_ADDRESS=${ultraRegistryAddress}`);
  console.log(`VITE_ULTRA_TASK_ADDRESS=${ultraTaskAddress}`);
  console.log(`VITE_ULTRA_REPUTATION_ADDRESS=${ultraReputationAddress}`);
  console.log(`VITE_CHAIN_ID=84532`);

  // Verification
  if (process.env.BASESCAN_API_KEY) {
    console.log("\n🔍 Verifying contracts on Basescan...");
    console.log("   Waiting 30 seconds for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address: ultraRegistryAddress,
        constructorArguments: []
      });
      console.log("   ✅ UltraRegistry verified");

      await hre.run("verify:verify", {
        address: ultraTaskAddress,
        constructorArguments: [ultraRegistryAddress]
      });
      console.log("   ✅ UltraTask verified");

      await hre.run("verify:verify", {
        address: ultraReputationAddress,
        constructorArguments: [ultraRegistryAddress, ultraTaskAddress]
      });
      console.log("   ✅ UltraReputation verified");
    } catch (error) {
      console.log("   ⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
