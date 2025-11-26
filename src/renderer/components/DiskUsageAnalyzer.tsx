import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, HardDrive, Folder, File } from 'lucide-react';

const DiskUsageAnalyzer = ({ path = '/', isDarkMode = false }) => {
  const [folderTree, setFolderTree] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);

  useEffect(() => {
    analyzeFolder(path);
  }, [path]);

  const analyzeFolder = async (folderPath) => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.analyzeDiskUsage(folderPath);
      setFolderTree(result);
    } catch (err) {
      setError(`Failed to analyze folder: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getPercentage = (size, total) => {
    if (!total) return 0;
    return Math.round((size / total) * 100);
  };

  const getColorClass = (percentage) => {
    if (percentage > 50) return 'bg-red-500';
    if (percentage > 25) return 'bg-yellow-500';
    if (percentage > 10) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const FolderItem = ({ item, level = 0, parentSize = 0 }) => {
    const isExpanded = expandedFolders[item.path];
    const isFile = item.type === 'file';
    const percentage = getPercentage(item.size, parentSize || folderTree?.size);

    return (
      <div className="select-none">
        <div
          className={`flex items-center py-2 px-3 hover:${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          } rounded cursor-pointer transition-colors`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => !isFile && toggleFolder(item.path)}
          onMouseEnter={() => setSelectedPath(item.path)}
          onMouseLeave={() => setSelectedPath(null)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {!isFile ? (
              isExpanded ? (
                <ChevronDown size={18} className="text-gray-500" />
              ) : (
                <ChevronRight size={18} className="text-gray-500" />
              )
            ) : (
              <File size={18} className="text-gray-500" />
            )}
          </div>

          {/* Folder/File Icon and Name */}
          <div className="flex items-center gap-2 ml-2 flex-1 min-w-0">
            {!isFile && (
              <Folder size={16} className="text-yellow-500 flex-shrink-0" />
            )}
            <span
              className={`truncate text-sm ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}
            >
              {item.name}
            </span>
          </div>

          {/* Size Info */}
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <div className="text-right">
              <div
                className={`text-xs font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {formatBytes(item.size)}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}
              >
                {percentage}%
              </div>
            </div>

            {/* Progress Bar */}
            <div
              className="w-24 h-5 bg-gray-300 rounded overflow-hidden flex-shrink-0"
              title={`${formatBytes(item.size)} (${percentage}%)`}
            >
              <div
                className={`h-full ${getColorClass(percentage)} transition-all duration-300`}
                style={{ width: `${Math.max(5, percentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Render Children */}
        {!isFile && isExpanded && item.children && item.children.length > 0 && (
          <div>
            {item.children
              .sort((a, b) => b.size - a.size)
              .map((child, index) => (
                <FolderItem
                  key={index}
                  item={child}
                  level={level + 1}
                  parentSize={item.size}
                />
              ))}
          </div>
        )}

        {/* Empty Folder Message */}
        {!isFile &&
          isExpanded &&
          (!item.children || item.children.length === 0) && (
            <div
              className={`py-2 px-3 text-xs ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              } italic`}
              style={{ paddingLeft: `${(level + 1) * 20 + 12}px` }}
            >
              (empty folder)
            </div>
          )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className={`p-6 rounded-lg border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-center">
          <div
            className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
              isDarkMode ? 'border-blue-500' : 'border-blue-500'
            }`}
          />
          <span
            className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Analyzing disk usage...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-6 rounded-lg border ${
          isDarkMode
            ? 'bg-red-900/20 border-red-700'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  if (!folderTree) {
    return (
      <div
        className={`p-6 rounded-lg border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          No data to display
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <HardDrive
            size={24}
            className={isDarkMode ? 'text-blue-400' : 'text-blue-500'}
          />
          <div>
            <h3
              className={`font-semibold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}
            >
              Disk Usage Analyzer
            </h3>
            <p
              className={`text-xs mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {path}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div
            className={`p-3 rounded ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            <div
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Total Size
            </div>
            <div
              className={`text-lg font-bold mt-1 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}
            >
              {formatBytes(folderTree.size)}
            </div>
          </div>

          <div
            className={`p-3 rounded ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            <div
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Files
            </div>
            <div
              className={`text-lg font-bold mt-1 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}
            >
              {folderTree.fileCount || 0}
            </div>
          </div>

          <div
            className={`p-3 rounded ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            <div
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Folders
            </div>
            <div
              className={`text-lg font-bold mt-1 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}
            >
              {folderTree.folderCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tree View */}
      <div
        className={`overflow-auto max-h-96 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <FolderItem item={folderTree} level={0} parentSize={folderTree.size} />
      </div>

      {/* Legend */}
      <div
        className={`p-4 border-t text-xs ${
          isDarkMode
            ? 'border-gray-700 bg-gray-900 text-gray-400'
            : 'border-gray-200 bg-gray-50 text-gray-600'
        }`}
      >
        <div className="font-semibold mb-2">Usage Legend:</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>&lt; 10%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>10-25%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded" />
            <span>25-50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>&gt; 50%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiskUsageAnalyzer;
