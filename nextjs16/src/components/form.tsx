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
      action={async (formData: FormData) => {
        await setUsername(formData);
      }}
    >
      <input
        name="userName"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <button type="submit">Save</button>
    </form>
  );
}
