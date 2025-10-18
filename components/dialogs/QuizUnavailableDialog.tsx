// components/dialogs/QuizUnavailableDialog.tsx
import { Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

interface QuizUnavailableDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuizUnavailableDialog({ isOpen, onClose }: QuizUnavailableDialogProps) {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-red-800">Quiz Unavailable</h3>
                <p className="text-gray-600">
                    The graded quiz is currently disabled by the administrator. Please check back when notified otherwise.
                </p>
                <Button
                    onClick={() => {
                        onClose();
                        router.push('/'); // Navigate back to the home page
                    }}
                    className="w-full bg-red-600 hover:bg-red-700"
                >
                    Go Back to Home
                </Button>
            </Card>
        </div>
    );
}

// NOTE: You would need to ensure the imports for Button and Card are correct for your project setup.
