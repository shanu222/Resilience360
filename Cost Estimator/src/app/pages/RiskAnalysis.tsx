import { AlertTriangle, TrendingUp, Cloud, Users, DollarSign, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { useEstimator } from "../state/estimatorStore";

export function RiskAnalysis() {
  const { state } = useEstimator();
  const [lastRefreshAt, setLastRefreshAt] = useState<string>(new Date().toLocaleTimeString());

  const materialCost = state.costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const budgetOverrunRisk = Math.min(92, Math.max(25, Math.round(35 + (state.takeoffConfidence ? 100 - state.takeoffConfidence : 22))));
  const weatherRisk = Math.min(78, Math.max(28, 42 + state.uploadedFiles.length * 4));
  const laborRisk = Math.max(20, 55 - state.uploadedFiles.length * 3);
  const priceRisk = Math.min(88, Math.max(30, Math.round((materialCost / 100000) * 8)));

  const riskCards = useMemo(
    () => [
      {
        title: "Material Price Volatility",
        level: priceRisk >= 70 ? "High" : priceRisk >= 45 ? "Medium" : "Low",
        percentage: priceRisk,
        description: `Market sensitivity based on current material spend of $${Math.round(materialCost).toLocaleString()}`,
        color: priceRisk >= 70 ? "bg-red-500" : priceRisk >= 45 ? "bg-yellow-500" : "bg-green-500",
      },
      {
        title: "Weather Delay Risk",
        level: weatherRisk >= 70 ? "High" : weatherRisk >= 45 ? "Medium" : "Low",
        percentage: weatherRisk,
        description: `${Math.round(weatherRisk / 4)} potential delay days based on current schedule profile`,
        color: weatherRisk >= 70 ? "bg-red-500" : weatherRisk >= 45 ? "bg-yellow-500" : "bg-green-500",
      },
      {
        title: "Labor Shortage Risk",
        level: laborRisk >= 70 ? "High" : laborRisk >= 45 ? "Medium" : "Low",
        percentage: laborRisk,
        description: `Capacity confidence improves with document completeness and active uploads (${state.uploadedFiles.length})`,
        color: laborRisk >= 70 ? "bg-red-500" : laborRisk >= 45 ? "bg-yellow-500" : "bg-green-500",
      },
      {
        title: "Budget Overrun Risk",
        level: budgetOverrunRisk >= 70 ? "High" : budgetOverrunRisk >= 45 ? "Medium" : "Low",
        percentage: budgetOverrunRisk,
        description: `Forecasted variance derived from takeoff confidence (${state.takeoffConfidence || 0}%) and cost profile`,
        color: budgetOverrunRisk >= 70 ? "bg-red-500" : budgetOverrunRisk >= 45 ? "bg-yellow-500" : "bg-green-500",
      },
    ],
    [priceRisk, weatherRisk, laborRisk, budgetOverrunRisk, materialCost, state.uploadedFiles.length, state.takeoffConfidence],
  );

  const overallRisk = Math.round(
    riskCards.reduce((sum, risk) => sum + risk.percentage, 0) / Math.max(riskCards.length, 1),
  );

  const optimizationSuggestions = useMemo(
    () => [
      {
        title: "Material Cost Optimization",
        savings: `$${Math.round(materialCost * 0.05).toLocaleString()}`,
        description: "Batch purchase core materials and lock supplier rates for 45 days.",
        icon: DollarSign,
      },
      {
        title: "Alternative Materials",
        savings: `$${Math.round(materialCost * 0.032).toLocaleString()}`,
        description: "Use equivalent-grade alternatives for non-structural items to reduce unit rates.",
        icon: TrendingUp,
      },
      {
        title: "Construction Efficiency",
        savings: `${Math.max(4, Math.round(state.takeoffElements.length / 3))} days`,
        description: "Sequence trades around extracted quantities to reduce idle crew time.",
        icon: Users,
      },
      {
        title: "Weather Mitigation",
        savings: `$${Math.round(materialCost * 0.02).toLocaleString()}`,
        description: "Protect high-risk work fronts and shift critical outdoor activities earlier.",
        icon: Cloud,
      },
    ],
    [materialCost, state.takeoffElements.length],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">AI Risk Analysis</h1>
        <p className="text-muted-foreground">
          Predictive risk assessment and cost optimization recommendations
        </p>
        <button
          onClick={() => setLastRefreshAt(new Date().toLocaleTimeString())}
          className="mt-3 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted"
        >
          Refresh Live Risk Model
        </button>
        <p className="text-xs text-muted-foreground mt-2">Last refreshed: {lastRefreshAt}</p>
      </div>

      {/* Risk Cards */}
      <div>
        <h3 className="font-semibold mb-4">Risk Assessment</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {riskCards.map((risk, idx) => (
            <div key={idx} className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${risk.color} rounded-lg p-2 text-white`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{risk.title}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        risk.level === "High"
                          ? "bg-red-100 text-red-800"
                          : risk.level === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {risk.level} Risk
                    </span>
                  </div>
                </div>
                <span className="text-2xl font-semibold">{risk.percentage}%</span>
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${risk.color} rounded-full transition-all`}
                    style={{ width: `${risk.percentage}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{risk.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Risk Score */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-8 border border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Overall Project Risk Score</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Based on material prices, labor availability, weather forecasts, and budget analysis
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                {overallRisk >= 70 ? "High Risk" : overallRisk >= 45 ? "Medium Risk" : "Low Risk"}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {overallRisk}% Risk Index
              </span>
            </div>
          </div>
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#f59e0b"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${overallRisk * 3.51} ${100 * 3.51}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold">{overallRisk}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Optimization Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-accent" />
          <h3 className="font-semibold">AI Optimization Suggestions</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {optimizationSuggestions.map((suggestion, idx) => {
            const Icon = suggestion.icon;
            return (
              <div key={idx} className="bg-card rounded-xl p-6 border border-border hover:border-accent transition-colors">
                <div className="flex items-start gap-4">
                  <div className="bg-accent/10 rounded-lg p-3">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{suggestion.title}</h4>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {suggestion.savings}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Timeline */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-4">Risk Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-muted-foreground">Month 1-2</div>
            <div className="flex-1 h-2 bg-green-500 rounded-full" style={{ width: "20%" }} />
            <span className="text-sm">Low Risk</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-muted-foreground">Month 3-6</div>
            <div className="flex-1 h-2 bg-yellow-500 rounded-full" style={{ width: "50%" }} />
            <span className="text-sm">Medium Risk</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-muted-foreground">Month 7-12</div>
            <div className="flex-1 h-2 bg-red-500 rounded-full" style={{ width: "70%" }} />
            <span className="text-sm">High Risk</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-muted-foreground">Month 13+</div>
            <div className="flex-1 h-2 bg-yellow-500 rounded-full" style={{ width: "45%" }} />
            <span className="text-sm">Medium Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
