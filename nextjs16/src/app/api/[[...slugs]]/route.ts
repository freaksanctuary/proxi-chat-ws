import  redisClient from "@/lib/redis/index"
import { Elysia, t } from "elysia"
import { authMiddleware } from "./auth"
import { z } from "zod"
import { createRoom, getNearbyRooms } from "@/lib/redis/func"
import crypto from 'crypto'

type Message = {
  id: string,
  sender: string
  text: string
  timestamp:number
  roomId:string
  token?: string
}

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async ({ body }) => {
    const roomId = crypto.randomUUID()
    const { location } = body

    await createRoom({
      lon: location.longitude,
      lat: location.latitude,
      roomId: roomId
    })

    return { roomId }
  }, 
  {
    body: z.object({
      location: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90)
      })
    }),
  })
  .get("search", async ({query}) => {
    const { latitude, longitude } = query

    const nearbyRooms = await getNearbyRooms({
      latitude: latitude,
      longitude: longitude,
      radius: 200
    })

    return { nearbyRooms }
  },
  {
    query: t.Object({
      latitude: t.Numeric(),   // Converts string to number automatically
      longitude: t.Numeric(),  // Converts string to number automatically
      radius: t.Optional(t.Numeric({ default: 5 }))
    })
  })


const messages = new Elysia({ prefix: "/messages", })
  .use(authMiddleware)
  .get(
    "/",
    async ({ auth }) => {
      const messagesStr = (await redisClient.lRange(`messages:${auth.roomId}`, 0, -1)) ?? [];
      const messages: Message[] = messagesStr.map((m) => JSON.parse(m) as Message);

      return {
        messages,
      };
    },
    { query: z.object({ roomId: z.string() }) }
  )


const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages)

export const GET = app.fetch
export const POST = app.fetch
export const DELETE = app.fetch

export type App = typeof app


