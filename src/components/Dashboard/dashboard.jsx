import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/init';
import './dashboard.css';
import { ACHIEVEMENTS } from './achievements';

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('progress');
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            
            // Check for completion data in route state
            if (location.state?.lessonCompleted) {
              setCompletionData({
                ...location.state,
                achievements: location.state.achievements
              });
              setShowCompletion(true);
              
              // Clear the state to prevent showing again on refresh
              navigate(location.pathname, { replace: true, state: {} });
            }
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadUserData();
  }, [user, location.state, navigate, location.pathname, lastUpdate]);

  const handleTabChange = useCallback((tab) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
  }, [activeTab]);

  const progressData = useMemo(() => {
    if (!userData) return null;
  
    // Get XP from userData
    const currentXP = userData.xp || userData.totalXP || 0; 
  
    // Calculate level based on XP (300 XP per level)
    const level = Math.floor(currentXP / 300) + 1;
    const xpForNextLevel = level * 300;
    const xpInCurrentLevel = currentXP % 300;
    const levelProgress = (xpInCurrentLevel / 300) * 100;
  
    // Format streak
    const formatStreak = () => {
      if (!userData.streak) return "1 Day";
      return `${userData.streak} day${userData.streak !== 1 ? 's' : ''}`;
    };
  
    // Calculate skill percentages (assuming 0-5 scale)
    const calculateSkillPercentage = (skillValue) => {
      const maxSkill = 5; // Assuming skills are rated 0-5
      return Math.round(((skillValue || 0) / maxSkill) * 100);
    };
  
    // Calculate overall progress (average of all skills)
    const calculateOverallProgress = () => {
      if (!userData.completedLessons) return 0;
      
      const totalLessons = {
        algebra: 4,
        geometry: 3,
        calculus: 3
      };
      
      // Count completed lessons
      const completedCount = Object.keys(userData.completedLessons).length;
      
      // Calculate total available lessons
      const totalAvailable = Object.values(totalLessons).reduce((sum, val) => sum + val, 0);
      
      return Math.round((completedCount / totalAvailable) * 100);
    };
  
    // Calculate progress by topic
    const calculateTopicProgress = () => {
      const defaultTopics = {
        algebra: { 
          completed: 0, 
          total: 4,  // Total algebra lessons
          xp: 0, 
          avgScore: 0,
          lessonsCompleted: []
        },
        geometry: { 
          completed: 0, 
          total: 3,  // Total geometry lessons
          xp: 0, 
          avgScore: 0,
          lessonsCompleted: []
        },
        calculus: { 
          completed: 0, 
          total: 3,  // Total calculus lessons
          xp: 0, 
          avgScore: 0,
          lessonsCompleted: []
        }
      };
    
      if (!userData.completedLessons) return defaultTopics;
    
      const topics = { ...defaultTopics };
    
      Object.entries(userData.completedLessons).forEach(([lessonId, lessonData]) => {
        const topic = lessonData.topic || 'algebra'; // Default to algebra if not specified
        if (topics[topic]) {
          topics[topic].completed++;
          // Sum the XP earned from each lesson in this topic
          topics[topic].xp += lessonData.xpEarned || 0;
          topics[topic].lessonsCompleted.push({
            score: lessonData.finalScore || 0,
            id: lessonId,
            xp: lessonData.xpEarned || 0  // Store individual lesson XP
          });
        }
      });
    
      // Calculate averages
      Object.keys(topics).forEach(topic => {
        const topicData = topics[topic];
        
        if (topicData.completed > 0) {
          const totalScore = topicData.lessonsCompleted.reduce(
            (sum, lesson) => sum + lesson.score, 
            0
          );
          topicData.avgScore = Math.round(totalScore / topicData.completed);
        }
        
        topicData.completionPercent = Math.round(
          (topicData.completed / topicData.total) * 100
        );
      });

      return topics;
    };
  
    return {
      xp: currentXP,
      level,
      xpForNextLevel,
      xpInCurrentLevel,
      levelProgress,
      streak: formatStreak(),
      skills: {
        algebra: calculateSkillPercentage(userData.skills?.algebra),
        geometry: calculateSkillPercentage(userData.skills?.geometry),
        calculus: calculateSkillPercentage(userData.skills?.calculus),
      },
      overallProgress: calculateOverallProgress(),
      byTopic: calculateTopicProgress()
    };
  }, [userData]);

  // Format completed lessons for display
  const completedLessons = useMemo(() => {
    if (!userData?.completedLessons) return [];
    
    return Object.entries(userData.completedLessons).map(([id, lesson]) => ({
      id,
      title: lesson.lessonTitle || id,
      score: lesson.finalScore,
      date: lesson.completedAt?.toDate() || new Date(),
      timeTaken: lesson.timeTaken
    })).sort((a, b) => b.date - a.date);
  }, [userData]);

  // Format achievements for display
  const achievements = useMemo(() => {
    if (!userData?.achievements) return [];
    
    return Object.entries(ACHIEVEMENTS).map(([id, ach]) => ({
      ...ach,
      unlocked: userData.achievements[id]?.unlocked || false,
      date: userData.achievements[id]?.date?.toDate?.() || null
    }));
  }, [userData]);

  if (loading) {
    return <div className="loading-screen cosmic">Loading cosmic data...</div>;
  }

  return (
    <div className="dashboard cosmic-theme">
      <header className="dashboard-header">
        <div className="welcome-banner">
          <h1>Welcome back, <span className="username">{user?.displayName?.split(' ')[0]}!</span></h1>
          <p className="subtitle">Ready for today's cosmic math journey?</p>
          <div className="cosmic-decoration">
            <span className="moon">🌖</span>
            {/* Bright stars */}
            <div className="star star-1" style={{ top: '25%', left: '20%' }}></div>
            <div className="star star-2" style={{ top: '35%', left: '80%' }}></div>
            
            {/* Medium stars */}
            <div className="star star-3" style={{ top: '40%', left: '30%' }}></div>
            <div className="star star-3" style={{ top: '70%', left: '20%' }}></div>
            <div className="star star-3" style={{ top: '40%', left: '75%' }}></div>
            
            {/* Distant stars */}
            <div className="star distant" style={{ top: '10%', left: '50%' }}></div>
            <div className="star distant" style={{ top: '85%', left: '60%' }}></div>
          </div>
        </div>
        <div className="user-stats">
          <StatCard icon="🌕" label="Level" value={progressData?.level || 1} color="#8e8e93" />
          <StatCard icon="⭐" label="XP" value={progressData?.xp?.toLocaleString() || '0'} color="#aeaeb2" />
          <StatCard icon="☄️" label="Streak" value={progressData?.streak || "0 Days"} color="#636366" />
        </div>
      </header>
      
      <nav className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => handleTabChange('progress')}
        >
          <span className="tab-icon">🛰️</span>
          <span className="tab-label">Progress</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => handleTabChange('lessons')}
        >
          <span className="tab-icon">📡</span>
          <span className="tab-label">Lessons</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => handleTabChange('achievements')}
        >
          <span className="tab-icon">🏆</span>
          <span className="tab-label">Achievements</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabChange('activity')}
        >
          <span className="tab-icon">🛸</span>
          <span className="tab-label">Activity</span>
        </button>
      </nav>

      <div className="tab-content">
        {activeTab === 'progress' && <ProgressTab progressData={progressData} />}
        {activeTab === 'lessons' && <LessonsTab completedLessons={progressData.completedLessons} />}
        {activeTab === 'achievements' && <AchievementsTab achievements={achievements} />}
        {activeTab === 'activity' && <ActivityTab completedLessons={completedLessons} />}
      </div>
    </div>
  );
}

