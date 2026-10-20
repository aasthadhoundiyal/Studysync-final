import React, { useState } from 'react';
import Modal from '@/components/common/Modal';
import Tabs from '@/components/common/Tabs';
import AISummaryCard from './AISummaryCard';
import AIKeywordsCard from './AIKeywordsCard';
import { Sparkles, FileText, Tag } from 'lucide-react';

/**
 * AISummaryModal — modal dialog allowing students to view an AI-generated
 * summary and extracted keywords directly from any post card in the feed.
 */
export function AISummaryModal({ isOpen, onClose, post, initialTab = 'summary' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen || !post) return null;

  const tabs = [
    {
      id: 'summary',
      label: 'Executive Summary',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: 'keywords',
      label: 'Key Concepts & Topics',
      icon: <Tag className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-surface-900 text-sm sm:text-base">
            AI Study Insights
          </span>
        </div>
      }
      description={
        <span className="truncate block max-w-md text-surface-500 text-xs">
          {post.title}
        </span>
      }
    >
      <div className="space-y-4">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />

        {activeTab === 'summary' ? (
          <AISummaryCard postId={post._id} postTitle={post.title} />
        ) : (
          <AIKeywordsCard postId={post._id} postTitle={post.title} />
        )}
      </div>
    </Modal>
  );
}

export default AISummaryModal;
