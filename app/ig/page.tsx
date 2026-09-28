import type { Metadata } from "next";
import { Navbar } from "./navbar";
import { Hero } from "./hero";

export const metadata: Metadata = { title: "인스타그램 광고 랜딩" };

export default function IgLandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
    </>
  );
}
