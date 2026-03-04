import { AlertTriangle, TrendingUp, Cloud, Users, DollarSign, Lightbulb } from "lucide-react";

const riskCards = [
  {
    title: "Material Price Volatility",
    level: "Medium",
    percentage: 65,
    description: "Steel and concrete prices show 8% increase trend",
    color: "bg-yellow-500",
  },
  {
    title: "Weather Delay Risk",
    level: "Medium",
    percentage: 55,
    description: "15 days potential delay due to seasonal weather",
    color: "bg-yellow-500",
  },
  {
    title: "Labor Shortage Risk",
    level: "Low",
    percentage: 35,
    description: "Adequate skilled labor availability in region",
    color: "bg-green-500",
  },
  {
    title: "Budget Overrun Risk",
    level: "High",
    percentage: 72,
    description: "Current trajectory shows 12% over budget",
    color: "bg-red-500",
  },
];

const optimizationSuggestions = [
  {
    title: "Material Cost Optimization",
    savings: "$45,000",
    description: "Switch to alternative concrete supplier with 8% lower pricing",
    icon: DollarSign,
  },
  {
    title: "Alternative Materials",
    savings: "$28,000",
    description: "Use engineered lumber instead of steel beams where applicable",
    icon: TrendingUp,
  },
  {
    title: "Construction Efficiency",
    savings: "15 days",
    description: "Optimize crane usage schedule to reduce rental period",
    icon: Users,
  },
  {
    title: "Weather Mitigation",
    savings: "$22,000",
    description: "Install temporary weather protection for critical phases",
    icon: Cloud,
  },
];

export function RiskAnalysis() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">AI Risk Analysis</h1>
        <p className="text-muted-foreground">
          Predictive risk assessment and cost optimization recommendations
        </p>
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
                Medium Risk
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                56.75% Risk Index
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
                strokeDasharray={`${56.75 * 3.51} ${100 * 3.51}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold">57%</span>
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
