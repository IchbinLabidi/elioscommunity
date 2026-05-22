export {
  createChapter,
  deleteChapter,
  updateChapter,
} from './courseContentService';

export async function reorderChapters() {
  throw new Error('Chapter reordering is not implemented yet. Use chapter_order while editing chapters.');
}
