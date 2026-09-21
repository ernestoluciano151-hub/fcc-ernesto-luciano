import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { LoginForm } from "@/app/login/form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-brand-black px-4">
      <div className="w-full max-w-sm rounded-xl border border-gold-900/40 bg-white p-6 shadow-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-gold-700">Financial Command Center</p>
          <h1 className="mt-1 text-lg font-semibold text-neutral-900">Iniciar sessão</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
