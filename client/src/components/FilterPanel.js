import React from 'react';
import './FilterPanel.css';

function FilterPanel({ authors, extensions, filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      author: '',
      fileExtension: '',
      since: '',
      until: ''
    });
  };

  const hasActiveFilters = filters.author || filters.fileExtension || filters.since || filters.until;

  return (
    <div className="filter-panel card">
      <div className="filter-header">
        <h2>Filters</h2>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn-clear">
            Clear All
          </button>
        )}
      </div>
      
      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="author-filter">Author:</label>
          <select
            id="author-filter"
            value={filters.author}
            onChange={(e) => handleChange('author', e.target.value)}
            className="filter-select"
          >
            <option value="">All Authors</option>
            {authors.map((author, idx) => (
              <option key={idx} value={author.email || author.name}>
                {author.name} {author.email ? `(${author.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="extension-filter">File Extension:</label>
          <select
            id="extension-filter"
            value={filters.fileExtension}
            onChange={(e) => handleChange('fileExtension', e.target.value)}
            className="filter-select"
          >
            <option value="">All Extensions</option>
            {extensions.map((ext, idx) => (
              <option key={idx} value={ext}>
                .{ext}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="since-filter">Since Date:</label>
          <input
            id="since-filter"
            type="date"
            value={filters.since}
            onChange={(e) => handleChange('since', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="until-filter">Until Date:</label>
          <input
            id="until-filter"
            type="date"
            value={filters.until}
            onChange={(e) => handleChange('until', e.target.value)}
            className="filter-input"
          />
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;

