'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'


export async function setUsername(formData: FormData) {
  const username = formData.get('userName') as string
  if (!username) return

  const cookieStore = await cookies()
  cookieStore.set({
    name: 'userName',
    value: username,
    httpOnly: true,
    path: '/',
  })

  redirect('/search')

}

