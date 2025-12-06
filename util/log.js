import fs from 'fs';


// --------------------------------------------------------
export function logStrToUtf8Bom(str, pathname, first) {
  if (first && fs.existsSync(pathname)) {
    fs.rmSync(pathname);
  }
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const data = Buffer.concat([bom, Buffer.from(str, "utf8")]);
      fs.appendFileSync(pathname, data);
};
