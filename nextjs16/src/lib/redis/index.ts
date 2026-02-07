import { createRoomScript, cleanupSearchScript} from "./scripts"
import { createClient } from "redis";

declare global {
  var redisClient: ReturnType<typeof createClient> | undefined;
}

let redisClient: ReturnType<typeof createClient>;

if (!global.redisClient) {
  redisClient = createClient({
    url: 'redis://redis:6379',
  });

  redisClient.on("error", (err) => console.error("Redis Client Error", err));

  redisClient.connect();

  // Attach to global for hot reload safety
  if (process.env.NODE_ENV !== "production") global.redisClient = redisClient;
} else {
  redisClient = global.redisClient;
}

export default redisClient;

let CREATE_ROOM_SHA: string | undefined
let CLEANUP_SEARCH_SHA: string | undefined

export async function getCreateRoomSHA () : Promise<string> {

 if (!CREATE_ROOM_SHA) {
    CREATE_ROOM_SHA = await redisClient.scriptLoad(createRoomScript)
  }
  return CREATE_ROOM_SHA
}

export async function cleanupSearchSHA () : Promise<string> {
  if (!CLEANUP_SEARCH_SHA) {
    CLEANUP_SEARCH_SHA = await redisClient.scriptLoad(cleanupSearchScript)
  }
  return CLEANUP_SEARCH_SHA
}

