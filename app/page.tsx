// src/app/menu/page.tsx
import { createClient } from "@/lib/supabase/server";
import DQMenu from "./DQMenu";

export const metadata = {
  title: "oktm's Adventure Log",
};

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  return <DQMenu isLoggedIn={!!user} />;
}
