const createRoomScript = `-- KEYS:
-- 1 = rooms:geo
-- 2 = rooms:exp
-- 3 = room:{id}
-- ARGV:
-- 1 = user
-- 2 = roomId
-- 3 = longitude 
-- 4 = latitude 
-- 5 = expireAt

-- Add room to geo index
redis.call("GEOADD", KEYS[1], ARGV[3], ARGV[4], ARGV[2])

-- Register expiry time
redis.call("ZADD", KEYS[2], ARGV[5], ARGV[2])

-- Create room metadata
redis.call("HSET", KEYS[3], "creator", ARGV[1], "userCount", 1)

return 1`;

const cleanupSearchScript = `local geoKey = KEYS[1]
local expKey = KEYS[2]

local lon = tonumber(ARGV[1])
local lat = tonumber(ARGV[2])
local radius = tonumber(ARGV[3])
local unit = ARGV[4]


-- Redis server time (ms)
local redisTime = redis.call("TIME")
local now = tonumber(redisTime[1]) * 1000

-- Get expired rooms
local expired = redis.call(
  "ZRANGEBYSCORE",
  expKey,
  "-inf",
  now
)

-- Remove expired from both sets
for _, roomId in ipairs(expired) do
  redis.call("ZREM", expKey, roomId)
  redis.call("ZREM", geoKey, roomId)
end

-- Search nearby rooms
local rooms = redis.call(
  "GEOSEARCH",
  geoKey,
  "FROMLONLAT", lon, lat,
  "BYRADIUS", radius, unit,
  "WITHDIST"
)

local result = {}
for _, pair in ipairs(rooms) do
  local roomKey = "room:" .. pair[1]
  local hashData = redis.call("HMGET", roomKey, "creator", "userCount")

  table.insert(result, {
    pair[1],
    pair[2],
    hashData,
  })
end

return result
`;

export { createRoomScript, cleanupSearchScript };
