import { login, signup } from "./actions";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>

      <form className="space-y-3 rounded border p-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" required className="w-full rounded border px-3 py-2" />
        </div>

        <div className="flex gap-2">
          <button formAction={login} className="rounded bg-black px-4 py-2 text-white">
            Log in
          </button>
          <button formAction={signup} className="rounded border px-4 py-2">
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
