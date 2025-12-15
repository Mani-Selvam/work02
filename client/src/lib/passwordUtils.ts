export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function calculatePasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  color: string;
  feedback: string;
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length < 8) {
    return {
      strength: 'weak',
      score: 0,
      color: 'bg-red-500',
      feedback: 'Password must be at least 8 characters',
    };
  }

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;

  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add numbers');
  }

  if (/[@$!%*?&]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add special characters (@$!%*?&)');
  }

  const hasNoSpaces = !/\s/.test(password);
  if (!hasNoSpaces) {
    score -= 20;
    feedback.push('Remove spaces');
  }

  let strength: 'weak' | 'medium' | 'strong';
  let color: string;

  if (score < 60) {
    strength = 'weak';
    color = 'bg-red-500';
  } else if (score < 90) {
    strength = 'medium';
    color = 'bg-orange-500';
  } else {
    strength = 'strong';
    color = 'bg-green-500';
  }

  return {
    strength,
    score: Math.min(100, score),
    color,
    feedback: feedback.join(', ') || 'Strong password!',
  };
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Must contain at least one number');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Must contain at least one special character (@$!%*?&)');
  }

  if (/\s/.test(password)) {
    errors.push('Password cannot contain spaces');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
