import { PawPrint } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import login from "@/assets/images/login.jpg";

export function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-br-[400px] lg:block">
        <img
          src={login}
          alt="Login"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-end">
          <div className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PawPrint className="size-4" />
            </div>
            PawCare HMS
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground space-y-0.5">
          <p>© 2026 PawCare HMS · All rights reserved</p>
          <p>Powered by InnoWhiZ · contact@innowhiz.lk · 071 637 8320</p>
        </div>
      </div>
    </div>
  );
}
