import React from 'react';
import { CheckCircle, Circle, Star, Target, Award, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  completed?: number;
  variant?: 'default' | 'minimal' | 'detailed' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showPercentage?: boolean;
  showTimeEstimate?: boolean;
  averageTimePerChallenge?: number; // in minutes
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  completed = 0,
  variant = 'default',
  size = 'md',
  showLabels = true,
  showPercentage = true,
  showTimeEstimate = false,
  averageTimePerChallenge = 5,
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const remainingChallenges = total - current + 1;
  const estimatedTimeRemaining = remainingChallenges * averageTimePerChallenge;

  const getTimeEstimateText = (minutes: number) => {
    if (minutes < 1) return 'Less than 1 min';
    if (minutes < 60) return `${Math.ceil(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.ceil(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'success';
    if (percent >= 50) return 'primary';
    if (percent >= 25) return 'warning';
    return 'error';
  };

  // Default Progress Indicator
  if (variant === 'default') {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          {showLabels && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Progress</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-gray-900">
              {current}/{total}
            </span>
            {showPercentage && (
              <span className={`font-medium ${
                getProgressColor(percentage) === 'success' ? 'text-green-600' :
                getProgressColor(percentage) === 'primary' ? 'text-blue-600' :
                getProgressColor(percentage) === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage}%
              </span>
            )}
          </div>
        </div>

        <Progress
          value={percentage}
          variant={getProgressColor(percentage)}
          size={size}
          showValue={false}
        />

        {showTimeEstimate && (
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Completed: {completed}/{total}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Est: {getTimeEstimateText(estimatedTimeRemaining)}
            </span>
          </div>
        )}
      </Card>
    );
  }

  // Minimal Progress Indicator
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-sm font-bold text-gray-700 min-w-12">
          {current}/{total}
        </span>
        <Progress
          value={percentage}
          variant={getProgressColor(percentage)}
          size={size}
          showValue={false}
          className="flex-1"
        />
        {showPercentage && (
          <span className="text-sm font-medium text-gray-600 min-w-12 text-right">
            {percentage}%
          </span>
        )}
      </div>
    );
  }

  // Detailed Progress Indicator
  if (variant === 'detailed') {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Session Progress</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {percentage}%
              </div>
              <div className="text-sm text-gray-500">
                {current} of {total} challenges
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Current Progress</span>
              <span className="font-medium text-gray-900">
                {current}/{total}
              </span>
            </div>
            <Progress
              value={percentage}
              variant={getProgressColor(percentage)}
              size="lg"
              showValue={false}
            />

            {completed > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Completed</span>
                  <span className="font-medium text-green-600">
                    {completed}/{total}
                  </span>
                </div>
                <Progress
                  value={completionPercentage}
                  variant="success"
                  size="md"
                  showValue={false}
                />
              </>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {remainingChallenges}
              </div>
              <div className="text-xs text-gray-500">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {completed}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>

          {/* Time Estimate */}
          {showTimeEstimate && (
            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Estimated time remaining: {getTimeEstimateText(estimatedTimeRemaining)}
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Circular Progress Indicator
  if (variant === 'circular') {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="relative inline-flex items-center justify-center">
          <svg className="transform -rotate-90" width="120" height="120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={
                getProgressColor(percentage) === 'success' ? '#10b981' :
                getProgressColor(percentage) === 'primary' ? '#3b82f6' :
                getProgressColor(percentage) === 'warning' ? '#f59e0b' : '#ef4444'
              }
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          
          <div className="absolute">
            <div className="text-2xl font-bold text-gray-900">
              {percentage}%
            </div>
            <div className="text-xs text-gray-500">
              {current}/{total}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="font-medium text-gray-900">
            Practice Progress
          </div>
          {showTimeEstimate && (
            <div className="text-sm text-gray-500">
              {getTimeEstimateText(estimatedTimeRemaining)} remaining
            </div>
          )}
        </div>
      </Card>
    );
  }

  return null;
};

// Challenge Stepper Component
interface ChallengeStepperProps {
  challenges: Array<{
    id: string;
    title?: string;
    status: 'completed' | 'current' | 'upcoming';
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
  currentIndex: number;
  className?: string;
}

const ChallengeStepper: React.FC<ChallengeStepperProps> = ({
  challenges,
  currentIndex,
  className = '',
}) => {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <h3 className="font-medium text-gray-900">Challenge Journey</h3>
        </div>
        
        <div className="space-y-2">
          {challenges.map((challenge, index) => (
            <div
              key={challenge.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                challenge.status === 'current' 
                  ? 'bg-blue-50 border border-blue-200' 
                  : challenge.status === 'completed'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {challenge.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : challenge.status === 'current' ? (
                  <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Challenge Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Challenge {index + 1}
                  </span>
                  {challenge.difficulty && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      challenge.difficulty === 'easy' 
                        ? 'bg-green-100 text-green-800' 
                        : challenge.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {challenge.difficulty}
                    </span>
                  )}
                </div>
                {challenge.title && (
                  <p className="text-xs text-gray-600 truncate">
                    {challenge.title}
                  </p>
                )}
              </div>

              {/* Position Indicator */}
              <div className="text-xs text-gray-500 flex-shrink-0">
                {index + 1}/{challenges.length}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// Session Stats Component
interface SessionStatsProps {
  totalChallenges: number;
  completedChallenges: number;
  currentChallenge: number;
  startTime?: Date;
  averageTimePerChallenge?: number;
  className?: string;
}

const SessionStats: React.FC<SessionStatsProps> = ({
  totalChallenges,
  completedChallenges,
  currentChallenge,
  startTime,
  averageTimePerChallenge = 5,
  className = '',
}) => {
  const getSessionDuration = () => {
    if (!startTime) return '0m';
    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 60000);
    return `${Math.floor(duration / 60)}h ${duration % 60}m`;
  };

  const getAverageTime = () => {
    if (completedChallenges === 0) return '0m';
    const totalTime = completedChallenges * averageTimePerChallenge;
    return `${Math.floor(totalTime / completedChallenges)}m`;
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {completedChallenges}
          </div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalChallenges - currentChallenge + 1}
          </div>
          <div className="text-xs text-gray-500">Remaining</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">
            {getAverageTime()}
          </div>
          <div className="text-xs text-gray-500">Avg Time</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-orange-600">
            {getSessionDuration()}
          </div>
          <div className="text-xs text-gray-500">Session Time</div>
        </div>
      </div>
    </Card>
  );
};

export { ProgressIndicator, ChallengeStepper, SessionStats };
