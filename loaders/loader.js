import { loadMetadatas_HRBook } from './hrbook/loader_hrbook.js';
import { colorStrRed } from '../util/color_str.js';


// --------------------------------------------------------
/// @return       metadatas
// --------------------------------------------------------
export async function loadMetadatasAll() {

  console.log('');
  console.log('==============================================');
  console.log('[1/3] LOADING SOURCE DOCUMENTS');

  try {
    const metadatas = [];
    const metadatasSub = await loadMetadatas_HRBook(process.env.PATHNAME_HRBOOK);
    metadatas.push(...metadatasSub);
    return metadatas;
  }
  catch(err) {
    console.error(colorStrRed(`Failed to read or parse ${env.PATHNAME_HRBOOK}\n`), err.message);
    return -1;
  }
}
