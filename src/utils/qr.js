import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export const generateQrDataUrl = async (text) => {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 220,
    color: {
      dark: "#1B4965",
      light: "#ffffff",
    },
  });
};

export const generateBarcodeDataUrl = (text) => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    lineColor: "#1B4965",
    width: 1.8,
    height: 52,
    displayValue: true,
    fontSize: 12,
    margin: 4,
  });
  return canvas.toDataURL("image/png");
};
