import React from 'react';
import {
    Code, 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Read-only code display component
interface CodeDisplayProps {
    code: string;
    language?: string;
    title?: string;
    className?: string;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({
    code,
    language = 'python',
    title = 'Code',
    className = '',
}) => {
    const safeCode = typeof code === 'string' 
        ? code.replace(/\[object Object\]/g, '') 
        : String(code || '').replace(/\[object Object\]/g, '');

    return (
        <Card className={`overflow-hidden ${className}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{title}</span>
                    <span className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 rounded">
                        {language.toUpperCase()}
                    </span>
                </div> 
            </div>

            <div className="bg-gray-900 p-4 font-mono text-sm text-white overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                    {safeCode}
                </pre>
            </div>
        </Card>
    );
};

export { CodeDisplay };
