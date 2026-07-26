declare module "*.png" {
  const value: string;
  export default value;
}

declare module "react-pdf" {
  export const Document: any;
  export const Page: any;
  export const pdfjs: any;
}
