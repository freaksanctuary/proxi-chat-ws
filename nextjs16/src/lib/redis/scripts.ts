const createRoomScript = `-- KEYS:
-- 1 = rooms:geo
-- 2 = rooms:expiry
-- 3 = room:{id}:meta
-- ARGV:
-- 1 = roomId
-- 2 = longitude
-- 3 = latitude
-- 4 = createdAt
-- 5 = expireAt

-- Add room to geo index
redis.call("GEOADD", KEYS[1], ARGV[2], ARGV[3], ARGV[1])

-- Register expiry time
redis.call("ZADD", KEYS[2], ARGV[5], ARGV[1])

-- Create room metadata
redis.call("HSET", KEYS[3], "createdAt", ARGV[4]
)

return 1`


const cleanupSearchScript = `local geoKey = KEYS[1]
local expKey = KEYS[2]

local lon = tonumber(ARGV[1])
local lat = tonumber(ARGV[2])
local radius = tonumber(ARGV[3])
local unit = ARGV[4]


-- Redis server time (ms)
local redisTime = redis.call("TIME")
local now = tonumber(redisTime[1]) * 1000

local expired = redis.call(
  "ZRANGEBYSCORE",
  expKey,
  "-inf",
  now
)

for _, roomId in ipairs(expired) do
  redis.call("ZREM", expKey, roomId)
  redis.call("ZREM", geoKey, roomId)
end

return redis.call(
  "GEOSEARCH",
  geoKey,
  "FROMLONLAT", lon, lat,
  "BYRADIUS", radius, unit,
  "WITHDIST"
)`



export { createRoomScript, cleanupSearchScript }