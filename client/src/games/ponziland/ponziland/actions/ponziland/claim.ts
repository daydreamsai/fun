import { input, context } from "@daydreamsai/core";

import { z } from "zod";
import { CallData } from "starknet";
import type { Call } from "starknet";
import { decodeTokenTransferEvents } from "../../utils/utils";
import {
  get_owned_lands,
  get_lands_str,
  get_balances_str,
} from "../../utils/querys";
import { CONTEXT } from "../../contexts/ponziland-context";

import ponziland_manifest from "../../../contracts/ponziland_manifest_mainnet.json";
import { useSettingsStore } from "@/store/settingsStore";
import { provider } from "../../ponziland";

// Import the ponzilandContext from the main ponziland file
const ponzilandContext = context({
  type: "ponziland",
  schema: z.object({
    id: z.string(),
    lands: z.string(),
    goal: z.string(),
    balance: z.string(),
    context: z.string(),
    personality: z.string(),
  }),
  key({ id }) {
    return id;
  },
});

export const claim_all = () =>
  input({
    schema: z.object({
      text: z.string(),
    }),
    subscribe(send, { container }) {
      const { cartridgeAccount } = useSettingsStore.getState();
      let index = 0;
      let timeout: ReturnType<typeof setTimeout>;

      // Function to schedule the next claim with random timing
      const scheduleNextClaim = async () => {
        // Random delay between 2 and 6 hours (7200000-21600000 ms)
        const minDelay = 1800000; // 30 minutes
        const maxDelay = 3600000; // 60 minutes
        const randomDelay =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        console.log(`Scheduling next claim in ${randomDelay / 3600000} hours`);

        timeout = setTimeout(async () => {
          try {
            let calls = [];

            let estark_address =
              "0x056893df1e063190aabda3c71304e9842a1b3d638134253dd0f69806a4f106eb";
            let ponziland_address = ponziland_manifest.contracts[0].address;

            let lands = await get_owned_lands();

            if (!lands || lands.length === 0) {
              console.log("No lands owned, skipping claim");
              scheduleNextClaim();
              return;
            }

            let locations = lands.map((land: any) => land.location);

            let claim_call: Call = {
              contractAddress: ponziland_address,
              entrypoint: "claim_all",
              calldata: CallData.compile({ locations: locations }),
            };
            calls.push(claim_call);

            let res = await cartridgeAccount?.execute(calls);

            const response = await provider.waitForTransaction(
              res?.transaction_hash!
            );

            let transfers = await decodeTokenTransferEvents(response);

            if (!transfers) {
              transfers = [
                {
                  token: "No transfers. Do you own any lands?",
                  name: "No transfers. Do you own any lands?",
                  amount: "No transfers. Do you own any lands?",
                },
              ];
            }

            const claimResult = `Claimed taxes from ${locations.length} lands. TX: ${res?.transaction_hash} - Status: ${response.statusReceipt} - Transfers: ${JSON.stringify(transfers)}`;

            console.log("Claim completed: " + claimResult);

            // Get current state for ponzilandContext
            let goal = "Get lands for you team in PonziLand";
            let landsStr = await get_lands_str(cartridgeAccount?.address!);
            let balance = await get_balances_str();
            let guide = await CONTEXT();

            // TODO: IDK WHAT HAPPENNED HERE
            let personality = "";

            send(
              ponzilandContext,
              {
                id: "ponziland-claim-" + index,
                lands: landsStr,
                goal: goal,
                balance: balance,
                personality: personality,
                context: `Just claimed taxes! ${claimResult}. ${guide}`,
              },
              { text: claimResult }
            );

            index += 1;
          } catch (error) {
            console.error("Error during claim:", error);
          }

          // Schedule the next claim
          scheduleNextClaim();
        }, randomDelay);
      };

      // Start the first claim cycle
      scheduleNextClaim();

      return () => clearTimeout(timeout);
    },
  });
