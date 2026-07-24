import { MapsHeader } from "@/components/layout/MapsHeader";

export default function MapsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <MapsHeader />
      {children}
    </div>
  );
}
