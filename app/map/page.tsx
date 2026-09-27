import type { Metadata } from "next";
import { MapPicker } from "./map-picker";

export const metadata: Metadata = { title: "촬영 장소" };

export default async function MapPage({
  searchParams,
}: PageProps<"/map">) {
  const { q } = await searchParams;
  const address = Array.isArray(q) ? q[0] : (q ?? "");

  if (!address) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted text-sm">주소 정보가 없습니다.</p>
      </main>
    );
  }

  return (
    <main>
      <MapPicker address={address} />
    </main>
  );
}
