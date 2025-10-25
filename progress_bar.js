// --------------------------------------------------------
export function printProgressBar(percent) {
  const bar = "█".repeat(percent) + "-".repeat(100 - percent);
  process.stdout.write(`\r[${bar}] ${Math.ceil(percent)}%`);
}
