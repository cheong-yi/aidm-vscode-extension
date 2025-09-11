// Type declaration for CSS imports via raw-loader
declare module '*.css' {
  const content: string;
  export default content;
}