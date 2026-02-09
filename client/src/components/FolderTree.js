import React, { useState, useMemo } from 'react';
import './FolderTree.css';

// Build root-level items and child lookup from fullFolderTree
function useFullTree(fullFolderTree) {
  return useMemo(() => {
    if (!fullFolderTree || !fullFolderTree.root) return null;
    const { root, folderStats, folderChildren } = fullFolderTree;
    const getChildren = (folderPath) => {
      const c = folderChildren[folderPath];
      if (!c) return [];
      const folderNodes = (c.folders || []).map(path => ({
        type: 'folder',
        path,
        name: path.split('/').pop()
      }));
      const fileNodes = (c.files || []).map(name => ({
        type: 'file',
        name,
        parentPath: folderPath
      }));
      return [...folderNodes, ...fileNodes];
    };
    const rootItems = [
      ...(root.folders || []).map(path => ({ type: 'folder', path, name: path.split('/').pop() })),
      ...(root.files || []).map(name => ({ type: 'file', name, parentPath: '' }))
    ];
    return { rootItems, folderStats: folderStats || {}, getChildren };
  }, [fullFolderTree]);
}

// Legacy 2-level tree when fullFolderTree is not available
function buildLegacyTree(data) {
  const folderFileCounts = data.folderFileCounts || [];
  const folderSubfolderFileCounts = data.folderSubfolderFileCounts || [];
  const byFolder = (data.stats && data.stats.byFolder) || [];
  const byFolderSubfolder = (data.stats && data.stats.byFolderSubfolder) || [];

  const filesByPath = {};
  folderFileCounts.forEach(({ folder, files }) => { filesByPath[folder] = files; });
  folderSubfolderFileCounts.forEach(({ folderSubfolder, files }) => { filesByPath[folderSubfolder] = files; });

  const linesByPath = {};
  byFolder.forEach(({ folder, additions, deletions }) => {
    linesByPath[folder] = { additions, deletions };
  });
  byFolderSubfolder.forEach(({ folderSubfolder, additions, deletions }) => {
    linesByPath[folderSubfolder] = { additions, deletions };
  });

  const topLevelPaths = [...new Set([
    ...folderFileCounts.map(({ folder }) => folder),
    ...folderSubfolderFileCounts.map(({ folderSubfolder }) => folderSubfolder.split('/')[0])
  ])].filter(Boolean).sort();

  const tree = topLevelPaths.map(path => {
    const children = folderSubfolderFileCounts
      .filter(({ folderSubfolder }) => folderSubfolder.startsWith(path + '/'))
      .map(({ folderSubfolder, files }) => {
        const name = folderSubfolder.slice(path.length + 1);
        const lineStats = linesByPath[folderSubfolder] || { additions: 0, deletions: 0 };
        return {
          path: folderSubfolder,
          name,
          files: files || 0,
          additions: lineStats.additions || 0,
          deletions: lineStats.deletions || 0,
          children: []
        };
      })
      .sort((a, b) => b.files - a.files);

    const lineStats = linesByPath[path] || { additions: 0, deletions: 0 };
    return {
      path,
      name: path,
      files: filesByPath[path] || 0,
      additions: lineStats.additions || 0,
      deletions: lineStats.deletions || 0,
      children
    };
  });

  return tree.sort((a, b) => b.files - a.files);
}

