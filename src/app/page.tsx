import { redirect } from "next/navigation";

// Server-side redirect to the sign-in page. Doing this on the server (rather than
// a client-side router.replace after the store loads) avoids the cold-start
// "Not Found" flash on platforms that spin the instance down: there is no RSC
// soft-navigation to miss. Signed-in visitors are bounced on to /dashboard by
// the login page's own guard.
export default function Home() {
  redirect("/login");
}
