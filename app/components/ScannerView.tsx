import { Scanner } from "@yudiel/react-qr-scanner";

interface ScannerViewProps {
  onScan: (results: Array<{ rawValue: string }>) => void;
  onError: (error: unknown) => void;
}

export default function ScannerView({ onScan, onError }: ScannerViewProps) {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-black">
      <Scanner
        onScan={onScan}
        onError={onError}
        constraints={{ facingMode: "environment" }}
        formats={[
          "qr_code",
          "code_128",
          "code_39",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
        ]}
        sound={true}
        styles={{
          container: { width: "100%", aspectRatio: "1" },
          video: { objectFit: "cover" },
        }}
      />
    </div>
  );
}
