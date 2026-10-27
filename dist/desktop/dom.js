export function select(selector, root = document) {
  return root.querySelector(selector);
}

export function selectAll(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function downloadFile(blob, name, root, host) {
  const url = host.URL.createObjectURL(blob);
  const link = root.createElement("a");
  link.href = url;
  link.download = name;
  root.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    host.setTimeout(() => host.URL.revokeObjectURL(url), 1000);
  }
}
