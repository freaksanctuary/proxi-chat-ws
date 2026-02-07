import http from 'http';
import { createClient } from 'redis'
import { WebSocketServer, WebSocket } from 'ws';

import {
  subscribe,
  unsubscribe,
  parseClientMessage,
  publish,
  sendError,
  HEARTBEAT_INTERVAL,
  MAX_MESSAGE_BYTES
} from './lib.js';

const redisClient = createClient({
  url: 'redis://redis:6379',
});

redisClient.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();

const chatRooms = new Map();
const setRoom = (k, v) => chatRooms.set(k, v);
const delRoom = (k) => chatRooms.delete(k);

const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/ws/room', maxPayload: 1024 * 1024 });
//redis send
let SEND_MESSAGE_SHA;
export async function sendMessageSHA () {
  console.log("script load")
  if (!SEND_MESSAGE_SHA) {
      const sendMessageScript = `
      -- KEYS:
      -- 1 = room meta key
      -- 2 = room messages key
      -- 3 = rooms expiry ZSET
      -- ARGV:
      -- 1 = TTL in seconds
      -- 2 = roomId
      -- 3 = new exp
      -- 4 = message

      redis.call("RPUSH", KEYS[2], ARGV[4])
      redis.call("EXPIRE", KEYS[1], ARGV[1])
      redis.call("EXPIRE", KEYS[2], ARGV[1])
      redis.call("ZADD", KEYS[3], ARGV[3], ARGV[2])
      `
    SEND_MESSAGE_SHA = await redisClient.scriptLoad(sendMessageScript)
  }
  return SEND_MESSAGE_SHA
}

const toArgs = (...vals) => vals.map(String);

export const sendMessage = async (roomId, message) => {
  const sha = await sendMessageSHA()
  const TTL = 60
  const NEW_EXP = Date.now() + (TTL*1000)
  const args = toArgs(TTL, roomId, NEW_EXP)
  args.push(JSON.stringify(message))

  await redisClient.evalSha(sha,
    {
      keys: [`meta:${roomId}`, `messages:${roomId}`, "rooms:exp"],
      arguments: args
    }
  )
}

wss.on('connection', (ws) => {
    ws.subscriptions = new Set();
    ws.isAlive = true;

    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', async (buffer) => {
      if (buffer.length > MAX_MESSAGE_BYTES) {
        sendError(ws, 'MAX_BYTE');
        return;
      }

      const data = parseClientMessage(buffer);
      if (!data) {
        sendError(ws, 'BAD_MESSAGE');
        return;
      }

      try {
        switch (data.type) {
          case 'subscribe':
            if (!subscribe(ws, data.roomId, chatRooms.get(data.roomId), setRoom)) {
              sendError(ws, 'RATE_LIMITED', 'Subscription limit reached');
            }
            break;

          case 'unsubscribe':
            unsubscribe(ws, data.roomId, chatRooms.get(data.roomId), delRoom);
            break;

          case 'publish': 
            if (!ws.subscriptions.has(data.roomId)) {
                sendError(ws, 'NOT_SUBSCRIBED', 'Publish denied');
                return;
            }

            try {
                await sendMessage(data.roomId, data.message);
                publish(ws, data.roomId, data.message, chatRooms.get(data.roomId), delRoom);
            } catch (err) {
                console.error('RPUSH failed:', err);
                sendError(ws, 'PERSISTENCE_FAILED', 'Message could not be saved, not broadcasted.');
            }
            break;
        }
      } catch (err) {
        console.error('Handler error:', err);
        sendError(ws, 'INTERNAL');
      }
    });

    ws.on('close', () => {
    if (!ws.subscriptions?.size) return;
      ws.subscriptions.forEach(room => unsubscribe(ws, room, chatRooms.get(room), delRoom));
    });

    ws.on('error', () => ws.terminate());
});

const interval = setInterval(() => {
    wss.clients.forEach(client => {
      const ws = client;
      if (ws.readyState !== WebSocket.OPEN) return;

      if (!ws.isAlive) {
        ws.terminate();
        if (ws.subscriptions?.size) {
            ws.subscriptions.forEach(room =>
            unsubscribe(ws, room, chatRooms.get(room), delRoom)
            );
        }

        return;
      }

      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => clearInterval(interval));

server.listen(8000, '0.0.0.0', () => {

    console.log(`Server is running on port 8000`);
    console.log(`WebSocket Server is running on /ws/room`);
});

async function shutdown() {
  console.log("redis quit")
  wss.clients.forEach(ws => ws.terminate());
  clearInterval(interval);
    
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);