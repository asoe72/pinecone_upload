// --------------------------------------------------------
/// @return   정지 함수
/// @brief    ... spinner
// --------------------------------------------------------
export function startDotProgress() {

  const timer = setInterval(() => {
    process.stdout.write(".");
    }, 300);

  return () => {
    clearInterval(timer);
    process.stdout.write("\n"); // 줄바꿈
  };
}


// --------------------------------------------------------
/// @param[in]  percent   0~100
/// @brief    진행 막대
// --------------------------------------------------------
export function printProgressBar(percent) {
  const bar = "█".repeat(percent) + "-".repeat(100 - percent);
  const text = `\r[${bar}] ${Math.ceil(percent)}%`;
  const ansiEraseToEndOfLine = '\x1b[0K';
  process.stdout.write(`${text}${ansiEraseToEndOfLine}`);
}
