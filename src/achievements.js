export const ACHIEVEMENTS = {
  perfectScore: {
    name: "Perfect Score",
    description: "Completed a lesson with 100% score",
    icon: "★",
    color: "#FFD700",
    xpReward: 50,
    exclusiveTo: ["alg1", "alg2", "geo1", "calc1"] 
  },

  firstTryMaster: {
    name: "First Try Master",
    description: "Solved all problems on first attempt",
    icon: "⚡",
    color: "#00FFFF",
    xpReward: 75,
    exclusiveTo: ["alg1", "alg2", "geo1", "calc1"] 
  },

  speedRunner: {
    name: "Speed Runner",
    description: "Completed lesson in record time",
    icon: "⏱️",
    color: "#FF5555",
    xpReward: 40,
    exclusiveTo: ["alg1", "alg2", "geo1", "calc1"] 
  },

  // NEW ACHIEVEMENTS
  topicMaster: {
    name: "Topic Master",
    description: "Completed all lessons in a topic",
    icon: "🎓",
    color: "#9C27B0",
    xpReward: 100,
    exclusiveTo: null
  },

  streakMaster: {
    name: "Streak Master",
    description: "Completed 5 lessons in a row with 90%+ scores",
    icon: "🔥",
    color: "#FF9800",
    xpReward: 150,
    exclusiveTo: null
  },

  // Algebra Exclusive
  algebraProdigy: {
    name: "Algebra Prodigy",
    description: "Mastered all basic algebra concepts",
    icon: "🧮",
    color: "#4CAF50",
    xpReward: 200,
    exclusiveTo: ["alg1", "alg2", "alg3"] // Only for these lessons
  },

  // Geometry Exclusive
  geometryProdigy: {
    name: "Geometry Prodigy",
    description: "Mastered all basic geometry concepts",
    icon: "🧮",
    color: "#4CAF50",
    xpReward: 200,
    exclusiveTo: ["geo1", "geo2", "geo3"] // Only for these lessons
  },

  // Calculus Exclusive
  CalculusProdigy: {
    name: "Calculus Prodigy",
    description: "Mastered all basic calculus concepts",
    icon: "🧮",
    color: "#4CAF50",
    xpReward: 200,
    exclusiveTo: ["calc1", "calc2", "calc3"] // Only for these lessons
  },
};