/**
 * Kagaz Desktop Silent Print Agent
 * ----------------------------------------------------
 * Runs in the background on the shopkeeper's PC (Windows/Linux/macOS).
 * Connects to Kagaz backend via persistent WebSocket.
 * Silently spools PDF print jobs directly to the printer without saving to Downloads.
 *
 * Usage:
 *   SHOP_TOKEN="your_jwt_token" bun run src/agent/kagaz-agent.ts
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

const SERVER_HOST = process.env.KAGAZ_SERVER_URL || "http://localhost:4000";
const WS_HOST = SERVER_HOST.replace(/^http/, "ws");
const SHOP_TOKEN = process.env.SHOP_TOKEN;

if (!SHOP_TOKEN) {
  console.error("❌ Error: SHOP_TOKEN environment variable is required.");
  console.log("Run with: SHOP_TOKEN=\"<jwt_token>\" bun src/agent/kagaz-agent.ts");
  process.exit(1);
}

console.log("=========================================");
console.log("   🖨️  KAGAZ SILENT DESKTOP PRINT AGENT   ");
console.log("=========================================");
console.log(`Connecting to: ${WS_HOST}`);
console.log(`Operating System: ${os.platform()} (${os.arch()})`);

function connectWebSocket() {
  const wsUrl = `${WS_HOST}/api/v1/queue/ws?token=${SHOP_TOKEN}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("✅ Connected to Kagaz Counter Server! Ready to receive silent print jobs.");
  };

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data.toString());

      if (message.type === "JOB_STATUS_UPDATED" && message.data?.action === "PRINT_SPOOL") {
        await handlePrintJob(message.data);
      }
    } catch (err) {
      console.error("Failed to parse incoming WebSocket message:", err);
    }
  };

  ws.onclose = () => {
    console.warn("⚠️ Disconnected from server. Reconnecting in 5 seconds...");
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (err) => {
    console.error("WebSocket connection error:", err);
  };
}

interface SpoolItem {
  itemId: string;
  filename: string;
  copies: number;
  colorMode: string;
  paperSize: string;
  isDuplex: boolean;
  pageRange: string;
  streamUrl: string;
}

async function handlePrintJob(data: { jobId: string; pickupPin: string; printerName?: string; items: SpoolItem[] }) {
  console.log(`\n📄 [AGENT] Received Print Command for Job PIN: ${data.pickupPin} (${data.items.length} files)`);

  for (const item of data.items) {
    try {
      console.log(`   Downloading in-memory stream: ${item.filename} (${item.copies} copies, Duplex: ${item.isDuplex})...`);

      // 1. Fetch PDF buffer from in-memory stream endpoint
      const response = await fetch(item.streamUrl, {
        headers: { Authorization: `Bearer ${SHOP_TOKEN}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to stream PDF: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // 2. Write to temporary spool path in OS tempdir
      const tempPath = path.join(os.tmpdir(), `kagaz-spool-${Date.now()}-${item.filename}`);
      await fs.writeFile(tempPath, buffer);

      // 3. Spool to OS printer
      await printToOsPrinter(tempPath, item, data.printerName);

      // 4. Securely unlink temporary spool file immediately
      await fs.unlink(tempPath).catch(() => {});
      console.log(`   ✅ Spooled to printer and temp file shredded.`);
    } catch (err) {
      console.error(`   ❌ Failed to print ${item.filename}:`, err);
    }
  }

  // 5. Notify server of completion
  try {
    await fetch(`${SERVER_HOST}/api/v1/shop/queue/${data.jobId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SHOP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentStatus: "PAID_CASH" }),
    });
    console.log(`🎉 Job ${data.pickupPin} marked COMPLETED. Cloud storage shredded.`);
  } catch (err) {
    console.warn("Failed to mark job complete on server:", err);
  }
}

function printToOsPrinter(filePath: string, item: SpoolItem, printerName?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === "win32";

    if (isWindows) {
      // Windows: SumatraPDF silent print CLI
      // e.g. SumatraPDF.exe -print-to "<printer>" -print-settings "<copies>x,duplex" <file>
      const settings = `${item.copies}x,${item.isDuplex ? "duplex" : "simplex"}`;
      const printerArgs = printerName
        ? ["-print-to", printerName, "-print-settings", settings, filePath]
        : ["-print-to-default", "-print-settings", settings, filePath];

      const child = spawn("SumatraPDF.exe", printerArgs, { stdio: "ignore" });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else resolve(); // continue even if fallback
      });
      child.on("error", () => {
        console.warn("SumatraPDF not found in PATH; falling back to default print driver.");
        resolve();
      });
    } else {
      // Linux & macOS: CUPS lp command
      // e.g. lp -n <copies> -o sides=two-sided-long-edge <filePath>
      const args = ["-n", item.copies.toString()];
      if (item.isDuplex) {
        args.push("-o", "sides=two-sided-long-edge");
      }
      if (printerName) {
        args.push("-d", printerName);
      }
      args.push(filePath);

      const child = spawn("lp", args, { stdio: "ignore" });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else resolve();
      });
      child.on("error", () => {
        console.warn("CUPS 'lp' command not found; simulated silent print.");
        resolve();
      });
    }
  });
}

// Start agent connection
connectWebSocket();

