import { WebSocket } from 'ws';

const HEARTBEAT_INTERVAL = 30_000;
const MAX_SUBSCRIPTIONS_PER_SOCKET = 50;
const MAX_SUBSCRIBERS_PER_ROOM = 1_000;
const MAX_BUFFERED_BYTES = 1_000_000; // 1MB
const MAX_MESSAGE_BYTES = 64 * 1024;

export function sendError(ws, code, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', code, message }));
  }
}

export function isValidRoom(roomId) {
  return typeof roomId === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(roomId);
}

export function parseClientMessage(buffer) {
  try {
    const data = JSON.parse(buffer.toString());
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return null;

    switch (data.type) {
      case 'subscribe':
      case 'unsubscribe':
        return isValidRoom(data.roomId) ? data : null;

      case 'publish':
        if (
          isValidRoom(data.roomId) &&
          data.message &&
          typeof data.message.sender === 'string' &&
          typeof data.message.text === 'string'
        ) {
          return data;
        }
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Subscription management

export function subscribe(ws, room, room_subs, setFn) {
  if (ws.subscriptions.has(room)) return true;
  if (ws.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) return false;

  if (!room_subs) setFn(room, (room_subs = new Set()));

  if (room_subs.size >= MAX_SUBSCRIBERS_PER_ROOM) return false;

  room_subs.add(ws);
  ws.subscriptions.add(room);
  return true;
}

export function unsubscribe(ws, room, room_subs, delFn) {
  if (!room_subs) return;

  room_subs.delete(ws);
  if (!room_subs.size) delFn(room);

  if (ws.subscriptions.has(room)) {
    ws.subscriptions.delete(room);
  }

}

// Publishing

export function publish(senderWs, room, data, room_subs, delFn) {
  if (!room_subs) return;

  const payload = JSON.stringify(data);

  for (const ws of room_subs) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    if (ws.bufferedAmount > MAX_BUFFERED_BYTES) {
      ws.terminate();
      unsubscribe(ws, room, room_subs, delFn);
      continue;
    }

    try {
      ws.send(payload);
    } catch {
      ws.terminate();
      unsubscribe(ws, room, room_subs, delFn);
    }
  }
  
  try {
    senderWs.send(JSON.stringify({
      type: "ack",
    }));
  } catch {}
}


export { HEARTBEAT_INTERVAL, MAX_MESSAGE_BYTES }