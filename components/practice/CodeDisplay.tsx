import React from 'react';
import {
    Code,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Read-only code display component
interface CodeDisplayProps {
    code: string;
    className?: string;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({
    code,
    className = '',
}) => {
    const safeCode = typeof code === 'string'
        ? code.replace(/\[object Object\]/g, '')
        : String(code || '').replace(/\[object Object\]/g, '');

    const noSelectStyle: React.CSSProperties = {
        userSelect: 'none',
        MozUserSelect: 'none' as any, // Firefox
        WebkitUserSelect: 'none' as any, // Safari, Chrome, Opera
        msUserSelect: 'none' as any, // IE/Edge
    };

    return (
        <Card className={`overflow-hidden ${className}`}>
            <div
                className="bg-gray-900 p-4 font-mono text-sm text-white overflow-x-auto"
                style={noSelectStyle}
            >
                <pre className="whitespace-pre-wrap">
                    {safeCode}
                </pre>
            </div>
        </Card>
    );
};

export { CodeDisplay };
