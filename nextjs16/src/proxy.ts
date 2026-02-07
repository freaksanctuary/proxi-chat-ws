import { NextRequest, NextResponse } from "next/server"
import  redisClient from "./lib/redis"

export const proxy = async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname


//room middleware
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/)
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url))

  const roomId = roomMatch[1]

  const meta = await redisClient.hGetAll(
    `meta:${roomId}`
  )

  if (!meta) {
    return NextResponse.redirect(new URL("search/?error=room-not-found", req.url))
  }
   return NextResponse.next()
}

export const config = {
 matcher: "/room/:path*",
}
