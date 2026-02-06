import React from 'react';
import './StatsOverview.css';

function StatsOverview({ stats }) {
  const statCards = [
    {
      label: 'Total Commits',
      value: stats.totalCommits,
      icon: '📝',
      color: '#667eea'
    },
    {
      label: 'Total Files',
      value: stats.totalFiles,
      icon: '📁',
      color: '#48bb78'
    },
    {
      label: 'Lines Added',
      value: stats.totalAdditions.toLocaleString(),
      icon: '➕',
      color: '#38b2ac'
    },
    {
      label: 'Lines Deleted',
      value: stats.totalDeletions.toLocaleString(),
      icon: '➖',
      color: '#ed8936'
    },
    {
      label: 'Net Change',
      value: (stats.totalAdditions - stats.totalDeletions).toLocaleString(),
      icon: '📊',
      color: stats.totalAdditions - stats.totalDeletions >= 0 ? '#48bb78' : '#f56565'
    }
  ];

  return (
    <div className="stats-overview">
      {statCards.map((stat, idx) => (
        <div key={idx} className="stat-card" style={{ borderTopColor: stat.color }}>
          <div className="stat-icon">{stat.icon}</div>
          <div className="stat-content">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsOverview;

