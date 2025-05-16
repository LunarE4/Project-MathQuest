import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/init';
import './dashboard.css';
import { ACHIEVEMENTS } from '../../achievements';

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check for mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            
            if (location.state?.lessonCompleted) {
              setCompletionData({
                ...location.state,
                achievements: location.state.achievements
              });
              setShowCompletion(true);
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
  
    const currentXP = userData.xp || userData.totalXP || 0; 
    const level = Math.floor(currentXP / 300) + 1;
    const xpForNextLevel = level * 300;
    const xpInCurrentLevel = currentXP % 300;
    const levelProgress = (xpInCurrentLevel / 300) * 100;
  
    const formatStreak = () => {
      if (!userData.streak) return "1 Day";
      return `${userData.streak} day${userData.streak !== 1 ? 's' : ''}`;
    };
  
    const calculateSkillPercentage = (skillValue) => {
      const maxSkill = 5;
      return Math.round(((skillValue || 0) / maxSkill) * 100);
    };
  
    const calculateOverallProgress = () => {
      if (!userData.completedLessons) return 0;
      
      const totalLessons = {
        algebra: 4,
        geometry: 3,
        calculus: 3
      };
      
      const completedCount = Object.keys(userData.completedLessons).length;
      const totalAvailable = Object.values(totalLessons).reduce((sum, val) => sum + val, 0);
      
      return Math.round((completedCount / totalAvailable) * 100);
    };
  
    const calculateTopicProgress = () => {
      const defaultTopics = {
        algebra: { completed: 0, total: 4, xp: 0, avgScore: 0, lessonsCompleted: [] },
        geometry: { completed: 0, total: 4, xp: 0, avgScore: 0, lessonsCompleted: [] },
        calculus: { completed: 0, total: 3, xp: 0, avgScore: 0, lessonsCompleted: [] }
      };
    
      if (!userData.completedLessons) return defaultTopics;
    
      const topics = { ...defaultTopics };
    
      Object.entries(userData.completedLessons).forEach(([lessonId, lessonData]) => {
        const topic = lessonData.topic || 'algebra';
        if (topics[topic]) {
          topics[topic].completed++;
          topics[topic].xp += lessonData.xpEarned || 0;
          topics[topic].lessonsCompleted.push({
            score: lessonData.finalScore || 0,
            id: lessonId,
            xp: lessonData.xpEarned || 0
          });
        }
      });
    
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
    <div className={`dashboard cosmic-theme ${isMobile ? 'mobile-view' : ''}`}>
      <header className="dashboard-header">
        <div className="welcome-banner">
          <h1>Welcome back, <span className="username">{user?.displayName?.split(' ')[0]}!</span></h1>
          <p className="subtitle">Ready for today's cosmic math journey?</p>
          <div className="cosmic-decoration">
            <span className="moon">🌖</span>
            <div className="star star-1" style={{ top: '25%', left: '20%' }}></div>
            <div className="star star-2" style={{ top: '35%', left: '80%' }}></div>
            <div className="star star-3" style={{ top: '40%', left: '30%' }}></div>
            <div className="star star-3" style={{ top: '70%', left: '20%' }}></div>
            <div className="star star-3" style={{ top: '40%', left: '75%' }}></div>
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
          {!isMobile && <span className="tab-label">Progress</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => handleTabChange('lessons')}
        >
          <span className="tab-icon">📡</span>
          {!isMobile && <span className="tab-label">Lessons</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => handleTabChange('achievements')}
        >
          <span className="tab-icon">🏆</span>
          {!isMobile && <span className="tab-label">Achievements</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabChange('activity')}
        >
          <span className="tab-icon">🛸</span>
          {!isMobile && <span className="tab-label">Activity</span>}
        </button>
      </nav>

      <div className="tab-content">
        {activeTab === 'progress' && <ProgressTab progressData={progressData} isMobile={isMobile} />}
        {activeTab === 'lessons' && <LessonsTab completedLessons={progressData.completedLessons} isMobile={isMobile} />}
        {activeTab === 'achievements' && <AchievementsTab achievements={achievements} isMobile={isMobile} />}
        {activeTab === 'activity' && <ActivityTab completedLessons={completedLessons} isMobile={isMobile} />}
      </div>
    </div>
  );
}

