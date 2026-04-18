// This file allows TypeScript to recognize CSS imports
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}