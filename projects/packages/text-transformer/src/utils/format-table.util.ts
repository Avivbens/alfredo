export const formatMarkdownTable = (input: string): string => {
  const lines = input.trim().split('\n');
  const tableLines: string[] = [];
  let inTable = false;
  let columnWidths: number[] = [];

  // First pass: identify tables and calculate column widths
  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        columnWidths = [];
      }

      // Split by pipe and remove empty first/last elements
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

      // Update column widths
      cells.forEach((cell, index) => {
        const cellLength = cell.replace(/^:?-+:?$/, '---').length;
        columnWidths[index] = Math.max(columnWidths[index] || 0, cellLength);
      });
    } else {
      inTable = false;
    }
  }

  // Second pass: format tables with proper alignment
  inTable = false;
  let currentTableColumns: number[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTableColumns = [];
      }

      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

      // Update column widths for this table
      if (currentTableColumns.length === 0) {
        cells.forEach((cell, index) => {
          const cellLength = cell.replace(/^:?-+:?$/, '---').length;
          currentTableColumns[index] = Math.max(currentTableColumns[index] || 0, cellLength);
        });

        // Do another pass for all rows in this table
        let tempIndex = lines.indexOf(line);
        while (tempIndex < lines.length && lines[tempIndex]?.trim().startsWith('|')) {
          const tempCells = lines[tempIndex]
            ?.split('|')
            .slice(1, -1)
            .map((cell) => cell.trim());
          tempCells?.forEach((cell, idx) => {
            const cellLength = cell.replace(/^:?-+:?$/, '---').length;
            currentTableColumns[idx] = Math.max(currentTableColumns[idx] || 3, cellLength);
          });
          tempIndex++;
        }
      }

      // Format cells with padding
      const formattedCells = cells.map((cell, index) => {
        const width = currentTableColumns[index] || 3;

        // Handle separator rows
        if (cell.match(/^:?-+:?$/)) {
          if (cell.startsWith(':') && cell.endsWith(':')) {
            return ':' + '-'.repeat(Math.max(width - 2, 1)) + ':';
          } else if (cell.startsWith(':')) {
            return ':' + '-'.repeat(Math.max(width - 1, 2));
          } else if (cell.endsWith(':')) {
            return '-'.repeat(Math.max(width - 1, 2)) + ':';
          } else {
            return '-'.repeat(Math.max(width, 3));
          }
        }

        // Regular cells - pad with spaces
        return cell.padEnd(width, ' ');
      });

      tableLines.push('| ' + formattedCells.join(' | ') + ' |');
    } else {
      inTable = false;
      tableLines.push(line);
    }
  }

  return tableLines.join('\n');
};
