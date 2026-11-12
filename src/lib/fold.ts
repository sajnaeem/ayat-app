/** Folds spellings together so "yaseen", "Ya-Sin" and "yasin" all match, and "kahf" finds "Al-Kahf". */
export const fold = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/^(al|an|ar|as|at|ad|adh|ash|az)(?=[a-z]{3})/, '');
