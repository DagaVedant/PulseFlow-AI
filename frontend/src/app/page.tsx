/* Root route that redirects to the Command Center. */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/command-center");
}
