import { getCurrentUser, hasUsers } from "@/app/actions/auth";
import { getSettings } from "@/app/actions/auth/settings";
import { HomeClient } from "@/components/home/home-client";
import { redirect } from "next/navigation";

const DEFAULT_WALLPAPER = "/wallpapers/14.jpg";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const usersExist = await hasUsers();
  if (!usersExist) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const settings = await getSettings();
  const wallpaper = settings.currentWallpaper ?? DEFAULT_WALLPAPER;

  return <HomeClient initialWallpaper={wallpaper} />;
}
