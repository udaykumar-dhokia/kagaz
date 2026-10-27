import { describe, expect, it } from "bun:test";
import { wsManager, type WsEvent } from "../websocket.service";

describe("Real-time WebSocket Manager", () => {
  it("registers, broadcasts to, and unregisters shop sockets", () => {
    const shopId = "test-shop-123";
    const messagesReceived: string[] = [];

    const mockSocket = {
      send: (data: string) => {
        messagesReceived.push(data);
      },
    };

    // Register
    wsManager.registerShopSocket(shopId, mockSocket);
    expect(wsManager.getActiveShopCount()).toBeGreaterThanOrEqual(1);

    // Broadcast
    const event: WsEvent = {
      type: "JOB_CREATED",
      data: {
        jobId: "job-abc",
        pickupPin: "4821",
        totalAmount: "24.00",
      },
    };

    wsManager.broadcastToShop(shopId, event);

    expect(messagesReceived.length).toBe(1);
    const parsed = JSON.parse(messagesReceived[0]!);
    expect(parsed.type).toBe("JOB_CREATED");
    expect(parsed.data.pickupPin).toBe("4821");

    // Unregister
    wsManager.unregisterShopSocket(shopId, mockSocket);
  });

  it("does not broadcast to other shops", () => {
    const shopA = "shop-a";
    const shopB = "shop-b";
    const messagesA: string[] = [];
    const messagesB: string[] = [];

    const socketA = { send: (d: string) => messagesA.push(d) };
    const socketB = { send: (d: string) => messagesB.push(d) };

    wsManager.registerShopSocket(shopA, socketA);
    wsManager.registerShopSocket(shopB, socketB);

    wsManager.broadcastToShop(shopA, {
      type: "JOB_CREATED",
      data: { pin: "1111" },
    });

    expect(messagesA.length).toBe(1);
    expect(messagesB.length).toBe(0); // Shop B should not receive Shop A's jobs!

    wsManager.unregisterShopSocket(shopA, socketA);
    wsManager.unregisterShopSocket(shopB, socketB);
  });
});

