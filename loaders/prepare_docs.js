import { hrbook_cloneOrPullRepos } from './hrbook/hrbook_clone.js';


// --------------------------------------------------------
export async function prepareDocs() {

  await hrbook_cloneOrPullRepos(process.env.PATHNAME_HRBOOK);
}
