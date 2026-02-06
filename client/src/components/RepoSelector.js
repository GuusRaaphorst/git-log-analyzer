import React, { useState } from 'react';
import './RepoSelector.css';

function RepoSelector({ repoPath, onRepoChange, repoInfo }) {
  const [inputPath, setInputPath] = useState(repoPath);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputPath.trim()) {
      onRepoChange(inputPath.trim());
    }
  };

  return (
    <div className="repo-selector card">
      <h2>Repository Selection</h2>
      <form onSubmit={handleSubmit} className="repo-form">
        <div className="form-group">
          <label htmlFor="repo-path">Git Repository Path:</label>
          <input
            id="repo-path"
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="Enter path to git repository (e.g., C:\Projects\my-repo or ./my-repo)"
            className="repo-input"
          />
        </div>
        <button type="submit" className="btn-primary">
          Load Repository
        </button>
      </form>
      
      {repoInfo && (
        <div className="repo-info">
          <div className="info-item">
            <span className="info-label">Branch:</span>
            <span className="info-value">{repoInfo.currentBranch}</span>
          </div>
          {repoInfo.remotes && repoInfo.remotes.length > 0 && (
            <div className="info-item">
              <span className="info-label">Remotes:</span>
              <span className="info-value">{repoInfo.remotes.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RepoSelector;

