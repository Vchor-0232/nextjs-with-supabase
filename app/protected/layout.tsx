import { AppChrome } from "@/components/home/app-chrome";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}
