# Git Log Analyzer

A beautiful web application to analyze git logs and visualize codebase changes over time. Features interactive charts, filtering by author and file extension, and comprehensive statistics.

## Features

- 📊 **Interactive Charts**: Visualize commits, additions, deletions, and net changes over time
- 👥 **Author Filtering**: Filter commits by specific authors
- 📁 **File Extension Filtering**: Analyze changes by file type
- 📅 **Date Range Filtering**: Filter commits by date range
- 📈 **Multiple Visualizations**: 
  - Commits over time (line chart)
  - Top contributors (bar chart)
  - File extensions distribution (pie chart)
  - Contributions by author (stacked bar chart)
- 🎨 **Modern UI**: Beautiful gradient design with responsive layout

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git installed on your system
- A git repository to analyze

## Installation

1. Clone or navigate to this repository:
   ```bash
   cd git-log-analyzer
   ```

2. Install all dependencies (root, server, and client):
   ```bash
   npm run install-all
   ```

   Or install them separately:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

## Running the Application

### Option 1: Run both server and client together (Recommended)
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

### Option 2: Run separately

**Terminal 1 - Start the backend server:**
```bash
npm run server
```

**Terminal 2 - Start the frontend client:**
```bash
npm run client
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`

2. Enter the path to a git repository in the "Repository Selection" field:
   - You can use an absolute path: `C:\Projects\my-repo` or `/home/user/my-repo`
   - Or a relative path from the server directory: `./my-repo` or `../other-repo`

3. Click "Load Repository" to analyze the repository

4. Use the filters to:
   - Filter by author
   - Filter by file extension
   - Set date range (since/until)

5. Explore the visualizations:
   - **Stats Overview**: Quick summary cards
   - **Commits Over Time**: Line chart showing trends
   - **Top Contributors**: Bar chart of most active contributors
   - **File Extensions**: Pie chart of file type distribution
   - **Contributions by Author**: Stacked bar chart showing additions/deletions

## Project Structure

```
git-log-analyzer/
├── server/                 # Backend Express server
│   ├── server.js          # Main server file with API endpoints
│   └── package.json       # Server dependencies
├── client/                # Frontend React application
│   ├── public/           # Static files
│   ├── src/              # React source code
│   │   ├── components/   # React components
│   │   ├── App.js        # Main app component
│   │   └── index.js      # Entry point
│   └── package.json      # Client dependencies
├── package.json          # Root package.json with scripts
└── README.md            # This file
```

## API Endpoints

- `GET /api/repo-info?path=<repo-path>` - Get repository information
- `GET /api/analyze?path=<repo-path>&author=<author>&fileExtension=<ext>&since=<date>&until=<date>` - Analyze git logs
- `GET /api/authors?path=<repo-path>` - Get list of authors
- `GET /api/file-extensions?path=<repo-path>` - Get list of file extensions

## Technologies Used

- **Frontend**: React, Recharts, Axios, CSS3
- **Backend**: Node.js, Express, Simple Git
- **Development**: Concurrently (for running both servers)

## Troubleshooting

### "Not a git repository" error
- Make sure the path you entered points to a valid git repository
- Use absolute paths if relative paths don't work
- On Windows, use forward slashes or escaped backslashes: `C:/Projects/repo` or `C:\\Projects\\repo`

### Server not starting
- Make sure port 3001 is not already in use
- Check that all dependencies are installed: `npm run install-all`

### Client not starting
- Make sure port 3000 is not already in use
- Try clearing the cache: `cd client && rm -rf node_modules && npm install`

## License

MIT

