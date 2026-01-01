#!/usr/bin/env npx ts-node
/**
 * DEX SDK Test Script
 *
 * This script tests the DEX using casper-js-sdk with a secret key
 * (no wallet required). It replicates what test-dex.sh does but using
 * the same TypeScript SDK that the frontend uses.
 *
 * Usage: npx ts-node scripts/test-sdk.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as sdk from "casper-js-sdk";

// SDK exports
const {
  RpcClient,
  HttpHandler,
  CLValue,
  Args,
  Key,
  PublicKey,
  Deploy,
  DeployHeader,
  StoredVersionedContractByHash,
  ContractPackageHash,
} = (sdk as any).default ?? sdk;

// Load environment
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "deploy-new.out.env");
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2];
    }
  }
  return env;
}

// Load secret key
function loadSecretKey(): any {
  const keyPath = path.join(__dirname, "..", "keys", "secret_key.pem");
  const keyContent = fs.readFileSync(keyPath, "utf-8");
  // Parse PEM and create key pair
  const Keys = (sdk as any).default?.Keys ?? (sdk as any).Keys;
  return Keys?.Ed25519?.parsePrivateKeyFile?.(keyPath);
}

// Configuration
const env = loadEnv();
const NODE_ADDRESS = env.NODE_ADDRESS || "http://127.0.0.1:11101";
const CHAIN_NAME = env.CHAIN_NAME || "casper-net-1";
const ROUTER_PACKAGE_HASH = env.ROUTER_PACKAGE_HASH;
const ROUTER_CONTRACT_HASH = env.ROUTER_CONTRACT_HASH;
const WCSPR_PACKAGE_HASH = env.WCSPR_PACKAGE_HASH;
const WCSPR_CONTRACT_HASH = env.WCSPR_CONTRACT_HASH;
const ECTO_PACKAGE_HASH = env.ECTO_PACKAGE_HASH;
const ECTO_CONTRACT_HASH = env.ECTO_CONTRACT_HASH;
const DEPLOYER_ACCOUNT_HASH = env.DEPLOYER_ACCOUNT_HASH;

console.log("=== DEX SDK Test ===");
console.log("Node:", NODE_ADDRESS);
console.log("Router Package:", ROUTER_PACKAGE_HASH);
console.log("Router Contract:", ROUTER_CONTRACT_HASH);
console.log("WCSPR Contract:", WCSPR_CONTRACT_HASH);
console.log("ECTO Contract:", ECTO_CONTRACT_HASH);

// RPC Client
const nodeUrl = NODE_ADDRESS.endsWith("/rpc")
  ? NODE_ADDRESS
  : `${NODE_ADDRESS}/rpc`;
const rpcClient = new RpcClient(new HttpHandler(nodeUrl));

// Build deploy (same as dex-client.ts)
function buildDeploy(
  packageHash: string,
  entryPoint: string,
  args: any,
  paymentAmount: string,
  senderPublicKey: any
): any {
  const cleanHash = packageHash.replace("hash-", "");

  const ExecutableDeployItem =
    (sdk as any).default?.ExecutableDeployItem ??
    (sdk as any).ExecutableDeployItem;

  const session = new ExecutableDeployItem();
  session.storedVersionedContractByHash = new StoredVersionedContractByHash(
    ContractPackageHash.newContractPackage(cleanHash),
    entryPoint,
    args,
    null
  );

  const payment = new ExecutableDeployItem();
  const paymentArgs = Args.fromMap({
    amount: CLValue.newCLUInt512(paymentAmount),
  });
  payment.moduleBytes = {
    moduleBytes: new Uint8Array(),
    args: paymentArgs,
  };

  const deployHeader = new DeployHeader(
    senderPublicKey.accountHash(),
    Date.now(),
    30 * 60 * 1000,
    1,
    [],
    CHAIN_NAME
  );

  return Deploy.makeDeploy(deployHeader, payment, session);
}

// Send deploy and wait for result
async function sendDeploy(
  deploy: any,
  secretKey: any
): Promise<{ hash: string; success: boolean; error?: string }> {
  // Sign the deploy
  const signedDeploy = deploy.sign([secretKey]);

  // Send deploy
  const deployJson = Deploy.toJSON(signedDeploy);

  try {
    const result = await rpcClient.putDeploy(deployJson);
    const hash = result?.deployHash ?? result;
    console.log(`  TX: ${hash}`);

    // Wait for execution
    const success = await waitForDeploy(hash);
    return { hash, success };
  } catch (err: any) {
    console.error("  Error:", err.message);
    return { hash: "", success: false, error: err.message };
  }
}

// Wait for deploy execution
async function waitForDeploy(
  hash: string,
  maxAttempts = 60,
  delayMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await rpcClient.getDeploy(hash);
      const execInfo = result?.executionInfo ?? result?.execution_info;

      if (execInfo) {
        const errorMsg =
          execInfo?.executionResult?.Version2?.error_message ??
          execInfo?.execution_result?.Version2?.error_message;
        if (errorMsg) {
          console.log(`  FAILED: ${errorMsg}`);
          return false;
        }
        console.log("  SUCCESS");
        return true;
      }
    } catch (err) {
      // Not found yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.log("  TIMEOUT");
  return false;
}

// ============ Test Functions ============

async function mintToken(
  tokenPackageHash: string,
  to: string,
  amount: string,
  name: string,
  secretKey: any,
  publicKey: any
) {
  console.log(`\n[MINT] ${name}: ${amount}`);

  const args = Args.fromMap({
    to: CLValue.newCLKey(Key.newKey(to)),
    amount: CLValue.newCLUInt256(amount),
  });

  const deploy = buildDeploy(
    tokenPackageHash,
    "mint",
    args,
    "3000000000",
    publicKey
  );
  return sendDeploy(deploy, secretKey);
}

async function approveToken(
  tokenPackageHash: string,
  spender: string,
  amount: string,
  name: string,
  secretKey: any,
  publicKey: any
) {
  console.log(`\n[APPROVE] ${name} for Router: ${amount}`);

  const args = Args.fromMap({
    spender: CLValue.newCLKey(
      Key.newKey(spender.startsWith("hash-") ? spender : "hash-" + spender)
    ),
    amount: CLValue.newCLUInt256(amount),
  });

  const deploy = buildDeploy(
    tokenPackageHash,
    "approve",
    args,
    "3000000000",
    publicKey
  );
  return sendDeploy(deploy, secretKey);
}

async function addLiquidity(
  tokenA: string,
  tokenB: string,
  amountA: string,
  amountB: string,
  to: string,
  secretKey: any,
  publicKey: any
) {
  console.log(`\n[ADD_LIQUIDITY] ${amountA} tokenA + ${amountB} tokenB`);

  const deadline = Date.now() + 30 * 60 * 1000;

  const args = Args.fromMap({
    token_a: CLValue.newCLKey(
      Key.newKey(tokenA.startsWith("hash-") ? tokenA : "hash-" + tokenA)
    ),
    token_b: CLValue.newCLKey(
      Key.newKey(tokenB.startsWith("hash-") ? tokenB : "hash-" + tokenB)
    ),
    amount_a_desired: CLValue.newCLUInt256(amountA),
    amount_b_desired: CLValue.newCLUInt256(amountB),
    amount_a_min: CLValue.newCLUInt256("0"),
    amount_b_min: CLValue.newCLUInt256("0"),
    to: CLValue.newCLKey(Key.newKey(to)),
    deadline: CLValue.newCLUint64(BigInt(deadline)),
  });

  const deploy = buildDeploy(
    ROUTER_PACKAGE_HASH,
    "add_liquidity",
    args,
    "20000000000",
    publicKey
  );
  return sendDeploy(deploy, secretKey);
}

// ============ Main ============

async function main() {
  console.log("\n=== Loading Keys ===");

  // Load secret key using SDK's Keys module
  const Keys = (sdk as any).default?.Keys ?? (sdk as any).Keys;
  const keyPath = path.join(__dirname, "..", "keys", "secret_key.pem");

  let secretKey: any;
  let publicKey: any;

  try {
    // Try different SDK key loading methods
    if (Keys?.Ed25519?.loadKeyPairFromPrivateFile) {
      const keyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(keyPath);
      secretKey = keyPair;
      publicKey = keyPair.publicKey;
    } else if (Keys?.Ed25519?.parsePrivateKeyFile) {
      secretKey = Keys.Ed25519.parsePrivateKeyFile(keyPath);
      publicKey = Keys.Ed25519.privateToPublicKey(secretKey);
    } else {
      // Fallback: read PEM and use raw bytes
      const pemContent = fs.readFileSync(keyPath, "utf-8");
      console.log("Keys module not found, using PEM directly");
      throw new Error(
        "Keys module not available - need to implement PEM parsing"
      );
    }
  } catch (err: any) {
    console.error("Error loading key:", err.message);
    console.log("Available Keys exports:", Object.keys(Keys || {}));
    process.exit(1);
  }

  console.log("Public Key:", publicKey?.toHex?.() ?? publicKey);

  // Run tests
  let allPassed = true;

  // 1. Mint tokens
  const mint1 = await mintToken(
    WCSPR_PACKAGE_HASH,
    DEPLOYER_ACCOUNT_HASH,
    "1000000000",
    "WCSPR",
    secretKey,
    publicKey
  );
  allPassed = allPassed && mint1.success;

  const mint2 = await mintToken(
    ECTO_PACKAGE_HASH,
    DEPLOYER_ACCOUNT_HASH,
    "1000000000",
    "ECTO",
    secretKey,
    publicKey
  );
  allPassed = allPassed && mint2.success;

  // 2. Approve Router (using Contract Hash as spender - matches shell script)
  const approve1 = await approveToken(
    WCSPR_PACKAGE_HASH,
    ROUTER_CONTRACT_HASH,
    "1000000000000",
    "WCSPR",
    secretKey,
    publicKey
  );
  allPassed = allPassed && approve1.success;

  const approve2 = await approveToken(
    ECTO_PACKAGE_HASH,
    ROUTER_CONTRACT_HASH,
    "1000000000000",
    "ECTO",
    secretKey,
    publicKey
  );
  allPassed = allPassed && approve2.success;

  // 3. Add Liquidity (using Contract Hashes for tokens - matches shell script)
  const liquidity = await addLiquidity(
    WCSPR_CONTRACT_HASH,
    ECTO_CONTRACT_HASH,
    "500000000",
    "500000000",
    DEPLOYER_ACCOUNT_HASH,
    secretKey,
    publicKey
  );
  allPassed = allPassed && liquidity.success;

  // Summary
  console.log("\n=== Results ===");
  console.log(`Mint WCSPR: ${mint1.success ? "PASS" : "FAIL"}`);
  console.log(`Mint ECTO: ${mint2.success ? "PASS" : "FAIL"}`);
  console.log(`Approve WCSPR: ${approve1.success ? "PASS" : "FAIL"}`);
  console.log(`Approve ECTO: ${approve2.success ? "PASS" : "FAIL"}`);
  console.log(`Add Liquidity: ${liquidity.success ? "PASS" : "FAIL"}`);
  console.log(`\nOverall: ${allPassed ? "ALL PASSED" : "SOME FAILED"}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
