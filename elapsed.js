
// --------------------------------------------------------
export async function printElapsedTime(start) {
  const end = Date.now();
  let elapsed = end - start;
  
  const hours = Math.floor(elapsed / (60 * 60 * 1000));
  elapsed %= (60 * 60 * 1000);
  
  const mins = Math.floor(elapsed / (60 * 1000));
  elapsed %= (60 * 1000);

  const secs = Math.floor(elapsed / 1000);

  console.log(`Elapsed time = ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
}
