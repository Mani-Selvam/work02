import { calculatePasswordStrength } from "@/lib/passwordUtils";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { strength, score, color, feedback } = calculatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-2" data-testid="password-strength-meter">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${color}`}
            style={{ width: `${score}%` }}
            data-testid="password-strength-bar"
          />
        </div>
        <span
          className={`text-xs font-medium capitalize ${
            strength === 'weak'
              ? 'text-red-500'
              : strength === 'medium'
              ? 'text-orange-500'
              : 'text-green-500'
          }`}
          data-testid="password-strength-label"
        >
          {strength}
        </span>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="password-feedback">
        {feedback}
      </p>
    </div>
  );
}
