// --------------------------------------------------------
export function printProgressBar(percent) {
  const bar = "█".repeat(percent) + "-".repeat(100 - percent);
  const text = `\r[${bar}] ${Math.ceil(percent)}%`;
  const ansiEraseToEndOfLine = '\x1b[0K';
  process.stdout.write(`${text}${ansiEraseToEndOfLine}`);
}
