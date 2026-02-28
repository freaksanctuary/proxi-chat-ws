import redisClient from "./index";
import { getCreateRoomSHA, cleanupSearchSHA } from "./index";
import { TTL, ROOMS } from "./keys";

interface NearbyRoomsProps {
  latitude: number;
  longitude: number;
  radius: number;
}

interface CreateRoomProps {
  creator: string;
  roomId: string;
  lon: number;
  lat: number;
}

const toArgs = (...vals: (string | number)[]) => vals.map(String);

const getNearbyRooms = async ({
  latitude,
  longitude,
  radius,
}: NearbyRoomsProps) => {
  const sha = await cleanupSearchSHA();
  try {
    const raw = await redisClient.evalSha(sha, {
      keys: [ROOMS.GEO, ROOMS.EXP],
      arguments: toArgs(longitude, latitude, radius, "m"),
    });

    console.log("RAW:", raw);
    const nearbyRooms = (raw as any[]).map(
      ([roomId, distance, values]: [string, string, string[]]) => {
        // unpack the HVALS array
        const [creator, userCountStr] = values;

        return {
          roomId,
          distance: Number(distance), // convert string distance to number
          creator,
          userCount: Number(userCountStr ?? 0), // convert userCount to number
        };
      },
    );

    console.log(nearbyRooms);

    return nearbyRooms;
  } catch (err) {
    console.error("REDIS ERROR:", err);
    throw err;
  }
};

const createRoom = async ({ creator, roomId, lon, lat }: CreateRoomProps) => {
  const sha = await getCreateRoomSHA();

  await redisClient.evalSha(sha, {
    keys: [ROOMS.GEO, ROOMS.EXP, `room:${roomId}`],
    arguments: toArgs(
      creator,
      roomId,
      lon,
      lat,
      Date.now(),
      Date.now() + TTL.INACTIVE_MS,
    ),
  });
};

export { getNearbyRooms, createRoom };
