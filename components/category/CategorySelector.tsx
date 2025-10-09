import React, { useState, useEffect } from 'react';
import { Play, Upload, Database, Filter, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { SelectOption } from '@/components/ui/Select';
import { getAllCategories, hasDataScienceChallenges, getDataScienceChallengesByCategory } from '@/lib/database';

interface CategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onStartPractice: () => void;
  onLoadQuestions?: () => void;
  className?: string;
}

interface CategoryStats {
  totalChallenges: number;
  availableCategories: string[];
  hasQuestions: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  onStartPractice,
  onLoadQuestions,
  className = '',
}) => {
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [stats, setStats] = useState<CategoryStats>({
    totalChallenges: 0,
    availableCategories: [],
    hasQuestions: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategoriesAndStats();
  }, []);

  const loadCategoriesAndStats = async () => {
    try {
      setIsLoading(true);
      
      const [allCategories, hasQuestions] = await Promise.all([
        getAllCategories(),
        hasDataScienceChallenges(),
      ]);

      // Create category options with "General" first
      const categoryOptions: SelectOption[] = [
        { value: 'General', label: 'General' },
        ...allCategories
          .filter(cat => cat !== 'General')
          .map(cat => ({ value: cat, label: cat }))
      ];

      setCategories(categoryOptions);

      // Load stats for the selected category
      if (hasQuestions) {
        const challenges = await getDataScienceChallengesByCategory(selectedCategory);
        const uniqueCategories = ['General', ...allCategories];
        
        setStats({
          totalChallenges: challenges.length,
          availableCategories: uniqueCategories,
          hasQuestions: true,
        });
      } else {
        setStats({
          totalChallenges: 0,
          availableCategories: ['General'],
          hasQuestions: false,
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    onCategoryChange(newCategory);
    
    // Update stats for the new category
    if (stats.hasQuestions) {
      try {
        const challenges = await getDataScienceChallengesByCategory(newCategory);
        setStats(prev => ({
          ...prev,
          totalChallenges: challenges.length,
        }));
      } catch (error) {
        console.error('Error loading category challenges:', error);
      }
    }
  };

  const getCategoryDescription = (category: string) => {
    if (category === 'General') {
      return 'Practice challenges from all available categories mixed together';
    }
    return `Practice ${category.toLowerCase()} specific challenges`;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'General': '🌐',
      'Pandas': '🐼',
      'NumPy': '🔢',
      'Matplotlib': '📊',
      'Seaborn': '🎨',
      'Scikit-learn': '🤖',
      'Data Visualization': '📈',
      'Data Cleaning': '🧹',
      'Machine Learning': '🧠',
      'Statistics': '📐',
    };
    
    return iconMap[category] || '📁';
  };

  if (isLoading) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading categories...</p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Selection Card */}
      <Card className="p-8 text-center">
        <div className="space-y-8">
          {/* Title Section */}
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Select Practice Category
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Choose a category to focus your data science practice session
            </p>
          </div>

          {/* Category Selection */}
          <div className="max-w-md mx-auto space-y-6">
            <Select
              value={selectedCategory}
              onValueChange={handleCategoryChange}
              options={categories}
              placeholder="Select a category"
              size="lg"
              fullWidth
            />

            {/* Category Description */}
            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
              {getCategoryDescription(selectedCategory)}
            </div>

            {/* Start Practice Button */}
            <Button
              onClick={onStartPractice}
              className="w-full flex items-center justify-center gap-3"
              size="lg"
              disabled={!stats.hasQuestions}
            >
              <Play className="h-5 w-5" />
              Start Practice Session
            </Button>

            {!stats.hasQuestions && (
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600">
                  No questions available. Please load a questions file first.
                </p>
                {onLoadQuestions && (
                  <Button
                    variant="outline"
                    onClick={onLoadQuestions}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Upload className="h-4 w-4" />
                    Load Questions File
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Stats Section */}
          {stats.hasQuestions && (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-blue-600 font-bold text-lg">
                  {stats.totalChallenges}
                </div>
                <div className="text-xs text-blue-800">Challenges</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-green-600 font-bold text-lg">
                  {stats.availableCategories.length}
                </div>
                <div className="text-xs text-green-800">Categories</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Available Categories Grid */}
      {stats.availableCategories.length > 1 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Available Categories
              </h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {stats.availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${selectedCategory === category
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">
                      {getCategoryIcon(category)}
                    </span>
                    {selectedCategory === category && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {category}
                    </div>
                    {category === 'General' && (
                      <div className="text-xs text-gray-500">
                        All categories
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <Play className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Quick Start</h4>
              <p className="text-sm text-gray-600">
                Begin practice with selected category
              </p>
            </div>
            <Button
              onClick={onStartPractice}
              disabled={!stats.hasQuestions}
              size="sm"
            >
              Start
            </Button>
          </div>
        </Card>

        {onLoadQuestions && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Load Questions</h4>
                <p className="text-sm text-gray-600">
                  Upload new questions file
                </p>
              </div>
              <Button
                onClick={onLoadQuestions}
                variant="outline"
                size="sm"
              >
                Upload
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {!stats.hasQuestions && (
        <Card className="p-8 text-center bg-yellow-50 border-yellow-200">
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Database className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                No Questions Available
              </h3>
              <p className="text-yellow-700">
                You need to load a questions file before you can start practicing.
                Click the button below to upload your data science questions.
              </p>
            </div>
            {onLoadQuestions && (
              <Button
                onClick={onLoadQuestions}
                className="flex items-center gap-2 mx-auto"
                size="lg"
              >
                <Upload className="h-5 w-5" />
                Load Questions File
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

// Compact version for smaller spaces
interface CompactCategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

const CompactCategorySelector: React.FC<CompactCategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  const [categories, setCategories] = useState<SelectOption[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const allCategories = await getAllCategories();
      const categoryOptions: SelectOption[] = [
        { value: 'General', label: 'General' },
        ...allCategories
          .filter(cat => cat !== 'General')
          .map(cat => ({ value: cat, label: cat }))
      ];
      setCategories(categoryOptions);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  return (
    <div className={className}>
      <Select
        value={selectedCategory}
        onValueChange={onCategoryChange}
        options={categories}
        placeholder="Select category"
        size="md"
        fullWidth
      />
    </div>
  );
};

export { CategorySelector, CompactCategorySelector };
