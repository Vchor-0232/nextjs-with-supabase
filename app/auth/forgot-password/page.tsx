import { AuthShell } from "@/components/auth/auth-ui";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <AuthShell tagline="Reset your password in 3 quick steps.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
