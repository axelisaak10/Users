import { Injectable } from '@nestjs/common';

interface SseClient {
  id: string;
  userId: string;
  res: any;
}

@Injectable()
export class SseService {
  private clients: Map<string, SseClient> = new Map();

  addClient(clientId: string, userId: string, res: any): void {
    console.log('[SSE Service] Adding client:', clientId, 'for user:', userId);
    this.clients.set(clientId, { id: clientId, userId, res });
  }

  removeClient(clientId: string): void {
    console.log('[SSE Service] Removing client:', clientId);
    this.clients.delete(clientId);
  }

  getClient(clientId: string): SseClient | undefined {
    return this.clients.get(clientId);
  }

  getClientsByUserId(userId: string): SseClient[] {
    return Array.from(this.clients.values()).filter((c) => c.userId === userId);
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    const clients = this.getClientsByUserId(userId);
    for (const client of clients) {
      this.sendEvent(client.res, event, data);
    }
  }

  sendEvent(res: any, event: string, data: any): void {
    if (res && !res.writableEnded) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      console.log('[SSE Service] Sending event:', event, 'data:', data);
      res.write(message);
    } else {
      console.log('[SSE Service] Cannot send event, res ended or not writable');
    }
  }

  sendPing(res: any): void {
    if (res && !res.writableEnded) {
      res.write(': ping\n\n');
    }
  }
}
