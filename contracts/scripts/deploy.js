const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentMarket contracts to", hre.network.name);
  console.log("-------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // 1. Deploy AgentRegistry
  console.log("📝 Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);

  // 2. Deploy TaskManager
  console.log("\n📝 Deploying TaskManager...");
  const TaskManager = await hre.ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy(agentRegistryAddress);
  await taskManager.waitForDeployment();
  const taskManagerAddress = await taskManager.getAddress();
  console.log("✅ TaskManager deployed to:", taskManagerAddress);

  // 3. Deploy ReputationSystem
  console.log("\n📝 Deploying ReputationSystem...");
  const ReputationSystem = await hre.ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy(
    agentRegistryAddress,
    taskManagerAddress
  );
  await reputationSystem.waitForDeployment();
  const reputationSystemAddress = await reputationSystem.getAddress();
  console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);

  // Summary
  console.log("\n-------------------------------------------");
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("-------------------------------------------");
  console.log("Network:", hre.network.name);
  console.log("AgentRegistry:", agentRegistryAddress);
  console.log("TaskManager:", taskManagerAddress);
  console.log("ReputationSystem:", reputationSystemAddress);
  console.log("-------------------------------------------");

  // Save addresses for frontend/backend
  const addresses = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contracts: {
      AgentRegistry: agentRegistryAddress,
      TaskManager: taskManagerAddress,
      ReputationSystem: reputationSystemAddress
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const fs = require("fs");
  const path = require("path");

  // Save to contracts folder
  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n💾 Addresses saved to contracts/deployments.json");

  // Verify on Basescan (if not local)
  if (hre.network.name === "baseSepolia") {
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s

    try {
      console.log("Verifying AgentRegistry...");
      await hre.run("verify:verify", {
        address: agentRegistryAddress,
        constructorArguments: []
      });

      console.log("Verifying TaskManager...");
      await hre.run("verify:verify", {
        address: taskManagerAddress,
        constructorArguments: [agentRegistryAddress]
      });

      console.log("Verifying ReputationSystem...");
      await hre.run("verify:verify", {
        address: reputationSystemAddress,
        constructorArguments: [agentRegistryAddress, taskManagerAddress]
      });

      console.log("✅ All contracts verified on Basescan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
