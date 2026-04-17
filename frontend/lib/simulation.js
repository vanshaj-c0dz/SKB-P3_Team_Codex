export const runSimulation = async (inputData) => {
  // Simulate network delay and AI processing (ingestion, prediction, simulation, XAI)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        best_genotype_id: "Plant_Variant_12",
        climate_resilience_score: 88.5,
        baseline_yield: 3450,
        xai_insights: {
          top_positive_genes: ["rs104", "rs992"],
          fatal_weather_days: [
            "Day 260 (Heatwave)",
            "Day 265 (Low Humidity)"
          ]
        },
        agronomic_blueprint: [
          "Apply 15% extra Potassium to improve water retention.",
          "Delay sowing by 10 days to avoid heat during flowering stage."
        ]
      });
    }, 2500); // 2.5 seconds mock delay
  });
};
