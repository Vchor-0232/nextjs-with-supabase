import { AuthShell } from "@/components/auth/auth-ui";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <AuthShell tagline="Last step: pick a new password.">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
