// @ts-check
const { getProjects, workspaceRoot, readJsonFile, logger } = require('@nx/devkit');
const { readFile, writeFile } = require('node:fs/promises');
const { exit } = require('node:process');
const { FsTree } = require('nx/src/generators/tree');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');

const execAsync = promisify(exec);

const TABLE_START_MARKER = '<!-- TABLE_START -->';
const TABLE_END_MARKER = '<!-- TABLE_END -->';
const README_FILE = 'README.md';

const REPO_NAME = 'alfredo';
const REPO_OWNER = 'avivbens';

const TABLE_TEMPLATE = (lines) => `
| Workflow      | Description       | Latest Release    | Download Link     | Downloads         |
| ------------- | ----------------- | ----------------- | ----------------- | ----------------- |
${lines.join('\n')}
`;

/**
 * @param {String} projectName
 * @param {String} projectVersion
 * @param {String} projectDescription
 * @returns {String}
 */
function createReadmeLine(projectName, projectVersion, projectDescription) {
  const projectNameTitleCase = projectName.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const releaseUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/release/${projectName}/${projectVersion}`;
  const downloadUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/release/${projectName}/${projectVersion}/${projectName}_${projectVersion}.alfredworkflow`;

  const tagUrl = `https://img.shields.io/github/downloads/avivbens/alfredo/release%2F${projectName}%2F${projectVersion}/total?label=Version%20Downloads&color=blue`;
  const downloads = `[![Total Downloads](${tagUrl})](https://github.com/${REPO_OWNER}/${REPO_NAME}/releases)`;
  const toInsert = `| [${projectNameTitleCase}](./projects/packages/${projectName}/README.md) | ${projectDescription} | [v${projectVersion}](${releaseUrl}) | [Download Workflow](${downloadUrl}) | ${downloads} |`;

  return toInsert;
}

async function formatReadme() {
  await execAsync('npx prettier --write README.md');
}

/**
 * @param {String} table
 * @returns {Promise<void>}
 */
async function insertReleaseTable(table) {
  const readmeFile = await readFile(README_FILE, 'utf-8');
  const readmeLines = readmeFile.split('\n');

  const startTableIndex = readmeLines.findIndex((line) => line.includes(TABLE_START_MARKER));
  const endTableIndex = readmeLines.findIndex((line) => line.includes(TABLE_END_MARKER));

  if ([endTableIndex, startTableIndex].includes(-1)) {
    logger.error('Table start or end marker not found in README.md');
    exit(1);
  }

  const toInsert = table.split('\n');
  readmeLines.splice(startTableIndex + 1, endTableIndex - startTableIndex - 1, ...toInsert);

  return writeFile(README_FILE, readmeLines.join('\n'));
}

/**
 * @param {Record<String, import('@nx/devkit').ProjectConfiguration>} projects
 * @returns {String}
 */
function buildTable(projects) {
  const lines = Object.entries(projects).map(([projectName, projectConfig]) => {
    const type = projectConfig.projectType;
    if (type !== 'application') {
      return null;
    }

    const projectRoot = projectConfig.root;
    const packageJson = readJsonFile(`${projectRoot}/package.json`);

    const projectVersion = packageJson.version;
    const projectDescription = packageJson.description;

    return createReadmeLine(projectName, projectVersion, projectDescription);
  });

  const linesToInsert = lines.filter(Boolean);
  const table = TABLE_TEMPLATE(linesToInsert);

  return table;
}

(async () => {
  const tree = new FsTree(workspaceRoot, false);
  const projectsMap = getProjects(tree);
  const projects = Object.fromEntries(projectsMap);

  const table = buildTable(projects);

  await insertReleaseTable(table);

  await formatReadme();
})();
