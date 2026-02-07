import redisClient from './index'
import { getCreateRoomSHA, cleanupSearchSHA} from './index'
import { TTL, ROOMS } from './keys'

interface NearbyRoomsProps {
  latitude: number
  longitude: number
  radius: number
}

interface CreateRoomProps {
    roomId: string,
    lon: number;
    lat: number;
}

const toArgs = (...vals: (string | number)[]) => vals.map(String);

const getNearbyRooms = async ({latitude, longitude, radius}: NearbyRoomsProps) => {
  const sha = await cleanupSearchSHA()

  const raw = await redisClient.evalSha(
    sha, {
    keys: [ROOMS.GEO, ROOMS.EXP],
    arguments: toArgs(longitude, latitude, radius, "m")
  }
  )

  const nearbyRooms = (raw as any[]).map(
    ([roomId, distance]) => ({
      roomId,
      distance: Number(distance)
    })
  )
  return nearbyRooms
}

const createRoom = async ({roomId, lon, lat}: CreateRoomProps) => {
    const sha = await getCreateRoomSHA()

    await redisClient.evalSha(
        sha,
        { keys: [ROOMS.GEO, ROOMS.EXP, `meta:${roomId}`],
          arguments: toArgs(roomId, lon, lat, Date.now(), Date.now() + TTL.INACTIVE_MS)
        }
    )
}


export { getNearbyRooms, createRoom }