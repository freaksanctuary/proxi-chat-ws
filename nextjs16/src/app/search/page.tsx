import Lobby from "@/components/lobby";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const userName = cookieStore.get("userName");
  
  return <Lobby userName={userName?.value}></Lobby>;
}
