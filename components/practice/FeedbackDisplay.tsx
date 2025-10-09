// components/practice/FeedbackDisplay.tsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Lightbulb, 
  Code2, 
  Sparkles,
  Copy,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CodeDisplay } from './CodeDisplay';


export const parseFeedback = (text: string, defaultVerdict?: 'CORRECT' | 'INCORRECT' | 'PARTIAL') => {
  const verdictMatch = text.match(/VERDICT:\s*(CORRECT|INCORRECT|PARTIAL)/i);
  const cleanText = text.replace(/VERDICT:\s*(CORRECT|INCORRECT|PARTIAL)/i, '').trim();
  
  return {
    verdict: verdictMatch ? verdictMatch[1].toUpperCase() as 'CORRECT' | 'INCORRECT' | 'PARTIAL' : defaultVerdict,
    text: cleanText,
  };
};


interface FeedbackDisplayProps {
  feedback: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'evaluation';
  verdict?: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
  sampleAnswer?: string;
  userCode?: string;
  showSampleAnswer?: boolean;
  onHideAnswer?: () => void;
  onTryAgain?: () => void;
  className?: string;
  showTTS?: boolean;
  onToggleTTS?: () => void;
  isTtsEnabled?: boolean;
}


const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  feedback,
  type = 'info',
  verdict,
  sampleAnswer,
  userCode,
  showSampleAnswer = false,
  onHideAnswer,
  onTryAgain,
  className = '',
  showTTS = true,
  onToggleTTS,
  isTtsEnabled = true,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [userRating, setUserRating] = useState<'helpful' | 'not-helpful' | null>(null);
  const [showFullFeedback, setShowFullFeedback] = useState(false);

  // Use the globally defined parseFeedback
  const { verdict: parsedVerdict, text: cleanFeedback } = parseFeedback(feedback, verdict);
  const finalVerdict = verdict || parsedVerdict;

  // Determine feedback type based on verdict
  const getFeedbackType = () => {
    if (finalVerdict === 'CORRECT') return 'success';
    if (finalVerdict === 'INCORRECT') return 'error';
    if (finalVerdict === 'PARTIAL') return 'warning';
    return type;
  };

  const feedbackType = getFeedbackType();

  const getVerdictConfig = () => {
    switch (finalVerdict) {
      case 'CORRECT':
        return {
          icon: CheckCircle,
          title: 'Excellent Work!',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          buttonColor: 'green' as const,
        };
      case 'INCORRECT':
        return {
          icon: XCircle,
          title: 'Needs Improvement',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'red' as const,
        };
      case 'PARTIAL':
        return {
          icon: AlertCircle,
          title: 'Almost There!',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonColor: 'yellow' as const,
        };
      default:
        return {
          icon: Lightbulb,
          title: 'AI Feedback',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          buttonColor: 'blue' as const,
        };
    }
  };

  const config = getVerdictConfig();
  const IconComponent = config.icon;

  const handleCopyFeedback = async () => {
    try {
      await navigator.clipboard.writeText(cleanFeedback);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy feedback: ', err);
    }
  };

  const handleRateFeedback = (rating: 'helpful' | 'not-helpful') => {
    setUserRating(rating);
    // Here you would typically send this rating to your analytics/backend
    console.log(`User rated feedback as: ${rating}`);
  };

  const formatFeedbackText = (text: string) => {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n/g, '<br />');
  };

  const shouldTruncate = cleanFeedback.length > 300 && !showFullFeedback;
  const displayText = shouldTruncate 
    ? cleanFeedback.substring(0, 300) + '...' 
    : cleanFeedback;

  // Auto-expand feedback for short messages
  useEffect(() => {
    if (cleanFeedback.length <= 300) {
      setShowFullFeedback(true);
    }
  }, [cleanFeedback]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Feedback Card */}
      <Card className={`overflow-hidden border-2 ${config.borderColor}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${config.bgColor}`}>
          <div className="flex items-center gap-3">
            <IconComponent className={`h-6 w-6 ${config.color}`} />
            <div>
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              {finalVerdict && (
                <p className="text-sm text-gray-600">
                  {finalVerdict === 'CORRECT' && 'Your solution is correct!'}
                  {finalVerdict === 'INCORRECT' && 'Your solution needs some changes'}
                  {finalVerdict === 'PARTIAL' && 'Your solution is partially correct'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TTS Toggle */}
            {showTTS && onToggleTTS && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTTS}
                className="flex items-center gap-1"
              >
                {isTtsEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyFeedback}
              className="flex items-center gap-1"
            >
              {isCopied ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Feedback Content */}
        <div className="p-6">
          <div 
            className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: formatFeedbackText(displayText) 
            }}
          />

          {/* Show More/Less Toggle */}
          {cleanFeedback.length > 300 && (
            <button
              onClick={() => setShowFullFeedback(!showFullFeedback)}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showFullFeedback ? 'Show less' : 'Show more'}
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
            {finalVerdict === 'INCORRECT' && onTryAgain && (
              <Button
                onClick={onTryAgain}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Code2 className="h-4 w-4" />
                Try Again
              </Button>
            )}

            {showSampleAnswer && sampleAnswer && onHideAnswer && (
              <Button
                onClick={onHideAnswer}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Hide Answer & Try Again
              </Button>
            )}

            {/* Feedback Rating */}
            {!userRating && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">Was this feedback helpful?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRateFeedback('helpful')}
                  className="flex items-center gap-1 text-green-600"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRateFeedback('not-helpful')}
                  className="flex items-center gap-1 text-red-600"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
              </div>
            )}

            {userRating && (
              <div className="ml-auto">
                <span className="text-sm text-gray-600">
                  Thank you for your feedback!
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Sample Answer Display */}
      {showSampleAnswer && sampleAnswer && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Sample Solution</h4>
            <span className="text-sm text-gray-500">
              Study this solution and try to implement it yourself
            </span>
          </div>
          
          <CodeDisplay
            code={sampleAnswer}
            title="Recommended Solution"
            language="python"
          />

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-800">
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm font-medium">Learning Tip</span>
            </div>
            <p className="text-sm text-purple-700 mt-1">
              Study this solution carefully. Pay attention to the approach, variable names, 
              and code structure. Then try to implement it yourself without looking.
            </p>
          </div>
        </div>
      )}

      {/* User Code Comparison (when available) */}
      {userCode && sampleAnswer && !showSampleAnswer && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CodeDisplay
            code={userCode}
            title="Your Solution"
            language="python"
          />
          
          {finalVerdict === 'CORRECT' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800 font-medium">
                  Your solution matches the expected approach!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improvement Suggestions */}
      {finalVerdict === 'INCORRECT' && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3 p-4">
            <Lightbulb className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-orange-900 mb-1">
                Tips for Improvement
              </h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Read the problem statement carefully</li>
                <li>• Break down the problem into smaller steps</li>
                <li>• Test your code with different inputs</li>
                <li>• Review Python syntax and common patterns</li>
                <li>• Don't hesitate to use the "I don't know" option if stuck</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Success Celebration */}
      {finalVerdict === 'CORRECT' && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="text-center p-6">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <div className="absolute inset-0 animate-ping">
                  <CheckCircle className="h-12 w-12 text-green-400 opacity-75" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Great Job! 🎉
            </h3>
            <p className="text-green-700">
              You successfully solved this challenge. Ready for the next one?
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

// Compact Feedback for smaller spaces
interface CompactFeedbackProps {
  feedback: string;
  verdict?: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
  className?: string;
}

const CompactFeedback: React.FC<CompactFeedbackProps> = ({
  feedback,
  verdict,
  className = '',
}) => {
  // Now correctly using the globally defined parseFeedback
  const { text: cleanFeedback } = parseFeedback(feedback, verdict);

  const getVerdictColor = () => {
    switch (verdict) {
      case 'CORRECT': return 'text-green-600 bg-green-50 border-green-200';
      case 'INCORRECT': return 'text-red-600 bg-red-50 border-red-200';
      case 'PARTIAL': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getVerdictIcon = () => {
    switch (verdict) {
      case 'CORRECT': return CheckCircle;
      case 'INCORRECT': return XCircle;
      case 'PARTIAL': return AlertCircle;
      default: return Lightbulb;
    }
  };

  const IconComponent = getVerdictIcon();

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${getVerdictColor()} ${className}`}>
      <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {verdict === 'CORRECT' && 'Correct! '}
          {verdict === 'INCORRECT' && 'Needs improvement: '}
          {verdict === 'PARTIAL' && 'Almost there: '}
        </p>
        <p className="text-sm opacity-90 mt-1">
          {cleanFeedback.length > 150 
            ? cleanFeedback.substring(0, 150) + '...' 
            : cleanFeedback
          }
        </p>
      </div>
    </div>
  );
};

// Feedback loading skeleton
const FeedbackSkeleton: React.FC = () => {
  return (
    <Card className="animate-pulse">
      <div className="flex items-center gap-3 p-6">
        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
      <div className="p-6 pt-0 space-y-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </Card>
  );
};

export { FeedbackDisplay, CompactFeedback, FeedbackSkeleton };
