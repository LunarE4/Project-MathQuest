export const ACHIEVEMENTS = {
  // ALGEBRA ACHIEVEMENTS
  stellarArithmeticMaster: {
    name: "Stellar Arithmetic Master",
    description: "Completed Stellar Arithmetic with 80% score",
    icon: "✨",
    color: "#FFD700",
    xpReward: 30,
    exclusiveTo: ["alg0"]
  },

  linearEquationsMaster: {
    name: "Linear Equations Master",
    description: "Completed Linear Equations with 80% score",
    icon: "🧮",
    color: "#00FFFF",
    xpReward: 50,
    exclusiveTo: ["alg1"]
  },

  cosmicDecimalsMaster: {
    name: "Cosmic Decimals Master",
    description: "Completed Cosmic Decimals with 80% score",
    icon: "☄️",
    color: "#FF5555",
    xpReward: 70,
    exclusiveTo: ["alg2"]
  },

  orbitalPercentagesMaster: {
    name: "Orbital Percentages Master",
    description: "Completed Orbital Percentages with 80% score",
    icon: "🛰️",
    color: "#4CAF50",
    xpReward: 90,
    exclusiveTo: ["alg3"]
  },

  algebraProdigy: {
    name: "Algebra Prodigy",
    description: "Mastered all algebra concepts with 80%+ scores",
    icon: "Σ",
    color: "#9C27B0",
    xpReward: 200,
    exclusiveTo: ["alg0", "alg1", "alg2", "alg3"],
    requiresAll: true
  },

  // GEOMETRY ACHIEVEMENTS
  spaceShapesMaster: {
    name: "Space Shapes Master",
    description: "Completed Space Shapes Basics with 80% score",
    icon: "🌠",
    color: "#FFD700",
    xpReward: 30,
    exclusiveTo: ["geo0"]
  },

  threeDSpaceMaster: {
    name: "3D Space Master",
    description: "Completed 3D Space Shapes with 80% score",
    icon: "🛸",
    color: "#00FFFF",
    xpReward: 50,
    exclusiveTo: ["geo1"]
  },

  cosmicShapesMaster: {
    name: "Cosmic Shapes Master",
    description: "Completed Cosmic Shapes with 80% score",
    icon: "🌌",
    color: "#FF5555",
    xpReward: 70,
    exclusiveTo: ["geo2"]
  },

  alienAnglesMaster: {
    name: "Alien Angles Master",
    description: "Completed Alien Angles with 80% score",
    icon: "👽",
    color: "#4CAF50",
    xpReward: 90,
    exclusiveTo: ["geo3"]
  },

  geometryProdigy: {
    name: "Geometry Prodigy",
    description: "Mastered all geometry concepts with 80%+ scores",
    icon: "⎔",
    color: "#9C27B0",
    xpReward: 200,
    exclusiveTo: ["geo0", "geo1", "geo2", "geo3"],
    requiresAll: true
  },

  // CALCULUS ACHIEVEMENTS
  spaceRatesMaster: {
    name: "Space Rates Master",
    description: "Completed Space Rates with 80% score",
    icon: "⏱️",
    color: "#FFD700",
    xpReward: 30,
    exclusiveTo: ["calc0"]
  },

  spacePatternsMaster: {
    name: "Space Patterns Master",
    description: "Completed Space Patterns with 80% score",
    icon: "🌌",
    color: "#00FFFF",
    xpReward: 60,
    exclusiveTo: ["calc1"]
  },

  blackHoleLogicMaster: {
    name: "Black Hole Logic Master",
    description: "Completed Black Hole Logic with 80% score",
    icon: "🕳️",
    color: "#FF5555",
    xpReward: 80,
    exclusiveTo: ["calc2"]
  },

  calculusProdigy: {
    name: "Calculus Prodigy",
    description: "Mastered all calculus concepts with 80%+ scores",
    icon: "∫",
    color: "#9C27B0",
    xpReward: 200,
    exclusiveTo: ["calc0", "calc1", "calc2"],
    requiresAll: true
  },

  // GENERAL ACHIEVEMENTS
  speedRunner: {
    name: "Speed Runner",
    description: "Completed any 3 lessons with 80% score in under 5 minutes each",
    icon: "⏱️",
    color: "#FF9800",
    xpReward: 100,
    exclusiveTo: null
  },

  topicMaster: {
    name: "Topic Master",
    description: "Completed all lessons in one topic with 80%+ scores",
    icon: "🎓",
    color: "#9C27B0",
    xpReward: 150,
    exclusiveTo: null
  },

  cosmicScholar: {
    name: "Cosmic Scholar",
    description: "Completed all lessons across all topics with 80%+ scores",
    icon: "🌠",
    color: "#FFD700",
    xpReward: 500,
    exclusiveTo: null
  }
};
