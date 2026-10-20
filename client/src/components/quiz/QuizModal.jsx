import React from 'react';
import Modal from '@/components/common/Modal';
import QuizRunner from './QuizRunner';
import { Sparkles } from 'lucide-react';

/**
 * QuizModal — pop-up dialog allowing students to generate and take
 * interactive multiple-choice AI quizzes directly from any post card or feed item.
 */
export function QuizModal({ isOpen, onClose, post }) {
  if (!isOpen || !post) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-surface-900 text-sm sm:text-base">
            AI Concept Quiz
          </span>
        </div>
      }
      description={
        <span className="truncate block max-w-lg text-surface-500 text-xs">
          {post.title}
        </span>
      }
    >
      <QuizRunner
        postId={post._id}
        postTitle={post.title}
        onClose={onClose}
      />
    </Modal>
  );
}

export default QuizModal;
