import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import aiRoutes from "./routes/ai";
import suiRoutes from "./routes/sui";
import walrusRoutes from "./routes/walrus";

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://mnemosui.vercel.app",
  "https://mnemosui-web.vercel.app",
  frontendOrigin,
].filter(Boolean);

console.info("[cors] allowed origins:", JSON.stringify(allowedOrigins, null, 0));

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn("[cors] blocked origin:", origin);
    return callback(new Error("CORS not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-sui-network"],
}));
app.options("*", cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many requests",
        code: "RATE_LIMITED"
      }
    }
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "MnemoSui API", timestamp: new Date().toISOString() });
});

function keyStatus(name: string): "configured" | "missing" {
  const value = process.env[name];
  return value && value.trim().length > 0 ? "configured" : "missing";
}

function warnMissingConfig() {
  for (const name of ["OPENROUTER_API_KEY", "TATUM_API_KEY"]) {
    if (keyStatus(name) === "missing") {
      console.warn("[api] Missing required environment variable", { name });
    }
  }
  console.info("[api] Network URLs use built-in Sui and Walrus defaults unless env overrides are set");
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    port,
    frontendOrigin,
    allowedOrigins,
    services: {
      openRouter: keyStatus("OPENROUTER_API_KEY"),
      anthropic: keyStatus("ANTHROPIC_API_KEY"),
      tatum: keyStatus("TATUM_API_KEY"),
      testnetRpcUrl: process.env.TATUM_TESTNET_RPC_URL ?? process.env.TATUM_RPC_URL ?? "default",
      mainnetRpcUrl: process.env.TATUM_MAINNET_RPC_URL ?? "default",
      walrusTestnetPublisher: process.env.WALRUS_TESTNET_PUBLISHER_URL ?? process.env.WALRUS_PUBLISHER_URL ?? "default",
      walrusTestnetAggregator: process.env.WALRUS_TESTNET_AGGREGATOR_URL ?? process.env.WALRUS_AGGREGATOR_URL ?? "default",
      walrusMainnetPublisher: process.env.WALRUS_MAINNET_PUBLISHER_URL ?? "default",
      walrusMainnetAggregator: process.env.WALRUS_MAINNET_AGGREGATOR_URL ?? "default"
    }
  });
});

app.use("/api/ai", aiRoutes);
app.use("/api/walrus", walrusRoutes);
app.use("/api/sui", suiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  warnMissingConfig();
  console.info("[api] MnemoSui backend running", {
    port,
    frontendOrigin,
    allowedOrigins,
    openRouterKey: keyStatus("OPENROUTER_API_KEY"),
    anthropicKey: keyStatus("ANTHROPIC_API_KEY"),
    tatumKey: keyStatus("TATUM_API_KEY")
  });
});
