import { action } from "@daydreamsai/core";
import { z } from "zod";
import { executeSwap as executeAvnuSwap, fetchQuotes } from "@avnu/avnu-sdk";
import { getAllTokensFromAPI } from "../client/ponziland_api";

export const swap = action({
  name: "swap",
  description:
    "Swap tokens using AVNU SDK. Always make sure to check your balances first and use the correct token addresses. Remember you don't need to already own any of the token you are buying, just the token you are selling.",
  schema: {
    sellingAddress: z.string().describe("Token address you are selling"),
    buyingAddress: z.string().describe("Token address you are buying"),
    amount: z
      .string()
      .describe(
        "Amount of token to sell. Remember 1 token = 10^18. Always use the scaled up value. This amount should NEVER be <10^18, unless you are swapping less than a single token."
      ),
  },
  async handler(data, ctx) {
    const tokens = await getAllTokensFromAPI();

    // Validate different tokens
    if (data.sellingAddress === data.buyingAddress) {
      throw new Error("Cannot swap the same token");
    }

    // Find tokens by address
    const sellingToken = tokens.find(
      (token) => BigInt(token.address) === BigInt(data.sellingAddress)
    );
    const buyingToken = tokens.find(
      (token) => BigInt(token.address) === BigInt(data.buyingAddress)
    );

    if (!sellingToken || !buyingToken) {
      throw new Error(
        `Token not found: ${!sellingToken ? "selling token" : "buying token"}`
      );
    }

    try {
      const sellAmount = BigInt(data.amount);

      // Validate amount
      if (sellAmount <= 0) {
        throw new Error("Sell amount must be greater than 0");
      }

      const quoteParams = {
        sellTokenAddress: data.sellingAddress,
        buyTokenAddress: data.buyingAddress,
        sellAmount: sellAmount,
      };

      console.log("Fetching quotes for swap:", {
        from: sellingToken.symbol,
        to: buyingToken.symbol,
        amount: data.amount,
      });

      // Use AVNU SDK's fetchQuotes method
      const baseUrl = "https://api.avnu.fi";
      const quotes = await fetchQuotes(quoteParams, { baseUrl });

      if (!quotes || quotes.length === 0) {
        throw new Error("No quotes available for this swap");
      }

      console.log(`Found ${quotes.length} quotes`);

      // Use the best quote (first one is typically the best)
      const bestQuote = quotes[0];

      if (!bestQuote.buyAmount || BigInt(bestQuote.buyAmount) <= 0) {
        throw new Error("Invalid quote received");
      }

      console.log("Executing swap...");

      // Execute the swap using AVNU SDK
      const swapResult = await executeAvnuSwap(
        ctx.options.account!,
        bestQuote,
        {},
        { baseUrl }
      );

      console.log("Swap executed successfully");

      return {
        success: true,
        transactionHash: swapResult.transactionHash,
        sellToken: sellingToken.symbol,
        buyToken: buyingToken.symbol,
        sellAmount: data.amount,
        buyAmount: bestQuote.buyAmount,
        quoteId: bestQuote.quoteId,
        message: `Successfully swapped ${data.amount} ${sellingToken.symbol} for ${bestQuote.buyAmount} ${buyingToken.symbol}`,
      };
    } catch (error) {
      console.error("Swap failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Swap failed: ${errorMessage}`);
    }
  },
});
