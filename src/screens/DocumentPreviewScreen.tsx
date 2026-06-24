import { Capacitor } from "@capacitor/core";
import { useMemo, useState } from "react";
import { Btn, Icon, TopBar } from "../components/ui";
import { useApp } from "../useApp";
import { buildA4DocumentHtml, printA4Document, shareA4PdfDocument } from "../utils/documentActions";

export function DocumentPreviewScreen() {
  const { selectedA4Document, back, toast } = useApp();
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const documentHtml = useMemo(
    () => selectedA4Document ? buildA4DocumentHtml(selectedA4Document, { showScreenToolbar: false }) : "",
    [selectedA4Document]
  );

  if (!selectedA4Document) {
    return (
      <div className="flex h-full flex-col bg-slate-50">
        <TopBar title="Document" onBack={back} />
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Icon name="file" className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Document unavailable</p>
        </div>
      </div>
    );
  }

  const handlePrint = async () => {
    setPrinting(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await shareA4PdfDocument(selectedA4Document);
        if (result === "unsupported") {
          toast({ title: "Print unavailable", body: "No PDF share or print target is available on this device.", variant: "error" });
        }
        return;
      }
      if (!printA4Document(selectedA4Document)) {
        toast({ title: "Print unavailable", body: "This browser blocked the print window.", variant: "error" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({ title: "Print failed", body: "Try again from this device.", variant: "error" });
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await shareA4PdfDocument(selectedA4Document);
      if (result === "clipboard") {
        toast({ title: "PDF sharing unavailable", body: "A text copy was copied because this device cannot share PDF files.", variant: "warning" });
      } else if (result === "unsupported") {
        toast({ title: "Share unavailable", body: "This device cannot share PDF files.", variant: "error" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({ title: "Share failed", body: "Try again from this device.", variant: "error" });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-200">
      <TopBar
        title={selectedA4Document.title}
        subtitle={selectedA4Document.documentNumber}
        onBack={back}
        trailing={
          <div className="flex items-center gap-1">
            <Btn size="sm" variant="outline" icon="printer" loading={printing} disabled={printing || sharing} onClick={handlePrint}>
              Print
            </Btn>
            <Btn size="sm" variant="outline" icon="share" loading={sharing} disabled={printing || sharing} onClick={handleShare}>
              Share
            </Btn>
          </div>
        }
      />
      <div className="min-h-0 flex-1 bg-slate-200">
        <iframe
          title={selectedA4Document.documentNumber}
          srcDoc={documentHtml}
          className="h-full w-full border-0 bg-slate-200"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
