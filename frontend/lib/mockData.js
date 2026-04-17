export const getDashboardData = () => ({
  metrics: [
    {
      id: "yield-stability",
      label: "Average Yield Stability",
      value: "94.2",
      unit: "%",
      trend: "up",
      trendValue: "+2.4% vs Q3",
      icon: "trending_up",
      color: "secondary"
    },
    {
      id: "climate-risk",
      label: "Climate Risk Index",
      value: "Low-Med",
      unit: "",
      trend: "neutral",
      trendValue: "Regional variance detected in Latam.",
      icon: "warning",
      color: "tertiary-container"
    },
    {
      id: "genotype-pools",
      label: "Active Genotype Pools",
      value: "1,402",
      unit: "",
      trend: "chart",
      trendValue: "",
      icon: "bubble_chart",
      color: "primary-container",
      chartConfig: [
        { height: "1rem", color: "bg-surface-container-highest" },
        { height: "1.5rem", color: "bg-surface-container-highest" },
        { height: "0.75rem", color: "bg-surface-container-highest" },
        { height: "2rem", color: "bg-secondary" },
        { height: "1.25rem", color: "bg-secondary" },
      ]
    }
  ],
  discoveries: [
    {
      id: "d-1",
      tag: "Trait Isolate",
      tagColor: "bg-secondary-container",
      tagTextColor: "text-on-secondary-container",
      hoverColor: "group-hover:text-secondary",
      time: "2h ago",
      title: "Drought Resistance X-44",
      description: "Isolated sequence showing strong resilience in low-water stress tests.",
      progress: 85,
      progressColor: "bg-secondary"
    },
    {
      id: "d-2",
      tag: "Yield Spike",
      tagColor: "bg-tertiary-fixed",
      tagTextColor: "text-on-tertiary-fixed",
      hoverColor: "group-hover:text-tertiary-container",
      time: "5h ago",
      title: "Hybrid Vigor Anomaly",
      description: "Unexpected positive interaction in Central Hub crossing block.",
      progress: 60,
      progressColor: "bg-tertiary-container"
    }
  ],
  navigation: [
    { label: "Overview", icon: "public", href: "/" },
    { label: "Omics Fusion", icon: "biotech", href: "/omics-fusion" },
    { label: "Scenario Engine", icon: "model_training", href: "/scenario-engine" },
    { label: "Blueprinting", icon: "architecture", href: "/blueprinting" },
  ],
  omicsData: {
    chromosomes: [
      { id: "Chr1", label: "Chromosome 1", coverage: 87, active: true },
      { id: "Chr2", label: "Chromosome 2", coverage: 42, active: false },
      { id: "Chr3", label: "Chromosome 3", coverage: 91, active: false },
    ],
    variants: [
      { name: "Drought Res", type: "SNP", sig: "High" },
      { name: "Heat Tol", type: "InDel", sig: "Med" },
      { name: "Yield Boost", type: "CNV", sig: "High" }
    ],
    params: {
      similarityThreshold: 85,
      mutationRate: 0.02
    },
    enviromics: [
      { year: "2020", temp: 22, precip: 800 },
      { year: "2021", temp: 24, precip: 650 },
      { year: "2022", temp: 23, precip: 700 }
    ]
  },
  scenarioEngine: {
    baseScenarios: [
      { id: "s1", name: "High Heat & Drought", probability: "high" },
      { id: "s2", name: "Flood Risk + Disease", probability: "medium" },
    ],
    results: [
      { parameter: "Average Yield", value: "A-" },
      { parameter: "Water Use Efficiency", value: "B+" },
      { parameter: "Pest Resilience", value: "A" }
    ]
  },
  blueprinting: {
    blueprintId: "Lineage AX-72 x Variant B-901 Optimal Blueprint",
    traits: [
      { name: "Roots Depth +20%", weight: 0.8 },
      { name: "Leaf Curl Delay", weight: 0.6 },
      { name: "Pollen Viability Heat", weight: 0.9 },
    ]
  }
});
