import { UsernameForm } from "@/components/form";
import { generateUsername } from "@/lib/generateUser";
import { cookies } from "next/headers";
import { Suspense } from "react";

export default async function Page() {
  const cookieStore = await cookies();
  let userName = cookieStore.get("userName");
  const value = userName ? userName.value : generateUsername();
  console.log("user, home:", value);

  return (
    <Suspense>
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-green-500">
              {">"}private_chat
            </h1>
            <p className="text-zinc-500 text-sm">
              A private, self-destructing proximity chat room.
            </p>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center text-zinc-500">
                  Your Identity
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                    {value}
                  </div>
                </div>
              </div>

              <UsernameForm initialValue={value}></UsernameForm>
            </div>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
