import React from 'react';
import { Link } from 'react-router-dom';
import { BookX, Home } from 'lucide-react';
import Button from '@/components/common/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4 shadow-subtle">
        <BookX className="w-8 h-8" />
      </div>

      <span className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">
        Error 404
      </span>
      <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-xs text-surface-500 max-w-sm mt-2 leading-relaxed">
        The study resource, discussion thread, or page you were looking for doesn&apos;t exist or has been relocated.
      </p>

      <div className="mt-6 flex gap-3">
        <Link to="/">
          <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
            Back to Home Feed
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
