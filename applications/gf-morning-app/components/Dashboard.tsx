"use client";
import Header from "./Header";
import QuoteCard from "./QuoteCard";
import WeatherCard from "./WeatherCard";
import TransportCard from "./TransportCard";
import Schedule from "./Schedule";
import CommutePlanner from "./CommutePlanner";
import ChoreCountdown from "./ChoreCountdown";
import LifeAdmin from "./LifeAdmin";
import GymTracker from "./GymTracker";
import LastDate from "./LastDate";

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
