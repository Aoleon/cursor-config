import { SavWorkflowDashboard } from "@/components/sav/SavWorkflowDashboard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

export function SavDashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard SAV</h1>
      </div>

      <SavWorkflowDashboard />
    </div>
  );
}

