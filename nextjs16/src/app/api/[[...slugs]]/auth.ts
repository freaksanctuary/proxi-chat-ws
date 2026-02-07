import redisClient from "@/lib/redis"
import Elysia from "elysia"
import { cookies } from "next/headers"
class AuthError extends Error {
  status = 401 // attach HTTP status
  constructor(message: string) {
    super(message)
  }
}

export const authMiddleware = new Elysia({ name: "auth" })
  .derive({ as: "scoped" }, async ({ query }) => {
    const cookieStore = await cookies()
    const userName = cookieStore.get('userName')
    const roomId = query.roomId

    if(!userName){
      throw new AuthError("UserName Missing")
    }

    if (!(await redisClient.exists(`meta:${roomId}`)) || (!roomId)) {
      throw new AuthError("Room Id Does not Exist")
    }

    return { auth: { roomId } }
  })
  .error({ AuthError }) // optional, but keeps Elysia aware
  .onError(({ error, status }) => {
    if (error instanceof AuthError) {
      return status(error.status, error.message) // 401 "TokenMissing"
    }
  })
