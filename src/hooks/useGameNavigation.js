import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase/init';
import { auth } from './firebase/init';

export const useGameNavigation = () => {
  const navigate = useNavigate();

  const launchGame = async (lesson) => {
    try {
      // Update user's active lesson in Firestore
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid)), {
          activeLesson: lesson.id,
          lastAccessed: new Date()
        };
      }

      // Navigate to game with lesson parameters
      navigate('/game', {
        state: {
          lessonId: lesson.id,
          topic: lesson.topic,
          difficulty: lesson.difficulty,
          title: lesson.title
        }
      });

    } catch (error) {
      console.error("Error launching game:", error);
      // Optional: Show error to user
    }
  };

  return { launchGame };
};