function TopicProgress({ topicData = {}, isMobile = false }) {
  const topics = [
    { id: 'algebra', name: 'Algebra', icon: 'Σ', color: '#FF7043' },
    { id: 'geometry', name: 'Geometry', icon: '⎔', color: '#66BB6A' },
    { id: 'calculus', name: 'Calculus', icon: '∫', color: '#42A5F5' }
  ];

  return (
    <div className="topic-progress">
      <h3>Progress By Topic</h3>
      <div className={`topic-grid ${isMobile ? 'mobile' : ''}`}>
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
                
                {!isMobile && (
                  <>
                    <div className="stat">
                      <span>Avg Score:</span>
                      <span>{data.avgScore}%</span>
                    </div>
                    
                    <div className="stat">
                      <span>Gained XP:</span>
                      <span>{data.xp.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressTab({ progressData, isMobile }) {
  const location = useLocation();
  const [localXP, setLocalXP] = useState(progressData?.xp || 0);

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
      
      <div className={`progress-grid ${isMobile ? 'mobile' : ''}`}>
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
          <TopicProgress topicData={progressData?.byTopic} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

function LessonsTab({ isMobile }) {
  const [activeCategory, setActiveCategory] = useState('algebra');
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const isLessonCompleted = (lessonId) => {
    if (!userData?.completedLessons) return false;
    
    if (Array.isArray(userData.completedLessons)) {
      return userData.completedLessons.includes(lessonId);
    } else if (typeof userData.completedLessons === 'object') {
      return lessonId in userData.completedLessons;
    }
    
    return false;
  };

  const hasCompletedPrerequisites = (lesson) => {
    if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
      return true;
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
          difficulty: "Beginner",
          problems: [
            { question: "A spaceship collects 12 moon rocks on Monday and 15 on Tuesday. How many did it collect total?", 
              answer: 27 },
            { question: "A rover has 30 energy cells. It uses 18 for a mission. How many are left?", 
              answer: 12 },
            { question: "An astronaut packs 4 meals per day for a 5-day trip. How many meals total?", 
              answer: 20 },
            { question: "A satellite orbits Earth 6 times in 24 hours. How many orbits per hour?", 
              answer: 0.25 },
            { question: "A rocket travels 7 km/hour for 4 hours. How far does it go?", 
              answer: 28,
              unit: "km"}
          ],
          xpReward: 30,
          prerequisites: [],
          completed: isLessonCompleted("alg0")
        },
        {
          id: "alg1",
          title: "Linear Equations",
          description: "Solve equations in zero gravity",
          icon: "🧮",
          topic: "algebra",
          difficulty: "Beginner",
          problems: [
            { question: "A fuel tank has x + 5 = 12 liters. Find x.", 
              answer: 7 },
            { question: "If 3 × asteroid weight = 21 kg, what's the weight?", 
              answer: 7, unit: "kg" },
            { question: "A spaceship travels 2x = 16 km. Solve for x.", 
              answer: 8, unit: "km" },
            { question: "Oxygen tanks: 4x = 20. How many tanks (x)?", 
              answer: 5  },
            { question: "If x - 3 = 9, what’s x?", 
              answer: 12 },
          ],
          xpReward: 50,
          prerequisites: ["alg0"],
          completed: isLessonCompleted("alg1")
        },
        {
          id: "alg2",
          title: "Cosmic Decimals",
          description: "Navigate asteroid fields with decimal math",
          icon: "☄️",
          difficulty: "Intermediate",
          problems: [
            { question: "A star's temperature rose from 12.5°C to 18.3°C. How much did it increase?", 
              answer: 5.8, unit: "°C" },
            { question: "Multiply fuel efficiency: 2.5 × 4", 
              answer: 10 },
            { question: "Divide 8.4 light-years by 2", 
              answer: 4.2, unit: "light-years" },
            { question: "Add spaceship weights: 12.7 + 5.3 tons", 
              answer: 18, unit: "tons" },
            { question: "Subtract: 15.0 - 3.75", 
              answer: 11.25 }
          ],
          xpReward: 70,
          prerequisites: ["alg1"],
          completed: isLessonCompleted("alg2")
        },
        {
          id: "alg3",
          title: "Orbital Percentages",
          description: "Calculate space mission success rates",
          icon: "🛰️",
          difficulty: "Intermediate",
          problems: [
            { question: "If 40% of 50 satellites are active, how many is that?", 
              answer: 20 },
            { question: "A rocket has 30% fuel left. If the tank holds 200L, how much remains?", 
              answer: 60, unit: "L" },
            { question: "Increase 80 by 25% for maximum thrust", 
              answer: 100 },
            { question: "Find 15% of 120 space rations", 
              answer: 18 },
            { question: "A planet is 70% water. If its area is 500 km², what's the water area?", 
              answer: 350, unit: "km²" }
          ],
          xpReward: 90,
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
          difficulty: "Beginner",
          problems: [
            { question: "How many sides does a pentagon-shaped space station have?", 
              answer: 5 },
            { question: "A rectangle has lengths of 4 cm and 7 cm. What's its perimeter?", 
              answer: 22, units: "cm" },
            { question: "How many degrees in three right angles?", 
              answer: 270 },
            { question: "A cube has how many edges?", 
              answer: 12 },
            { question: "Lines of symmetry in a square?", 
              answer: 4 },
          ],
          xpReward: 30,
          prerequisites: [],
          completed: isLessonCompleted("geo0")
        },
        {
          id: "geo1",
          title: "3D Space Shapes",
          description: "Explore spacecraft geometry",
          icon: "🛸",
          difficulty: "Beginner",
          problems: [
            { question: "How many faces does a cube-shaped spaceship have?", 
              answer: 6 },
            { question: "Edges on a triangular prism?", 
              answer: 9 },
            { question: "If a sphere's radius is 4m, what's its diameter?", 
              answer: 8, unit: "m" },
            { question: "Vertices in a rectangular prism?", 
              answer: 8 }
          ],
          xpReward: 50,
          prerequisites: ["geo0"],
          completed: isLessonCompleted("geo1")
        },
        {
          id: "geo2",
          title: "Cosmic Shapes",
          description: "Calculate properties of celestial bodies",
          icon: "🌌",
          topic: "geometry",
          difficulty: "Intermediate",
          problems: [
            { question: "A square solar panel has sides of 5 m. What's its area?", 
              answer: 25, unit: "m²" },
            { question: "A circular space window has radius 3 m. What's its diameter?", 
              answer: 6, unit: "m" },
            { question: "A rectangular cargo bay is 8 m × 4 m. What's its area?", 
              answer: 32, unit: "m²" },
            { question: "A triangle has base 10 m and height 5 m. What's its area?", 
              answer: 25, unit: "m²" },
            { question: "Perimeter of an equilateral triangle with 6 cm sides?", 
              answer: 18, unit: "cm" },
          ],
          xpReward: 70,
          prerequisites: ["geo1"],
          completed: isLessonCompleted("geo2")
        },
        {
          id: "geo3",
          title: "Alien Angles",
          description: "Measure angles of UFO trajectories",
          icon: "👽",
          difficulty: "Intermediate",
          problems: [
            { question: "A spaceship turns 45° left, then 90° right. What's its total rotation?", 
              answer: 45, unit: "°" },
            { question: "How many degrees in a straight line?", 
              answer: 180 },
            { question: "If two angles form a right angle (90°), and one is 35°, what's the other?", 
              answer: 55, unit: "°" },
            { question: "An equilateral triangle's angles each measure...?", 
              answer: 60, unit: "°" },
            { question: "A reflex angle is greater than ___ degrees?", 
              answer: 180 }
          ],
          xpReward: 90,
          prerequisites: ["geo2"],
          completed: isLessonCompleted("geo3")
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
          difficulty: "Beginner",
          problems: [
            { question: "A rocket travels 300 km in 5 hours. What's its speed per hour?", 
              answer: 60, unit: "km/h" },
            { question: "A satellite orbits Earth 4 times in 8 hours. How many orbits per hour?", 
              answer: 0.5 },
            { question: "A probe downloads 120 MB of data in 3 minutes. What's the download rate per minute?", 
              answer: 40, unit: "MB/min" },
            { question: "A rover charges its battery at 10% per hour. How long to charge from 0% to 50%?", 
              answer: 5, unit: "hours" },
            { question: "A spaceship uses 2 fuel cells per hour. How many cells for 6 hours?", 
              answer: 12 },
          ],
          xpReward: 30,
          background: "calculus-easy-bg.png",
          prerequisites: [],
          completed: isLessonCompleted("calc0")
        },
        {
          id: "cal1",
          title: "Space Patterns",
          description: "Predict cosmic events with sequences",
          icon: "🌌",
          difficulty: "Beginner",
          problems: [
            { question: "Next in sequence: 5, 10, 15, ___", 
              answer: 20 },
            { question: "If Day 1=2 meteors, Day 2=4, Day 3=6, how many on Day 5?", 
              answer: 10 },
            { question: "Missing number: 7, 14, ___, 28", 
              answer: 21 }
          ],
          xpReward: 60,
          prerequisites: ["calc0"],
          completed: isLessonCompleted("calc1")
        },
        {
          id: "calc2",
          title: "Black Hole Logic",
          description: "Solve mysteries with algebraic reasoning",
          icon: "🕳️",
          difficulty: "Intermediate",
          problems: [
            { question: "If all robots (R) need 2 batteries, and you have 10 batteries, how many robots can run?", 
              answer: 5 },
            { question: "A spaceship's speed (S) is distance (D) divided by time (T). Write the formula.", 
              answer: "S=D/T" },
            { question: "If 3x + 2 = 11, find x", 
              answer: 3 },
            { question: "True or false: 5 × (3 + 1) = 5 × 3 + 5 × 1", 
              answer: true }
          ],
          xpReward: 80,
          prerequisites: ["calc1"],
          completed: isLessonCompleted("calc2")
        }
      ]
    }
  };

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
      return;
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
            {!isMobile && <span>{category.name}</span>}
          </button>
        ))}
      </div>
      
      <div className={`lessons-grid ${isMobile ? 'mobile' : ''}`}>
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
                    <span className="completion-badge">✓</span>
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

function AchievementsTab({ achievements, isMobile }) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="achievements-tab">
      <SectionHeader 
        title="Cosmic Achievements" 
        subtitle={`${unlockedCount} of ${totalCount} unlocked`} 
      />
      
      <div className={`badges-grid ${isMobile ? 'mobile' : ''}`}>
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
                  {isMobile ? '' : 'Achieved '}{ach.date?.toLocaleDateString() || 'recently'}
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

function ActivityTab({ completedLessons, isMobile }) {
  return (
    <div className="activity-tab">
      <SectionHeader 
        title="Flight Log" 
        subtitle="Your mission history" 
      />
      
      <div className="activity-list">
        {completedLessons.length > 0 ? (
          completedLessons.map(lesson => (
            <div key={lesson.id} className="activity-item">
              <div className="activity-icon">📚</div>
              <div className="activity-details">
                <p>
                  Completed <strong>{isMobile ? lesson.title.substring(0, 15) + (lesson.title.length > 15 ? '...' : '') : lesson.title}</strong> 
                  <span className="activity-score">{lesson.score}%</span>
                  <span className="activity-xp">+{Math.floor(lesson.score)} XP</span>
                </p>
                <small>
                  {lesson.date.toLocaleDateString()} • {Math.floor(lesson.timeTaken / 60)}m {Math.round(lesson.timeTaken % 60)}s
                </small>
              </div>
            </div>
          ))
        ) : (
          <div className="no-activity">
            <p>No completed lessons yet. Start your cosmic journey!</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
