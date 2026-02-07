import RoomPage from "@/components/rooms";
import { cookies } from "next/headers";
export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const cookieStore = await cookies();
  const userName = cookieStore.get("userName");

  return <RoomPage roomId={roomId} userName={userName?.value} />;
}
