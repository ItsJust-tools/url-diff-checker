'use client';

import React from 'react';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="diff-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Normalizations</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li className="flex justify-between gap-2">
            <span>Ignore query order</span>
            <span className="text-gray-500 dark:text-gray-400">
              {state.normalizations.ignoreQueryOrder ? 'on' : 'off'}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Ignore trailing slash</span>
            <span className="text-gray-500 dark:text-gray-400">
              {state.normalizations.ignoreTrailingSlash ? 'on' : 'off'}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Ignore host case</span>
            <span className="text-gray-500 dark:text-gray-400">
              {state.normalizations.ignoreHostCase ? 'on' : 'off'}
            </span>
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Comparisons</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} saved comparison{state.history.length === 1 ? '' : 's'}
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How it works</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Each URL is parsed into protocol, host, port, path segments, query parameters, and
          fragment. Parameter keys are labeled added, removed, changed, or same. Fragments are not
          compared.
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current inputs; open it to
          restore this comparison.
        </p>
      </div>
    </div>
  );
};