// TotalProgress Function Component
function TopicProgress({ topicData = {} }) {
  const topics = [
    { id: 'algebra', name: 'Algebra', icon: 'Σ', color: '#FF7043' },
    { id: 'geometry', name: 'Geometry', icon: '⎔', color: '#66BB6A' },
    { id: 'calculus', name: 'Calculus', icon: '∫', color: '#42A5F5' }
  ];

  return (
    <div className="topic-progress">
      <h3>Progress By Topic</h3>
      <div className="topic-grid">
        {topics.map(topic => {
          const data = topicData[topic.id] || {
            completed: 0,
            total: 1,
            xp: 0,
            avgScore: 0,
            completionPercent: 0
          };

          return (
            <div key={topic.id} className="topic-card" style={{ borderColor: topic.color }}>
              <div className="topic-header">
                <span className="topic-icon" style={{ color: topic.color }}>
                  {topic.icon}
                </span>
                <h4>{topic.name}</h4>
              </div>
              
              <div className="topic-stats">
                <div className="stat">
                  <span>Completed:</span>
                  <span>{data.completed}/{data.total}</span>
                </div>
                
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{
                      width: `${data.completionPercent}%`,
                      backgroundColor: topic.color
                    }}
                  ></div>
                </div>
                
                <div className="stat">
                  <span>Last Score:</span>
                  <span>{data.avgScore}%</span>
                </div>
                
                <div className="stat">
                  <span>Gained XP:</span>
                  <span>{data.xp.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ProgressTab component
function ProgressTab({ progressData }) {
  const location = useLocation();
  const [localXP, setLocalXP] = useState(progressData?.xp || 0);

  // Handle immediate XP updates from navigation state
  useEffect(() => {
    if (location.state?.gainedXP) {
      setLocalXP(prev => prev + location.state.gainedXP);
    }
  }, [location.state]);

  return (
    <div className="progress-tab">
      <SectionHeader 
        title="Orbital Progress" 
        subtitle={`Level ${progressData?.level || 1} Explorer`} 
      />
      
      <div className="progress-grid">
        <div className="mastery-card">
          <h3>Celestial Mastery</h3>
          <div className="circular-progress-container">
            <div className="circular-progress">
              <svg className="progress-ring" viewBox="0 0 100 100">
                  <circle
                    className="progress-ring-bg"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="#3a3a3c"
                    strokeWidth="8"
                  />
                  <circle
                    className="progress-ring-fill"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="#8e8e93"
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * progressData.overallProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
              <div className="progress-percent">
                {progressData?.overallProgress || 0}%
              </div>
            </div>
            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-icon">⭐</span>
                <div>
                  <span className="stat-value">{localXP.toLocaleString()}</span>
                  <span className="stat-label">Stellar XP</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🔥</span>
                <div>
                  <span className="stat-value">{progressData?.streak || "0 days"}</span>
                  <span className="stat-label">Streak</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="topic-container">
          <TopicProgress topicData={progressData?.byTopic} />
        </div>

      </div>
    </div>
  );
}

function LessonsTab() {
  const [activeCategory, setActiveCategory] = useState('algebra');
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  // Updated lesson completion check
  const isLessonCompleted = (lessonId) => {
    if (!userData?.completedLessons) return false;
    
    // Handle both object and array formats
    if (Array.isArray(userData.completedLessons)) {
      return userData.completedLessons.includes(lessonId);
    } else if (typeof userData.completedLessons === 'object') {
      return lessonId in userData.completedLessons;
    }
    
    return false;
  };

  const hasCompletedPrerequisites = (lesson) => {
    if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
      return true; // No prerequisites
    }
    
    return lesson.prerequisites.every(prereqId => 
      isLessonCompleted(prereqId)
    );
  };

  const lessonCategories = {
    algebra: {
      name: "Celestial Algebra",
      icon: "Σ",
      lessons: [
        {
          id: "alg0",
          title: "Stellar Arithmetic",
          description: "Basic calculations for space navigation",
          icon: "✨",
          topic: "algebra",
          difficulty: "beginner",
          problems: [
            { question: "If a spaceship has 5 fuel cells and gains 3 more, then doubles its total, how many cells does it have?", 
              answer: 16 },
            { question: "A solar panel produces 15 energy units per hour. If it runs for 3 hours and then gains a 4-unit bonus, what’s its total output?", 
              answer: 49 },
            { question: "An asteroid splits into 3² × 4 fragments. How many pieces are there?", 
              answer: 36 },
            { question: "A warp core’s power is calculated as 2³ + 5 × 2. What’s its output?", 
              answer: 18 },
            { question: "A cargo hold has 50 units. If 6 crates, each weighing 4 units, are removed, what’s the remaining capacity?", 
              answer: 26 },
          ],
          xpReward: 30,
          background: "algebra-easy-bg.png",
          prerequisites: [],
          completed: isLessonCompleted("alg0")
        },
        {
          id: "alg1",
          title: "Linear Equations",
          description: "Solve equations in zero gravity",
          icon: "🧮",
          topic: "algebra",
          difficulty: "beginner",
          problems: [
            { question: "A rocket’s fuel consumption follows 2x + 5 = 15. How many hours (x) until refueling?", 
              answer: 5 },
            { question: "An orbit adjustment requires solving 3(x - 4) = 21. Find x.", 
              answer: 11 },
            { question: "Oxygen mix ratio: x/3 + 2 = 8. What’s x?", 
              answer: 18 },
            { question: "Trajectory correction: 5x - 7 = 3x + 11. Solve for x.", 
              answer: 9 },
            { question: "Shield stability: 2(3x + 1) = 20. Find x.", 
              answer: 3 },
          ],
          xpReward: 50,
          background: "algebra-bg.png",
          prerequisites: ["alg0"],
          completed: isLessonCompleted("alg1")
        },
        {
          id: "alg2",
          title: "Systems in Space",
          description: "Solve systems of equations for orbital mechanics",
          icon: "🛰️",
          topic: "algebra",
          difficulty: "intermediate",
          problems: [
            { question: "Docking paths intersect at y = 2x + 1 and y = -x + 7. Find (x, y).", 
              answer: {x: 2, y: 5} },
            { question: "Fuel mix requires solving 3x + 2y = 16 and x - y = 3. Find x and y.", 
              answer: {x: 22/5, y: 7/5} },
            { question: "A solar array’s output is y = x² and y = 2x + 8. Find intersections.", 
              answer: [
                { x: 4, y: 16 },
                { x: -2, y: 4 }
              ]},
            { question: "Warp core alignment: x² + y = 10 and x + y = 4.", 
              answer: [
                { x: 3, y: 1 },
                { x: -2, y: 6 }
              ]},
          ],
          xpReward: 65,
          background: "algebra-system-bg.png",
          prerequisites: ["alg1"],
          completed: isLessonCompleted("alg2")
        },
        {
          id: "alg3",
          title: "Quadratic Equations",
          description: "Navigate asteroid fields with math",
          icon: "☄️",
          topic: "algebra",
          difficulty: "intermediate",
          problems: [
            { question: "Event horizon equation: x² - 9 = 0. Solve for x.", 
              answer: [3, -3] },
            { question: "Factor x² + 5x + 6 = 0 to stabilize the warp field.", 
              answer: [-2, -3] },
            { question: "Solve 2x² - 4x - 6 = 0 using the quadratic formula.", 
              answer: [3, -1] },
          ],
          xpReward: 75,
          background: "algebra-medium-bg.png",
          prerequisites: ["alg2"],
          completed: isLessonCompleted("alg3")
        }
      ]
    },
    geometry: {
      name: "Stellar Geometry",
      icon: "⎔",
      lessons: [
        {
          id: "geo0",
          title: "Space Shapes Basics",
          description: "Fundamental geometric concepts in zero-G",
          icon: "🌠",
          topic: "geometry",
          difficulty: "beginner",
          problems: [
            { question: "A hexagonal space station has how many sides?", 
              answer: 6 },
            { question: "Degrees in a full rotation (navigation compass)?", 
              answer: 360 },
            { question: "Lines of symmetry in an equilateral triangle?", 
              answer: 3 },
          ],
          xpReward: 30,
          background: "geometry-easy-bg.png",
          prerequisites: [],
          completed: isLessonCompleted("geo0")
        },
        {
          id: "geo1",
          title: "Cosmic Shapes",
          description: "Calculate properties of celestial bodies",
          icon: "🌌",
          topic: "geometry",
          difficulty: "intermediate",
          problems: [
            { question: "A rectangular spaceship panel is 5cm × 8cm. What’s its area?", 
              answer: 40, unit: "cm²" },
            { question: "Circumference of a planet (radius 7,000km, π≈3.14)?", 
              answer: 43.960, unit: "km" },
            { question: "A trapezoidal warp core has bases 6m/10m and height 4m. Find area.", 
              answer: 32, unit: "m²" },
          ],
          xpReward: 50,
          background: "geometry-bg.png",
          prerequisites: ["geo0"],
          completed: isLessonCompleted("geo1")
        },
        {
          id: "geo2",
          title: "Volumes in Space",
          description: "Calculate capacities of spacecraft components",
          icon: "🚀",
          topic: "geometry",
          difficulty: "intermediate",
          problems: [
            { question: "A spherical oxygen tank (r=5m) has what volume? (V=4/3πr³)", 
              answer: ~523.6, unit: "m³" },
            { question: "A cone-shaped escape pod (r=3m, h=4m) has what volume?", 
              answer: ~37.7, unit: "m³" },
          ],
          xpReward: 65,
          background: "geometry-volume-bg.png",
          prerequisites: ["geo1"],
          completed: isLessonCompleted("geo2")
        }
      ]
    },
    calculus: {
      name: "Orbital Calculus",
      icon: "∫",
      lessons: [
        {
          id: "calc0",
          title: "Space Rates",
          description: "Basic derivatives for space travel",
          icon: "⏱️",
          topic: "calculus",
          difficulty: "beginner",
          problems: [
            { question: "Differentiate y = 3x (linear motion).", 
              answer: 3 },
            { question: "Find dy/dx for y = x² (accelerating probe).", 
              answer: '2x' },
          ],
          xpReward: 30,
          background: "calculus-easy-bg.png",
          prerequisites: [],
          completed: isLessonCompleted("calc0")
        },
        {
          id: "calc1",
          title: "Stellar Derivatives",
          description: "Calculate rates of change in space",
          icon: "🪐",
          topic: "calculus",
          difficulty: "intermediate",
          problems: [
            { question: "Derivative of f(x) = √x (gravity well)?", 
              answer: "1/(2√x)" },
            { question: "Differentiate y = 1/x² (inverse-square law).", 
              answer: "-2/x³" },
          ],
          xpReward: 50,
          background: "calculus-bg.png",
          prerequisites: ["calc0"],
          completed: isLessonCompleted("calc1")
        },
        {
          id: "calc2",
          title: "Gradient Fields",
          description: "Partial derivatives for multidimensional space",
          icon: "🧭",
          topic: "calculus",
          difficulty: "intermediate",
          problems: [
            { question: "Find ∂f/∂x for f(x,y) = 3x²y (vector field).", 
              answer: "6xy" },
            { question: "∇f for f(x,y) = 5x + 2y (simple plane)?", 
              answer: ["5", "2"] },
          ],
          xpReward: 65,
          background: "calculus-gradient-bg.png",
          prerequisites: ["calc1"],
          completed: isLessonCompleted("calc2")
        }
      ]
    }
  };

  // Update the lesson objects to use the helper function
  const updatedLessonCategories = useMemo(() => {
    return Object.fromEntries(
      Object.entries(lessonCategories).map(([category, data]) => [
        category,
        {
          ...data,
          lessons: data.lessons.map(lesson => ({
            ...lesson,
            completed: isLessonCompleted(lesson.id)
          }))
        }
      ])
    );
  }, [userData?.completedLessons]);

  const handleLessonClick = (lesson) => {
    if (!hasCompletedPrerequisites(lesson) && !lesson.completed) {
      return; // Don't navigate if prerequisites aren't met
    }
    
    navigate('/game', {
      state: {
        lessonData: lesson,
        userProgress: {
          skills: userData?.skills || {},
          completedLessons: userData?.completedLessons || {}
        }
      }
    });
  };

  return (
    <div className="lessons-tab cosmic-theme">
      <SectionHeader 
        title="Learning Trajectories" 
        subtitle="Navigate your math journey through the cosmos" 
      />
      
      <div className="category-tabs">
        {Object.entries(updatedLessonCategories).map(([key, category]) => (
          <button
            key={key}
            className={`category-tab ${activeCategory === key ? 'active' : ''}`}
            onClick={() => setActiveCategory(key)}
          >
            <span className="category-icon">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>
      
      <div className="lessons-grid">
        {updatedLessonCategories[activeCategory].lessons.map(lesson => {
          const prerequisitesMet = hasCompletedPrerequisites(lesson);
          const canAccess = prerequisitesMet || lesson.completed;
          
          return (
            <div 
              key={lesson.id}
              className={`lesson-card 
                ${lesson.completed ? 'completed' : ''}
                ${!canAccess ? 'locked' : ''}
              `}
              onClick={() => canAccess && handleLessonClick(lesson)}
            >
              <div className="lesson-icon">{lesson.icon}</div>
              <div className="lesson-content">
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                <div className="lesson-meta">
                  <span className={`difficulty-badge ${lesson.difficulty}`}>
                    {lesson.difficulty}
                  </span>
                  {lesson.completed && (
                    <span className="completion-badge">✓ Completed</span>
                  )}
                  <span className="xp-reward">{lesson.xpReward} XP</span>
                </div>
                
                {!canAccess && (
                  <div className="prerequisite-warning">
                    <p>Complete {lesson.prerequisites.map(prereqId => {
                      const prereq = updatedLessonCategories[activeCategory].lessons
                        .find(l => l.id === prereqId);
                      return prereq ? prereq.title : prereqId;
                    }).join(" and ")} first</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// AchievementsTab component
function AchievementsTab({ achievements }) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="achievements-tab">
      <SectionHeader 
        title="Cosmic Achievements" 
        subtitle={`${unlockedCount} of ${totalCount} unlocked`} 
      />
      
      <div className="badges-grid">
        {achievements.map(ach => (
          <div key={ach.id} className={`badge-card ${ach.unlocked ? 'earned' : 'locked'}`}>
            <div className="badge-icon" style={{ color: ach.color }}>
              {ach.unlocked ? ach.icon : '🔒'}
            </div>
            <h3>{ach.name}</h3>
            <p>{ach.description}</p>
            {ach.unlocked ? (
              <>
                <small className="earned-date">
                  Achieved {ach.date?.toLocaleDateString() || 'recently'}
                </small>
                <div className="xp-badge">+{ach.xpReward} XP</div>
              </>
            ) : (
              <small className="locked-text">Locked</small>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ActivityTab component
function ActivityTab({ completedLessons }) {
  return (
    <div className="activity-tab">
      <SectionHeader 
        title="Flight Log" 
        subtitle="Your mission history" 
      />
      
      <div className="activity-list">
        {completedLessons.map(lesson => (
          <div key={lesson.id} className="activity-item">
            <div className="activity-icon">📚</div>
            <div className="activity-details">
              <p>
                Completed <strong>{lesson.title}</strong> with {lesson.score}%
                <span className="activity-xp">+{Math.floor(lesson.score)} XP</span>
              </p>
              <small>
                {lesson.date.toLocaleDateString()} • {Math.floor(lesson.timeTaken / 60)}m {Math.round(lesson.timeTaken % 60)}s
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// Helper components
function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}