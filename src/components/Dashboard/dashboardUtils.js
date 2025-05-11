export const formatSkillName = (skill) => {
  const names = {
    algebra: 'Astro-Algebra',
    geometry: 'Galactic Geometry',
    calculus: 'Cosmic Calculus'
  };
  return names[skill] || skill.charAt(0).toUpperCase() + skill.slice(1);
};

export const getSkillIcon = (skill) => {
  const icons = {
    algebra: 'Σ',
    geometry: '⎔',
    calculus: '∫'
  };
  return icons[skill] || '★';
};

export const difficultyColors = {
  beginner: '#8e8e93',
  intermediate: '#aeaeb2',
  advanced: '#636366'
};

export const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};