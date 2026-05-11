"use client";
import Header from "./Header";
import NewsCard from "./NewsCard";
import WeatherCard from "./WeatherCard";
import TransportCard from "./TransportCard";
import CommutePlanner from "./CommutePlanner";
import ChoreCountdown from "./ChoreCountdown";
import LifeAdmin from "./LifeAdmin";
import GymTracker from "./GymTracker";
import LastDate from "./LastDate";
import TaffyRating from "./TaffyRating";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-lg mx-auto pb-2">
        <NewsCard />
      </div>
      <main className="max-w-lg mx-auto px-4 pb-20 space-y-4 mt-4">
        <WeatherCard />
        <TransportCard />
        <CommutePlanner />
        <ChoreCountdown />
        <LifeAdmin />
        <GymTracker />
        <LastDate />
        <TaffyRating />
      </main>
    </div>
  );
}
