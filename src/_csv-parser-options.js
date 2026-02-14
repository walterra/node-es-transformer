export default function getCsvParserOptions(csvOptions = {}, skipHeader = false) {
  const options = {
    bom: true,
    columns: true,
    trim: true,
    skip_empty_lines: true,
    ...csvOptions,
  };

  const consumesHeader = options.columns === true || typeof options.columns === 'function';

  if (skipHeader && !consumesHeader && typeof options.from_line === 'undefined') {
    options.from_line = 2;
  }

  return options;
}
