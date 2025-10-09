import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ArrowLeft, 
  Menu, 
  Settings, 
  Upload, 
  Key, 
  Home,
  BarChart3
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  backButtonHref?: string;
  onBackClick?: () => void;
  showMenu?: boolean;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  variant?: 'default' | 'practice' | 'primary';
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  backButtonHref,
  onBackClick,
  showMenu = false,
  onMenuClick,
  actions,
  variant = 'default',
  className = '',
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backButtonHref) {
      router.push(backButtonHref);
    } else {
      router.back();
    }
  };

  const handleHomeClick = () => {
    router.push('/');
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white shadow-sm';
      case 'practice':
        return 'bg-white border-b border-gray-200 shadow-sm';
      default:
        return 'bg-white border-b border-gray-200 shadow-sm';
    }
  };

  const getTextColor = () => {
    return variant === 'primary' ? 'text-white' : 'text-gray-900';
  };

  const getButtonVariant = () => {
    return variant === 'primary' ? 'ghost' : 'outline';
  };

  const getIconColor = () => {
    return variant === 'primary' ? 'text-white' : 'text-gray-600';
  };

  // Default actions for different pages
  const getDefaultActions = () => {
    if (pathname === '/category-selection') {
      return (
        <>
          <Button
            variant={getButtonVariant()}
            size="sm"
            onClick={() => {/* Handle load questions */}}
            className={`flex items-center gap-2 ${getIconColor()}`}
          >
            <Upload className="h-4 w-4" />
            Load Questions
          </Button>
          <Button
            variant={getButtonVariant()}
            size="sm"
            onClick={() => {/* Handle API key */}}
            className={`flex items-center gap-2 ${getIconColor()}`}
          >
            <Key className="h-4 w-4" />
            API Key
          </Button>
        </>
      );
    }

    if (pathname?.startsWith('/practice')) {
      return (
        <Button
          variant={getButtonVariant()}
          size="sm"
          onClick={() => {/* Handle TTS toggle */}}
          className={`flex items-center gap-2 ${getIconColor()}`}
        >
          <BarChart3 className="h-4 w-4" />
          TTS
        </Button>
      );
    }

    return null;
  };

  return (
    <header className={`sticky top-0 z-40 ${getVariantStyles()} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Navigation */}
          <div className="flex items-center gap-4 flex-1">
            {/* Back Button */}
            {showBackButton && (
              <Button
                variant={getButtonVariant()}
                size="sm"
                onClick={handleBackClick}
                className={`flex items-center gap-2 ${getIconColor()}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}

            {/* Home Button (when no back button) */}
            {!showBackButton && pathname !== '/' && (
              <Button
                variant={getButtonVariant()}
                size="sm"
                onClick={handleHomeClick}
                className={`flex items-center gap-2 ${getIconColor()}`}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            )}

            {/* Menu Button */}
            {showMenu && (
              <Button
                variant={getButtonVariant()}
                size="sm"
                onClick={onMenuClick}
                className={getIconColor()}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Center Section - Title */}
          <div className="flex-1 flex justify-center">
            {title && (
              <h1 className={`text-xl font-semibold ${getTextColor()}`}>
                {title}
              </h1>
            )}
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {actions || getDefaultActions()}
          </div>
        </div>
      </div>
    </header>
  );
};

// Specialized Header Components

interface PracticeHeaderProps extends Omit<HeaderProps, 'variant' | 'showBackButton'> {
  category?: string;
  onLeavePractice?: () => void;
  onToggleTTS?: () => void;
  isTtsEnabled?: boolean;
}

const PracticeHeader: React.FC<PracticeHeaderProps> = ({
  category,
  onLeavePractice,
  onToggleTTS,
  isTtsEnabled = true,
  ...props
}) => {
  return (
    <Header
      variant="practice"
      showBackButton
      onBackClick={onLeavePractice}
      title={category ? `Practice - ${category}` : 'Practice Session'}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleTTS}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {isTtsEnabled ? 'Mute' : 'Unmute'}
        </Button>
      }
      {...props}
    />
  );
};

interface CategoryHeaderProps extends Omit<HeaderProps, 'variant' | 'showBackButton'> {
  onLoadQuestions?: () => void;
  onChangeApiKey?: () => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  onLoadQuestions,
  onChangeApiKey,
  ...props
}) => {
  return (
    <Header
      showBackButton
      backButtonHref="/"
      title="Practice Categories"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadQuestions}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Load Questions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeApiKey}
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            API Key
          </Button>
        </>
      }
      {...props}
    />
  );
};

interface MainHeaderProps extends Omit<HeaderProps, 'variant'> {
  onSettingsClick?: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  onSettingsClick,
  ...props
}) => {
  return (
    <Header
      variant="primary"
      title="DeamV - Data Science Practice"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
          className="text-white hover:bg-blue-700"
        >
          <Settings className="h-4 w-4" />
        </Button>
      }
      {...props}
    />
  );
};

// Breadcrumb component for complex navigation
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbHeaderProps extends HeaderProps {
  breadcrumbs: BreadcrumbItem[];
}

const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({
  breadcrumbs,
  ...props
}) => {
  const router = useRouter();

  const handleBreadcrumbClick = (href?: string) => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <Header {...props}>
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => (
          <div key={breadcrumb.label} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-400">/</span>}
            <button
              onClick={() => handleBreadcrumbClick(breadcrumb.href)}
              className={`${
                breadcrumb.href
                  ? 'text-blue-600 hover:text-blue-800 hover:underline'
                  : 'text-gray-600 cursor-default'
              } transition-colors`}
              disabled={!breadcrumb.href}
            >
              {breadcrumb.label}
            </button>
          </div>
        ))}
      </nav>
    </Header>
  );
};

export {
  Header,
  PracticeHeader,
  CategoryHeader,
  MainHeader,
  BreadcrumbHeader,
};
export type { HeaderProps, BreadcrumbItem };
