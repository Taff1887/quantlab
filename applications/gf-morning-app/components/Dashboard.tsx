"use client";
import Header from "./Header";
import FunFactCard from "./FunFactCard";
import NewsCard from "./NewsCard";
import QuizCard from "./QuizCard";
import WeatherCard from "./WeatherCard";
import TransportCard from "./TransportCard";
import CommutePlanner from "./CommutePlanner";
import ExcelFunctionCard from "./ExcelFunctionCard";
import ChoreCountdown from "./ChoreCountdown";
import LifeAdmin from "./LifeAdmin";
import GymTracker from "./GymTracker";
import LastDate from "./LastDate";
import TaffyRating from "./TaffyRating";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Top banner area — full width, no horizontal padding */}
      <FunFactCard />
      <div className="max-w-lg mx-auto pb-2">
        <NewsCard />
      </div>

      <main className="max-w-lg mx-auto px-4 pb-20 space-y-4 mt-4">
        <QuizCard />
        <WeatherCard />
        <TransportCard />
        <CommutePlanner />
        <ExcelFunctionCard />
        <ChoreCountdown />
        <LifeAdmin />
        <GymTracker />
        <LastDate />
        <TaffyRating />
      </main>
    </div>
  );
}
