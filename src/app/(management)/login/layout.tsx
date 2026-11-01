import type { ReactNode } from "react";
import "@/themes/argon/auth/auth.css";
import "@/themes/argon/auth/scene.css";
import "@/themes/argon/auth/entry.css";
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="management-root" data-surface="auth">
      {children}
    </div>
  );
}
