import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import FilterPanel from './components/FilterPanel';
import StatsOverview from './components/StatsOverview';
import ChartsPanel from './components/ChartsPanel';
import RepoSelector from './components/RepoSelector';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [repoPath, setRepoPath] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [extensions, setExtensions] = useState([]);
  
  const [filters, setFilters] = useState({
    author: '',
    fileExtension: '',
    since: '',
    until: ''
  });

  useEffect(() => {
    if (repoPath) {
      loadRepoInfo();
      loadAuthors();
      loadExtensions();
    }
  }, [repoPath]);

  useEffect(() => {
    if (repoPath) {
      loadData();
    }
  }, [repoPath, filters]);

  const loadRepoInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/repo-info`, {
        params: { path: repoPath }
      });
      setRepoInfo(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load repository info');
      setRepoInfo(null);
    }
  };

  const loadAuthors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/authors`, {
        params: { path: repoPath }
      });
      setAuthors(response.data.authors);
    } catch (err) {
      console.error('Failed to load authors:', err);
    }
  };

  const loadExtensions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/file-extensions`, {
        params: { path: repoPath }
      });
      setExtensions(response.data.extensions);
    } catch (err) {
      console.error('Failed to load extensions:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/analyze`, {
        params: {
          path: repoPath,
          ...filters
        }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze repository');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRepoChange = (path) => {
    setRepoPath(path);
    setData(null);
    setFilters({
      author: '',
      fileExtension: '',
      since: '',
      until: ''
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📊 Git Log Analyzer</h1>
        <p>Visualize your codebase changes over time</p>
      </header>

      <div className="App-container">
        <RepoSelector 
          repoPath={repoPath}
          onRepoChange={handleRepoChange}
          repoInfo={repoInfo}
        />

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {repoInfo && (
          <>
            <FilterPanel
              authors={authors}
              extensions={extensions}
              filters={filters}
              onFilterChange={handleFilterChange}
            />

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Analyzing repository...</p>
              </div>
            )}

            {data && !loading && (
              <>
                <StatsOverview stats={data} />
                <ChartsPanel data={data} />
              </>
            )}
          </>
        )}

        {!repoInfo && !error && (
          <div className="welcome-message">
            <h2>Welcome to Git Log Analyzer</h2>
            <p>Enter a path to a git repository to get started</p>
            <p className="hint">💡 Tip: You can use an absolute path or a relative path from the server directory</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

