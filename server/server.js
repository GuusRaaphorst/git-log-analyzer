import express from 'express';
import cors from 'cors';
import { simpleGit } from 'simple-git';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Large repos can produce huge git log output; default exec maxBuffer is 1MB
const EXEC_MAX_BUFFER = 100 * 1024 * 1024; // 100MB

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Get git repository path from query or use current directory
app.get('/api/repo-info', async (req, res) => {
  try {
    const repoPath = req.query.path || process.cwd();

    // Basic validation: reject URLs and ensure path exists
    if (/^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i.test(repoPath)) {
      return res.status(400).json({
        error:
          'The repository path must be a local filesystem path, not a URL. ' +
          'Example: D:/Projects/my-repo or ../my-repo'
      });
    }

    if (!fs.existsSync(repoPath) || !fs.lstatSync(repoPath).isDirectory()) {
      return res.status(400).json({
        error: `The path "${repoPath}" does not exist or is not a directory. ` +
          'Please provide a valid local path to a git repository.'
      });
    }
    const git = simpleGit(repoPath);
    
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    const remotes = await git.getRemotes(true);
    const status = await git.status();
    
    res.json({
      isRepo: true,
      remotes: remotes.map(r => r.name),
      currentBranch: status.current,
      path: repoPath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze git logs with filters
app.get('/api/analyze', async (req, res) => {
  try {
    const repoPath = req.query.path || process.cwd();
    const author = req.query.author || '';
    const fileExtension = req.query.fileExtension || '';
    const since = req.query.since || '';
    const until = req.query.until || '';

    // Use execFile with args so the shell doesn't mangle quoting (fixes Windows)
    const args = [
      'log',
      '--pretty=format:%H|%an|%ae|%ad|%s',
      '--date=iso',
      '--numstat'
    ];
    // When filtering by email we filter in JS (case-insensitive); otherwise use git --author
    const authorIsEmail = author && author.includes('@');
    if (author && !authorIsEmail) {
      args.push('--author', author);
    }
    if (since) {
      args.push('--since', since);
    }
    if (until) {
      args.push('--until', until);
    }

    const { stdout } = await execFileAsync('git', args, {
      cwd: repoPath,
      maxBuffer: EXEC_MAX_BUFFER
    });
    
    let commits = parseGitLog(stdout, fileExtension);
    if (authorIsEmail) {
      const authorLower = author.toLowerCase();
      commits = commits.filter(c => (c.email || '').toLowerCase() === authorLower);
    }
    const stats = calculateStats(commits);

    // Current tree: file count per top-level folder (for "size by folder")
    const { stdout: lsTreeOut } = await execFileAsync('git', [
      'ls-tree', '-r', '--name-only', 'HEAD'
    ], { cwd: repoPath, maxBuffer: EXEC_MAX_BUFFER });
    const folderFileCounts = getFolderFileCounts(lsTreeOut);

    res.json({
      commits,
      stats,
      folderFileCounts,
      totalCommits: commits.length,
      totalFiles: stats.totalFiles,
      totalAdditions: stats.totalAdditions,
      totalDeletions: stats.totalDeletions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of authors (execFile avoids shell/pipe so it works on Windows)
app.get('/api/authors', async (req, res) => {
  try {
    const repoPath = req.query.path || process.cwd();
    const { stdout } = await execFileAsync('git', [
      'log',
      '--pretty=format:%an|%ae'
    ], { cwd: repoPath, maxBuffer: EXEC_MAX_BUFFER });

    // Merge by email (case-insensitive); pick most common name as display name
    const byEmail = new Map(); // emailLower -> { nameCounts: { name: count }, canonicalEmail }
    stdout
      .split('\n')
      .filter(line => line.trim())
      .forEach(line => {
        const [name, email] = line.split('|').map(s => (s || '').trim());
        if (!email) return;
        const emailLower = email.toLowerCase();
        if (!byEmail.has(emailLower)) {
          byEmail.set(emailLower, { nameCounts: {}, canonicalEmail: email });
        }
        const entry = byEmail.get(emailLower);
        entry.nameCounts[name] = (entry.nameCounts[name] || 0) + 1;
      });

    const authors = Array.from(byEmail.entries())
      .map(([emailLower, { nameCounts, canonicalEmail }]) => {
        const displayName = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0][0];
        return { name: displayName, email: canonicalEmail };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ authors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get file extensions in repository (no grep/sed so it works on Windows)
app.get('/api/file-extensions', async (req, res) => {
  try {
    const repoPath = req.query.path || process.cwd();
    const { stdout } = await execFileAsync('git', [
      'ls-tree', '-r', '--name-only', 'HEAD'
    ], { cwd: repoPath, maxBuffer: EXEC_MAX_BUFFER });

    const extRe = /\.[a-zA-Z0-9]+$/;
    const extensionsSet = new Set();
    stdout.split('\n').forEach(line => {
      const name = line.trim();
      const match = name.match(extRe);
      if (match) {
        extensionsSet.add(match[0].slice(1)); // drop leading dot
      }
    });
    const extensions = [...extensionsSet].sort();

    res.json({ extensions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function parseGitLog(logOutput, fileExtensionFilter = '') {
  const commits = [];
  const lines = logOutput.split('\n');
  
  let currentCommit = null;
  
  for (const line of lines) {
    if (line.includes('|') && !line.match(/^\d+\s+\d+/)) {
      // This is a commit header
      if (currentCommit) {
        commits.push(currentCommit);
      }
      
      const [hash, authorName, authorEmail, date, ...messageParts] = line.split('|');
      currentCommit = {
        hash: hash.trim(),
        author: authorName.trim(),
        email: authorEmail.trim(),
        date: new Date(date.trim()),
        message: messageParts.join('|').trim(),
        files: [],
        additions: 0,
        deletions: 0
      };
    } else if (line.match(/^\d+\s+\d+/) && currentCommit) {
      // This is a file stat line (additions deletions filename)
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const additions = parseInt(parts[0]) || 0;
        const deletions = parseInt(parts[1]) || 0;
        const filename = parts.slice(2).join('\t');
        const ext = filename.includes('.') 
          ? filename.substring(filename.lastIndexOf('.') + 1)
          : '';
        
        if (!fileExtensionFilter || ext === fileExtensionFilter) {
          currentCommit.files.push({
            filename,
            extension: ext,
            additions,
            deletions
          });
          currentCommit.additions += additions;
          currentCommit.deletions += deletions;
        }
      }
    }
  }
  
  if (currentCommit) {
    commits.push(currentCommit);
  }
  
  return commits;
}

function getFolderFileCounts(lsTreeOutput) {
  const byFolder = {};
  lsTreeOutput.split('\n').forEach(line => {
    const name = line.trim();
    if (!name) return;
    const parts = name.split('/');
    const folder = parts.length > 1 ? parts[0] : '(root)';
    byFolder[folder] = (byFolder[folder] || 0) + 1;
  });
  return Object.entries(byFolder)
    .map(([folder, files]) => ({ folder, files }))
    .sort((a, b) => b.files - a.files);
}

function calculateStats(commits) {
  const stats = {
    totalFiles: new Set(),
    totalAdditions: 0,
    totalDeletions: 0,
    byDate: {},
    byAuthor: {},
    byExtension: {},
    byFolder: {}
  };

  // Merge authors by email (case-insensitive); track name counts to pick display name
  const authorNameCounts = {}; // emailKey -> { name -> count }

  commits.forEach(commit => {
    const dateKey = commit.date.toISOString().split('T')[0];
    
    // By date
    if (!stats.byDate[dateKey]) {
      stats.byDate[dateKey] = {
        date: dateKey,
        commits: 0,
        additions: 0,
        deletions: 0,
        files: 0
      };
    }
    stats.byDate[dateKey].commits += 1;
    stats.byDate[dateKey].additions += commit.additions;
    stats.byDate[dateKey].deletions += commit.deletions;
    stats.byDate[dateKey].files += commit.files.length;

    // By author (keyed by lowercase email so same person = one entry)
    const emailKey = (commit.email || '').toLowerCase();
    if (!stats.byAuthor[emailKey]) {
      stats.byAuthor[emailKey] = {
        author: commit.author,
        email: commit.email,
        commits: 0,
        additions: 0,
        deletions: 0
      };
      authorNameCounts[emailKey] = {};
    }
    stats.byAuthor[emailKey].commits += 1;
    stats.byAuthor[emailKey].additions += commit.additions;
    stats.byAuthor[emailKey].deletions += commit.deletions;
    authorNameCounts[emailKey][commit.author] = (authorNameCounts[emailKey][commit.author] || 0) + 1;
  });

  // Set display name to the most common name for that email
  Object.keys(stats.byAuthor).forEach(emailKey => {
    const counts = authorNameCounts[emailKey];
    if (counts) {
      const topName = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      stats.byAuthor[emailKey].author = topName;
    }
  });

  commits.forEach(commit => {

    // By extension
    commit.files.forEach(file => {
      const ext = file.extension || 'no-extension';
      if (!stats.byExtension[ext]) {
        stats.byExtension[ext] = {
          extension: ext,
          files: 0,
          additions: 0,
          deletions: 0
        };
      }
      stats.byExtension[ext].files += 1;
      stats.byExtension[ext].additions += file.additions;
      stats.byExtension[ext].deletions += file.deletions;
    });

    // By folder (top-level path segment; shows "activity" / size by folder from history)
    commit.files.forEach(file => {
      const parts = file.filename.split('/');
      const folder = parts.length > 1 ? parts[0] : '(root)';
      if (!stats.byFolder[folder]) {
        stats.byFolder[folder] = {
          folder,
          files: 0,
          additions: 0,
          deletions: 0
        };
      }
      stats.byFolder[folder].files += 1;
      stats.byFolder[folder].additions += file.additions;
      stats.byFolder[folder].deletions += file.deletions;
    });

    // Totals
    commit.files.forEach(file => stats.totalFiles.add(file.filename));
    stats.totalAdditions += commit.additions;
    stats.totalDeletions += commit.deletions;
  });

  return {
    ...stats,
    totalFiles: stats.totalFiles.size,
    byDate: Object.values(stats.byDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    ),
    byAuthor: Object.values(stats.byAuthor),
    byExtension: Object.values(stats.byExtension),
    byFolder: Object.values(stats.byFolder).sort((a, b) => 
      (b.additions + b.deletions) - (a.additions + a.deletions)
    )
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

