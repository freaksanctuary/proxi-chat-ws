const generateCustomUUID = () => {
  return "xyxxxyxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const ANIMALS = ["wolf", "hawk", "bear", "shark"];

export const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `usr-${word}-${generateCustomUUID()}`;
};
