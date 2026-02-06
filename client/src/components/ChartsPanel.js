import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './ChartsPanel.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea'];

function ChartsPanel({ data }) {
  const { stats } = data;

  // Prepare data for commits over time chart
  const commitsOverTime = stats.byDate.map(item => ({
    date: item.date,
    commits: item.commits,
    additions: item.additions,
    deletions: item.deletions,
    net: item.additions - item.deletions
  }));

  // All contributors for commit and line charts (with horizontal scroll when many)
  const allAuthorContributions = stats.byAuthor
    .sort((a, b) => b.commits - a.commits)
    .map(author => ({
      name: author.author.length > 20 ? author.author.substring(0, 20) + '...' : author.author,
      fullName: author.author,
      commits: author.commits,
      additions: author.additions,
      deletions: author.deletions
    }));

  // Prepare data for extension distribution
  const extensionData = stats.byExtension
    .sort((a, b) => b.files - a.files)
    .slice(0, 10)
    .map(ext => ({
      name: ext.extension || 'no-extension',
      files: ext.files,
      additions: ext.additions,
      deletions: ext.deletions
    }));

  // Folder stats: file count (current tree) and lines changed (from history)
  const folderFileCounts = data.folderFileCounts || [];
  const folderLinesData = (stats.byFolder || []).map(f => ({
    folder: f.folder,
    additions: f.additions,
    deletions: f.deletions,
    total: f.additions + f.deletions
  }));

  return (
    <div className="charts-panel">
      <div className="charts-grid charts-grid-full">
        <div className="chart-card card">
          <h3>Commits Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={commitsOverTime} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="commits" fill="#667eea" name="Commits" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card card">
          <h3>Lines Changed Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={commitsOverTime} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="additions"
                stroke="#48bb78"
                strokeWidth={2}
                name="Lines Added"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="deletions"
                stroke="#f56565"
                strokeWidth={2}
                name="Lines Deleted"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#764ba2"
                strokeWidth={2}
                name="Net Change"
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card card">
        <h3>All Contributors (Commits)</h3>
        <div className="chart-scroll-wrapper">
          <div
            className="chart-scroll-inner chart-scroll-inner-sm"
            style={{ minWidth: Math.max(600, allAuthorContributions.length * 70) }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={allAuthorContributions} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="commits" fill="#667eea" name="Commits" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-card card">
        <h3>Contributions by Author (Lines Changed)</h3>
        <div className="chart-scroll-wrapper">
          <div
            className="chart-scroll-inner"
            style={{ minWidth: Math.max(600, allAuthorContributions.length * 70) }}
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={allAuthorContributions} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="additions" stackId="a" fill="#48bb78" name="Additions" />
                <Bar dataKey="deletions" stackId="a" fill="#f56565" name="Deletions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid charts-grid-full">
        <div className="chart-card card">
          <h3>File Extensions Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={extensionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="files"
              >
                {extensionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card card">
          <h3>Files per Folder (current tree)</h3>
          <p className="chart-hint">Size of top-level folders by file count</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={folderFileCounts} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="folder" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="files" fill="#30cfd0" name="Files" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {folderLinesData.length > 0 && (
        <div className="chart-card card">
          <h3>Lines Changed per Folder</h3>
          <p className="chart-hint">Activity by top-level folder (additions + deletions in history)</p>
          <div className="chart-scroll-wrapper">
            <div
              className="chart-scroll-inner chart-scroll-inner-sm"
              style={{ minWidth: Math.max(600, folderLinesData.length * 70) }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={folderLinesData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="folder" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="additions" stackId="a" fill="#48bb78" name="Additions" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="deletions" stackId="a" fill="#f56565" name="Deletions" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartsPanel;

