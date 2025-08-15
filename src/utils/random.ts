import { OTP_LENGTH } from "@shared/constants";

const expandAlphabet = (alphabet: string): string => {
  const alphabets: Record<string, string> = {
    "a-z": "abcdefghijklmnopqrstuvwxyz",
    "A-Z": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "0-9": "0123456789",
    "-_": "-_",
  };
  if (!alphabets[alphabet]) {
    throw new Error(`Unsupported alphabet: ${alphabet}`);
  }
  return alphabets[alphabet];
};

export const createRandomStringGenerator = (...baseAlphabets: string[]) => {
  const baseCharSet = baseAlphabets.map(expandAlphabet).join("");
  if (!baseCharSet) {
    throw new Error(
      "No valid characters provided for random string generation."
    );
  }
  return (length: number, ...alphabets: string[]) => {
    if (length <= 0) {
      throw new Error("Length must be a positive integer.");
    }
    const charSet = alphabets.length
      ? alphabets.map(expandAlphabet).join("")
      : baseCharSet;
    const charSetLength = charSet.length;
    const maxValid = Math.floor(256 / charSetLength) * charSetLength;
    const buf = new Uint8Array(length * 2);
    let result = "";
    while (result.length < length) {
      crypto.getRandomValues(buf);
      for (const rand of Array.from(buf)) {
        if (rand < maxValid && result.length < length) {
          result += charSet[rand % charSetLength];
        }
      }
    }
    return result;
  };
};

export const generateOtp = (length = OTP_LENGTH) => {
  return createRandomStringGenerator("0-9")(length);
};
