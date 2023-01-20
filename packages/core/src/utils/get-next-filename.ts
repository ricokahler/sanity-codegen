import path from 'path';

interface GetNextFilenameOptions {
  currentFilename: string;
  targetFilename: string;
  resolvePluckedFile: (request: string) => string | Promise<string>;
}

export function getNextFilename({
  currentFilename,
  targetFilename,
  resolvePluckedFile,
}: GetNextFilenameOptions) {
  const resolvedSource = targetFilename.startsWith('.')
    ? path.resolve(path.dirname(currentFilename), targetFilename)
    : // if the source does not start with a `.` then leave as-is
      // e.g. mono-repo absolute path or some sort of aliasing
      targetFilename;

  return resolvePluckedFile(resolvedSource);
}
