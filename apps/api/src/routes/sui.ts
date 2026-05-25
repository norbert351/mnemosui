import { Router } from "express";
import {
  getWalletBalances,
  getWalletOwnedObjects,
  getWalletTransactionHistory
} from "../lib/tatum";
import { getSuiNetworkFromHeader, truncateWalletAddress } from "../lib/network";
import {
  validateWalletHistoryRequestBody,
  validateWalletObjectsRequestBody,
  validateWalletRequestBody
} from "../validate";

const router = Router();

router.post("/history", async (req, res, next) => {
  try {
    const { walletAddress, limit } = validateWalletHistoryRequestBody(req.body);
    const network = getSuiNetworkFromHeader(req.headers["x-sui-network"]);
    console.info("[api/sui] history requested", { limit, network });
    const result = await getWalletTransactionHistory(walletAddress, limit ?? 20, network);

    res.json({ result });
  } catch (error) {
    console.error("[api/sui] history failed", error);
    next(error);
  }
});

router.post("/balances", async (req, res, next) => {
  try {
    const { walletAddress } = validateWalletRequestBody(req.body);
    const network = getSuiNetworkFromHeader(req.headers["x-sui-network"]);
    console.info("[api/sui] balances requested", { network });
    const result = await getWalletBalances(walletAddress, network);

    res.json({ result });
  } catch (error) {
    console.error("[api/sui] balances failed", error);
    next(error);
  }
});

router.post("/objects", async (req, res, next) => {
  try {
    const { walletAddress, cursor, limit } = validateWalletObjectsRequestBody(req.body);
    const network = getSuiNetworkFromHeader(req.headers["x-sui-network"]);
    console.info("[api/sui] objects requested", {
      walletAddress: truncateWalletAddress(walletAddress),
      cursor,
      limit,
      network
    });
    const result = await getWalletOwnedObjects(walletAddress, cursor ?? null, limit ?? 20, network);

    res.json({ result });
  } catch (error) {
    console.error("[api/sui] objects failed", error);
    next(error);
  }
});

export default router;
