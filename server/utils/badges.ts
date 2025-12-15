export interface BadgeResult {
  badge: string;
  grade: string;
  color: string;
  icon: string;
}

export function calculateMonthlyBadge(monthlyPoints: number): BadgeResult {
  if (monthlyPoints >= 200) {
    return {
      badge: 'Gold',
      grade: 'A',
      color: 'text-yellow-500',
      icon: '🥇'
    };
  } else if (monthlyPoints >= 150) {
    return {
      badge: 'Silver',
      grade: 'B',
      color: 'text-gray-400',
      icon: '🥈'
    };
  } else if (monthlyPoints >= 100) {
    return {
      badge: 'Bronze',
      grade: 'C',
      color: 'text-orange-600',
      icon: '🥉'
    };
  } else {
    return {
      badge: 'No Badge',
      grade: 'D',
      color: 'text-gray-500',
      icon: '⭐'
    };
  }
}

export function calculateYearlyBadge(yearlyPoints: number): BadgeResult {
  if (yearlyPoints >= 2400) {
    return {
      badge: 'Diamond',
      grade: 'A+',
      color: 'text-cyan-400',
      icon: '💎'
    };
  } else if (yearlyPoints >= 2000) {
    return {
      badge: 'Gold',
      grade: 'A',
      color: 'text-yellow-500',
      icon: '🥇'
    };
  } else if (yearlyPoints >= 1500) {
    return {
      badge: 'Silver',
      grade: 'B',
      color: 'text-gray-400',
      icon: '🥈'
    };
  } else if (yearlyPoints >= 1000) {
    return {
      badge: 'Bronze',
      grade: 'C',
      color: 'text-orange-600',
      icon: '🥉'
    };
  } else {
    return {
      badge: 'No Badge',
      grade: 'D',
      color: 'text-gray-500',
      icon: '⭐'
    };
  }
}

export function getPointsForAttendance(loginTimeMinutes: number): number {
  if (loginTimeMinutes >= 540 && loginTimeMinutes < 550) {
    return 10;
  } else if (loginTimeMinutes >= 550 && loginTimeMinutes < 570) {
    return 10;
  } else if (loginTimeMinutes >= 570 && loginTimeMinutes < 600) {
    return 10;
  } else if (loginTimeMinutes >= 600 && loginTimeMinutes < 630) {
    return 10;
  } else if (loginTimeMinutes >= 780 && loginTimeMinutes < 840) {
    return 10;
  } else if (loginTimeMinutes >= 840 && loginTimeMinutes < 900) {
    return 10;
  } else {
    return 0;
  }
}
