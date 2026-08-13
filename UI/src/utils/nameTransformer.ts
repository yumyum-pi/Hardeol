const NameTransformer = (input: string): string => {
  if (input.length === 0) return "";
  const diff = 97 - 65;
  let newString = "";
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === ' ') {
      newString += '_';
    } else if (char >= 'a' && char <= 'z') {
      newString += char;
    } else if (char >= 'A' && char <= 'Z') {
      newString += String.fromCharCode(char.charCodeAt(0) + diff);
    } else if (char === '_') {
      newString += '_';
    } else if (char >= '0' && char <= '9' && i > 0) {
      newString += char;
    }
  }
  return newString;
};
export default NameTransformer
