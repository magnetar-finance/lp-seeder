import values from "./values.json";
import abi from "./router-abi";
import {
  createWalletClient,
  defineChain,
  http,
  parseUnits,
  parseEther,
  encodeFunctionData,
  type Address,
  erc20Abi,
} from "viem";
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";

const entries = Object.entries(values);
const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

function encodeRouterFunctionDataAddLiquidityETH(
  token: Address,
  stable: boolean,
  amount0: string,
  decimals0: number,
) {
  const amount = parseUnits(amount0, decimals0);
  const deadline = Math.floor(Date.now() / 1000) + 12000;
  return encodeFunctionData({
    abi,
    functionName: "addLiquidityETH",
    args: [token, stable, amount, 0n, 0n, account.address, BigInt(deadline)],
  });
}

function encodeERC20Approval(to: Address, amount0: string, decimals0: number) {
  const amount = parseUnits(amount0, decimals0);
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [to, amount],
  });
}

async function seedLPPerEntry() {
  console.log(
    "%c⟁ %cNow seeding liquidity pools%c · %c" + new Date().toISOString(),
    "color: #00ffaa; font-size: 16px;",
    "color: #00ffaa; font-weight: bold; font-size: 13px;",
    "color: #444;",
    "color: #555; font-size: 11px;",
  );
  for (const [, entry] of entries) {
    console.log(
      `%c⟁ %cNow seeding for chain%c · %c${
        entry.defineChainConfig.id
      }%c · %c${new Date().toISOString()}`,
      "color: #00ffaa; font-size: 16px;",
      "color: #00ffaa; font-weight: bold; font-size: 13px;",
      "color: #444;",
      "color: #ffd700; font-weight: bold; font-size: 13px;",
      "color: #444;",
      "color: #555; font-size: 11px;",
    );
    const ethValue = parseEther(entry.ethValue);
    // Define chain config for Viem
    const chainConfig = defineChain(entry.defineChainConfig);
    const client = createWalletClient({
      chain: chainConfig,
      transport: http(),
    });

    for (const token of entry.tokens) {
      console.log(
        `%c⟁ %cNow seeding for %cETH%c and %c${
          token.name
        }%c · %c${new Date().toISOString()}`,
        "color: #00ffaa; font-size: 16px;",
        "color: #00ffaa; font-weight: bold; font-size: 13px;",
        "color: #627eea; font-weight: bold; font-size: 13px;",
        "color: #00ffaa; font-weight: bold; font-size: 13px;",
        "color: #ffd700; font-weight: bold; font-size: 13px;",
        "color: #444;",
        "color: #555; font-size: 11px;",
      );

      // Approval data
      const approvalData = encodeERC20Approval(
        entry.routerId as Address,
        "1000",
        token.decimals,
      );
      await client.sendTransaction({
        account,
        to: token.address as Address,
        data: approvalData,
      });

      // Transaction data
      const data = encodeRouterFunctionDataAddLiquidityETH(
        token.address as Address,
        false,
        "1000",
        token.decimals,
      );
      try {
        const hash = await client.sendTransaction({
          account,
          to: entry.routerId as `0x${string}`,
          value: ethValue,
          data,
          gas: entry.defineChainConfig.id === 5124 ? 6000000n : 2000000n,
        });

        console.log(
          `%c⟁ %cSuccessfully added liquidity%c · %c${new Date().toISOString()}\n%c  ↳ Hash:             %c${hash}\n%c  ↳ View on explorer: %c${
            entry.defineChainConfig.blockExplorers.default.url
          }/tx/${hash}`,
          "color: #00ffaa; font-size: 16px;",
          "color: #00ffaa; font-weight: bold; font-size: 13px;",
          "color: #444;",
          "color: #555; font-size: 11px;",
          "color: #555; font-size: 12px;",
          "color: #fff; font-weight: bold; font-size: 12px;",
          "color: #555; font-size: 12px;",
          "color: #38bdf8; font-size: 12px; text-decoration: underline;",
        );
      } catch (error: any) {
        console.error(
          `%c✗ %cError occurred%c · %c${
            error.reason || error.message
          }%c · %c${new Date().toISOString()}`,
          "color: #ff4d4d; font-size: 16px;",
          "color: #ff4d4d; font-weight: bold; font-size: 13px;",
          "color: #444;",
          "color: #ffaa00; font-weight: bold; font-size: 13px;",
          "color: #444;",
          "color: #555; font-size: 11px;",
        );
        continue;
      }
    }
  }
}

seedLPPerEntry()
  .then(() =>
    console.log(
      "%c\n  ──────────────\n    ✔  Done\n  ──────────────\n",
      "color: #00ffaa; font-family: monospace; font-size: 12px; font-weight: bold;",
    ),
  )
  .catch();
