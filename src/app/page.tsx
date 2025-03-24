import { Metadata } from "next";
import ClientComponent from "./client-component";

export const metadata: Metadata = {
  title: "Words to Beats",
  description: "Turn your words into beats and music",
};

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-4 text-center">Words to Beats</h1>
      <p className="text-center text-gray-500 mb-8">
        Transform your text into unique musical beats and patterns
      </p>

      <ClientComponent />
    </div>
  );
}
