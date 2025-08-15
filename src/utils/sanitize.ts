export const sanitizeName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9\s'-]/g, "")
    .replace(/^[-'\s]+|[-'\s]+$/g, "")
    .slice(0, 100);
};
