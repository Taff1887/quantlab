"use client";
import Header from "@/components/Header";
import QuoteCard from "@/components/QuoteCard";
import WeatherCard from "@/components/WeatherCard";
import TransportCard from "@/components/TransportCard";
import Schedule from "@/components/Schedule";
import CommutePlanner from "@/components/CommutePlanner";
import ChoreCountdown from "@/components/ChoreCountdown";
import LifeAdmin from "@/components/LifeAdmin";
import GymTracker from "@/components/GymTracker";
import LastDate from "@/components/LastDate";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-lg mx-auto pb-2">
        <QuoteCard />
      </div>
      <main className="max-w-lg mx-auto px-4 pb-20 space-y-4 mt-4">
        <WeatherCard />
        <TransportCard />
        <Schedule />
        <CommutePlanner />
        <ChoreCountdown />
        <LifeAdmin />
        <GymTracker />
        <LastDate />
      </main>
    </div>
  );
}
