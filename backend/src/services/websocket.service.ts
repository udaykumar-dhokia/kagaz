export interface WsEvent {
  type: "JOB_CREATED" | "JOB_STATUS_UPDATED" | "JOB_COMPLETED" | "JOB_CANCELLED" | "PING";
  data: any;
}

class WebSocketManager {
  // Map of shopId -> Set of active WebSocket connections
  private shopConnections: Map<string, Set<any>> = new Map();

  registerShopSocket(shopId: string, ws: any) {
    if (!this.shopConnections.has(shopId)) {
      this.shopConnections.set(shopId, new Set());
    }
    this.shopConnections.get(shopId)!.add(ws);
    console.log(`[WS] Shopkeeper connected: ${shopId} (Active sockets: ${this.shopConnections.get(shopId)!.size})`);
  }

  unregisterShopSocket(shopId: string, ws: any) {
    const sockets = this.shopConnections.get(shopId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.shopConnections.delete(shopId);
      }
      console.log(`[WS] Shopkeeper disconnected: ${shopId}`);
    }
  }

  broadcastToShop(shopId: string, event: WsEvent) {
    const sockets = this.shopConnections.get(shopId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    const payload = JSON.stringify(event);
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch (err) {
        console.warn(`[WS] Failed to send message to socket for shop ${shopId}:`, err);
      }
    }
  }

  getActiveShopCount(): number {
    return this.shopConnections.size;
  }
}

export const wsManager = new WebSocketManager();

