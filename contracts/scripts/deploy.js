const hre = require("hardhat");

async function main() {
  console.log("🟣 Deploying UltraMarket contracts to", hre.network.name);
  console.log("   Powered by UltravioletaDAO");
  console.log("-------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // 1. Deploy UltraRegistry
  console.log("📝 Deploying UltraRegistry...");
  const UltraRegistry = await hre.ethers.getContractFactory("UltraRegistry");
  const ultraRegistry = await UltraRegistry.deploy();
  await ultraRegistry.waitForDeployment();
  const ultraRegistryAddress = await ultraRegistry.getAddress();
  console.log("✅ UltraRegistry deployed to:", ultraRegistryAddress);

  // 2. Deploy UltraTask
  console.log("\n📝 Deploying UltraTask...");
  const UltraTask = await hre.ethers.getContractFactory("UltraTask");
  const ultraTask = await UltraTask.deploy(ultraRegistryAddress);
  await ultraTask.waitForDeployment();
  const ultraTaskAddress = await ultraTask.getAddress();
  console.log("✅ UltraTask deployed to:", ultraTaskAddress);

  // 3. Deploy UltraReputation
  console.log("\n📝 Deploying UltraReputation...");
  const UltraReputation = await hre.ethers.getContractFactory("UltraReputation");
  const ultraReputation = await UltraReputation.deploy(
    ultraRegistryAddress,
    ultraTaskAddress
  );
  await ultraReputation.waitForDeployment();
  const ultraReputationAddress = await ultraReputation.getAddress();
  console.log("✅ UltraReputation deployed to:", ultraReputationAddress);

  // Summary
  console.log("\n-------------------------------------------");
  console.log("🟣 ULTRAMARKET DEPLOYMENT COMPLETE");
  console.log("   Powered by UltravioletaDAO");
  console.log("-------------------------------------------");
  console.log("Network:", hre.network.name);
  console.log("UltraRegistry:", ultraRegistryAddress);
  console.log("UltraTask:", ultraTaskAddress);
  console.log("UltraReputation:", ultraReputationAddress);
  console.log("-------------------------------------------");

  // Save addresses for frontend/backend
  const addresses = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contracts: {
      UltraRegistry: ultraRegistryAddress,
      UltraTask: ultraTaskAddress,
      UltraReputation: ultraReputationAddress
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
      console.log("Verifying UltraRegistry...");
      await hre.run("verify:verify", {
        address: ultraRegistryAddress,
        constructorArguments: []
      });

      console.log("Verifying UltraTask...");
      await hre.run("verify:verify", {
        address: ultraTaskAddress,
        constructorArguments: [ultraRegistryAddress]
      });

      console.log("Verifying UltraReputation...");
      await hre.run("verify:verify", {
        address: ultraReputationAddress,
        constructorArguments: [ultraRegistryAddress, ultraTaskAddress]
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