function FullTreeRow({ node, depth, expandedSet, onToggle, folderStats, getChildren }) {
  if (node.type === 'file') {
    const key = node.parentPath ? `${node.parentPath}/${node.name}` : node.name;
    return (
      <div className="folder-tree-row folder-tree-row--file" key={key}>
        <span className="folder-tree-cell folder-tree-cell--name" style={{ paddingLeft: 12 + depth * 20 }}>
          <span className="folder-tree-chevron folder-tree-chevron--leaf" />
          <span className="folder-tree-label folder-tree-label--file">{node.name}</span>
        </span>
        <span className="folder-tree-cell folder-tree-cell--files">—</span>
        <span className="folder-tree-cell folder-tree-cell--additions">—</span>
        <span className="folder-tree-cell folder-tree-cell--deletions">—</span>
        <span className="folder-tree-cell folder-tree-cell--total">—</span>
      </div>
    );
  }

  const stats = folderStats[node.path] || { files: 0, additions: 0, deletions: 0 };
  const children = getChildren(node.path);
  const hasChildren = children.length > 0;
  const isExpanded = expandedSet.has(node.path);
  const totalLines = (stats.additions || 0) + (stats.deletions || 0);

  return (
    <>
      <div
        className={`folder-tree-row ${hasChildren ? 'folder-tree-row--expandable' : ''}`}
        onClick={hasChildren ? () => onToggle(node.path) : undefined}
        key={node.path}
      >
        <span className="folder-tree-cell folder-tree-cell--name" style={{ paddingLeft: 12 + depth * 20 }}>
          {hasChildren && (
            <span className="folder-tree-chevron" aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="folder-tree-chevron folder-tree-chevron--leaf" />}
          <span className="folder-tree-label">{node.name}</span>
        </span>
        <span className="folder-tree-cell folder-tree-cell--files">{stats.files}</span>
        <span className="folder-tree-cell folder-tree-cell--additions">{(stats.additions || 0).toLocaleString()}</span>
        <span className="folder-tree-cell folder-tree-cell--deletions">{(stats.deletions || 0).toLocaleString()}</span>
        <span className="folder-tree-cell folder-tree-cell--total">{totalLines.toLocaleString()}</span>
      </div>
      {hasChildren && isExpanded && children.map(child =>
        child.type === 'file' ? (
          <FullTreeRow
            key={child.parentPath ? `${child.parentPath}/${child.name}` : child.name}
            node={child}
            depth={depth + 1}
            expandedSet={expandedSet}
            onToggle={onToggle}
            folderStats={folderStats}
            getChildren={getChildren}
          />
        ) : (
          <FullTreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedSet={expandedSet}
            onToggle={onToggle}
            folderStats={folderStats}
            getChildren={getChildren}
          />
        )
      )}
    </>
  );
}

function FolderRow({ node, depth, expandedSet, onToggle }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedSet.has(node.path);
  const totalLines = node.additions + node.deletions;

  return (
    <>
      <div
        className={`folder-tree-row ${hasChildren ? 'folder-tree-row--expandable' : ''}`}
        onClick={hasChildren ? () => onToggle(node.path) : undefined}
      >
        <span className="folder-tree-cell folder-tree-cell--name" style={{ paddingLeft: 12 + depth * 20 }}>
          {hasChildren && (
            <span className="folder-tree-chevron" aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="folder-tree-chevron folder-tree-chevron--leaf" />}
          <span className="folder-tree-label">{node.name}</span>
        </span>
        <span className="folder-tree-cell folder-tree-cell--files">{node.files}</span>
        <span className="folder-tree-cell folder-tree-cell--additions">{node.additions.toLocaleString()}</span>
        <span className="folder-tree-cell folder-tree-cell--deletions">{node.deletions.toLocaleString()}</span>
        <span className="folder-tree-cell folder-tree-cell--total">{totalLines.toLocaleString()}</span>
      </div>
      {hasChildren && isExpanded && node.children.map(child => (
        <FolderRow
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedSet={expandedSet}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

function FolderTree({ data }) {
  const [expanded, setExpanded] = useState(new Set());
  const fullTree = useFullTree(data?.fullFolderTree);
  const legacyTree = useMemo(() => fullTree ? null : buildLegacyTree(data || {}), [data, fullTree]);

  const toggle = (path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (fullTree) {
    const { rootItems, folderStats, getChildren } = fullTree;
    if (!rootItems.length) return null;
    return (
      <div className="folder-tree card">
        <h3>Folder & project breakdown</h3>
        <p className="folder-tree-hint">Expand any folder to see subfolders and files. Line stats are from git history.</p>
        <div className="folder-tree-table">
          <div className="folder-tree-header">
            <span className="folder-tree-cell folder-tree-cell--name">Folder / file</span>
            <span className="folder-tree-cell folder-tree-cell--files">Files</span>
            <span className="folder-tree-cell folder-tree-cell--additions">+ Lines</span>
            <span className="folder-tree-cell folder-tree-cell--deletions">− Lines</span>
            <span className="folder-tree-cell folder-tree-cell--total">Total</span>
          </div>
          {rootItems.map(node =>
            node.type === 'file' ? (
              <FullTreeRow
                key={node.parentPath ? `${node.parentPath}/${node.name}` : node.name}
                node={node}
                depth={0}
                expandedSet={expanded}
                onToggle={toggle}
                folderStats={folderStats}
                getChildren={getChildren}
              />
            ) : (
              <FullTreeRow
                key={node.path}
                node={node}
                depth={0}
                expandedSet={expanded}
                onToggle={toggle}
                folderStats={folderStats}
                getChildren={getChildren}
              />
            )
          )}
        </div>
      </div>
    );
  }

  if (!legacyTree?.length) return null;
  return (
    <div className="folder-tree card">
      <h3>Folder & project breakdown</h3>
      <p className="folder-tree-hint">Expand a folder to see subfolders and projects (e.g. src → projects)</p>
      <div className="folder-tree-table">
        <div className="folder-tree-header">
          <span className="folder-tree-cell folder-tree-cell--name">Folder / project</span>
          <span className="folder-tree-cell folder-tree-cell--files">Files</span>
          <span className="folder-tree-cell folder-tree-cell--additions">+ Lines</span>
          <span className="folder-tree-cell folder-tree-cell--deletions">− Lines</span>
          <span className="folder-tree-cell folder-tree-cell--total">Total</span>
        </div>
        {legacyTree.map(node => (
          <FolderRow
            key={node.path}
            node={node}
            depth={0}
            expandedSet={expanded}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}

export default FolderTree;
