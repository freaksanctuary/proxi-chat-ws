"use client";
import { useState } from "react";
import { setUsername } from "@/lib/username";

type UserNameFormProps = {
  initialValue: string | undefined;
};

export function UsernameForm({ initialValue }: UserNameFormProps) {
  const [name, setName] = useState(initialValue);
  return (
    <form
      className="flex flex-col justify-center items-center px-3 gap-2.5"
      action={async (formData: FormData) => {
        await setUsername(formData);
      }}
    >
      <input
        className="border-amber-100"
        name="userName"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <button
        className="bg-zinc-800 text-amber-50 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        type="submit"
      >
        Save
      </button>
    </form>
  );
}
