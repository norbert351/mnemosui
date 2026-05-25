import { Router, type Response } from "express";
import { getSuiNetworkFromHeader, truncateWalletAddress } from "../lib/network";
import { WalrusError, loadMemoryFromWalrus, saveMemoryToWalrus } from "../lib/walrus";
import { validateBlobId, validateSaveMemoryRequestBody } from "../validate";

const router = Router();

function sendWalrusUnavailable(res: Response) {
  res.status(503).json({
    success: false,
    error: "Walrus temporarily unavailable"
  });
}

function truncateBlobId(blobId: string): string {
  return blobId.length > 14 ? `${blobId.slice(0, 6)}...${blobId.slice(-6)}` : blobId;
}

router.post("/save", async (req, res, next) => {
  try {
    const { memory } = validateSaveMemoryRequestBody(req.body);
    const network = getSuiNetworkFromHeader(req.headers["x-sui-network"]);
    console.info("[api/walrus] save requested", { network });
    const blobId = await saveMemoryToWalrus(memory, network);

    console.info("[api/walrus] save complete", { network });
    res.json({ blobId });
  } catch (error) {
    console.error("[api/walrus] save failed", error);
    if (error instanceof WalrusError) {
      sendWalrusUnavailable(res);
      return;
    }

    next(error);
  }
});

router.get("/load/:blobId", async (req, res, next) => {
  try {
    const blobId = validateBlobId(req.params.blobId);
    const network = getSuiNetworkFromHeader(req.headers["x-sui-network"]);
    console.info("[api/walrus] load requested", { network });
    const memory = await loadMemoryFromWalrus(blobId, network);

    res.json({ memory: { ...memory, blobId, saved: true } });
  } catch (error) {
    console.error("[api/walrus] load failed", error);
    if (error instanceof WalrusError) {
      sendWalrusUnavailable(res);
      return;
    }

    next(error);
  }
});

export default router;
