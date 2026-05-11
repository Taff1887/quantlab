import Dashboard from "@/components/Dashboard";
import PinGate from "@/components/PinGate";

export default function Home() {
  return (
    <PinGate>
      <Dashboard />
    </PinGate>
  );
}
