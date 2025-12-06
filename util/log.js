import fs from 'fs';


// --------------------------------------------------------
export function logStrToUtf8Bom(str, pathname, first) {
  if (first) {
    if (fs.existsSync(pathname)) {
      fs.rmSync(pathname);
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      fs.appendFileSync(pathname, bom);
    } 
  }
  fs.appendFileSync(pathname, Buffer.from(str, "utf8"));
};
