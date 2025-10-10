import React from 'react';
import { Code, Lightbulb, Clock, BarChart3, Tag } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Challenge {
  instruction: string;
  solution: string;
  category: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number; // in minutes
}

interface ChallengeViewProps {
  challenge?: Challenge | null;
  currentCategory?: string;
  challengeNumber?: number;
  totalChallenges?: number;
  showCategoryInfo?: boolean;
  className?: string;
}

const ChallengeView: React.FC<ChallengeViewProps> = ({
  challenge,
  currentCategory,
  challengeNumber,
  totalChallenges,
  showCategoryInfo = true,
  className = '',
}) => {
  // Safe check for challenge object
  if (!challenge) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="p-6">
          <div className="text-center py-8">
            <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Challenge Available
            </h3>
            <p className="text-gray-600">
              Please select a different category or load questions.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const formatInstruction = (instruction: string): string => {
    if (!instruction) return '';
    
    // Add basic formatting for code blocks and lists
    return instruction
      .replace(/```python\n?([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg my-2 overflow-x-auto"><code class="text-sm">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyText = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return 'Not Rated';
    }
  };

  const getEstimatedTimeText = (minutes?: number) => {
    if (!minutes) return 'Time not specified';
    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  // Safe category check
  const shouldShowCategoryInfo = showCategoryInfo && 
    challenge?.category && 
    challenge.category !== 'General' && 
    challenge.category !== currentCategory;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Challenge Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Code className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Coding Challenge
              {challengeNumber && totalChallenges && (
                <span className="text-gray-500 font-normal ml-2">
                  ({challengeNumber} of {totalChallenges})
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600">
              Write Python code to complete the task below
            </p>
          </div>
        </div>

        {/* Challenge Metadata */}
        <div className="flex items-center gap-2">
          {challenge.difficulty && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
              <BarChart3 className="h-3 w-3" />
              {getDifficultyText(challenge.difficulty)}
            </span>
          )}
          
          {challenge.estimatedTime && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
              <Clock className="h-3 w-3" />
              {getEstimatedTimeText(challenge.estimatedTime)}
            </span>
          )}
        </div>
      </div>

      {/* Category Information */}
      {shouldShowCategoryInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Tag className="h-4 w-4" />
            <span>
              Category: <strong>{challenge.category}</strong>
              {currentCategory && (
                <span className="text-blue-600 ml-1">
                  (Filtered by: {currentCategory})
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Instruction Card */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Instruction Header */}
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Your Task
            </h3>
          </div>

          {/* Instruction Content */}
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: formatInstruction(challenge.instruction || 'No instruction provided.') 
              }}
            />
          </div>

        </div>
      </Card>

      {/* Tips & Hints Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tips Card */}
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">Pro Tips</h4>
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Read the problem carefully before coding</li>
            <li>• Use meaningful variable names</li>
            <li>• Always import used packages</li>
          </ul>
        </Card>
      </div>

      {/* Challenge Progress (Mini) */}
      {challengeNumber && totalChallenges && (
        <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <span>Progress through challenges</span>
          <span className="font-medium">
            {Math.round((challengeNumber / totalChallenges) * 100)}% complete
          </span>
        </div>
      )}
    </div>
  );
};

// Compact version for smaller displays
interface CompactChallengeViewProps {
  challenge?: Challenge | null;
  className?: string;
}

const CompactChallengeView: React.FC<CompactChallengeViewProps> = ({
  challenge,
  className = '',
}) => {
  if (!challenge) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-gray-500 py-4">
          No challenge available
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Challenge</h3>
        </div>
        
        <div className="text-sm text-gray-700 leading-relaxed">
          {challenge.instruction && challenge.instruction.length > 200 
            ? `${challenge.instruction.substring(0, 200)}...` 
            : challenge.instruction || 'No instruction provided.'
          }
        </div>

        {challenge.category && challenge.category !== 'General' && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Tag className="h-3 w-3" />
            {challenge.category}
          </div>
        )}
      </div>
    </Card>
  );
};

// Challenge Instruction Only (for minimal display)
interface ChallengeInstructionProps {
  instruction?: string;
  className?: string;
}

const ChallengeInstruction: React.FC<ChallengeInstructionProps> = ({
  instruction,
  className = '',
}) => {
  if (!instruction) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <p className="text-gray-500">No instruction available.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h4 className="font-medium text-gray-900 mb-2">Instruction:</h4>
      <div 
        className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ 
          __html: instruction
            .replace(/```python\n?([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded my-1 overflow-x-auto text-xs"><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br />')
        }}
      />
    </div>
  );
};

export { 
  ChallengeView, 
  CompactChallengeView, 
  ChallengeInstruction 
};
export type { Challenge };
