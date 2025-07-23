"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from 'react-easy-crop';
import { jsPDF } from "jspdf";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import getCroppedImg from "@/lib/cropImage";
import { Upload, Download, Scissors, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Sizes in mm for PDF generation
const SIZES_MM: Record<string, { width: number; height: number; name: string }> = {
  '3x4': { width: 30, height: 40, name: '3x4 cm' },
  '3.5x4.5': { width: 35, height: 45, name: '3,5x4,5 cm' },
  '2.5x3.5': { width: 25, height: 35, name: '2,5x3,5 cm' },
};

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string), false);
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [keychainSize, setKeychainSize] = useState('3x4');
  const [quantity, setQuantity] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const generatePdf = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, envie uma imagem e ajuste o corte.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImage) {
        throw new Error("Não foi possível cortar a imagem.");
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const { width: imgWidth, height: imgHeight } = SIZES_MM[keychainSize];
      const margin = 5;
      const colGap = 0;
      const rowGap = 0;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let x = margin;
      let y = margin;
      
      const drawCutLines = () => {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(150, 150, 150); // Gray color for lines
        doc.setLineWidth(0.1);

        let lastY = -1;
        let currentX = margin;
        let currentY = margin;
        let imagesInRow = 0;
        const cols = Math.floor((pageWidth - 2 * margin + colGap) / (imgWidth + colGap));

        // Draw horizontal lines
        for(let i=0; i<quantity; i++) {
          if (currentX + imgWidth > pageWidth - margin + 0.1) {
            currentX = margin;
            currentY += imgHeight + rowGap;
          }
          if (currentY + imgHeight > pageHeight - margin + 0.1) {
             // new page, but we don't handle lines across pages here for simplicity
          }
          if(lastY !== currentY && lastY !== -1) {
             doc.line(margin, lastY + imgHeight, pageWidth - margin, lastY + imgHeight);
          }
          lastY = currentY;
          currentX += imgWidth + colGap;
        }
        // Last row bottom line
        if(lastY !== -1) {
            doc.line(margin, lastY + imgHeight, margin + (cols * (imgWidth + colGap)) - colGap, lastY + imgHeight);
        }


        // Draw vertical lines
        currentX = margin;
        currentY = margin;
        let lastX = -1;
        
        const rows = Math.ceil(quantity / cols);

        for (let j = 0; j < cols; j++) {
            let colX = margin + j * (imgWidth + colGap);
            let colHeight = 0;
            const imagesInCol = Math.min(rows, Math.ceil((quantity - j) / cols))

            if( j > 0) {
                 doc.line(colX, margin, colX, margin + (rows * (imgHeight + rowGap)) - rowGap );
            }
        }
        
         doc.line(margin + (cols * (imgWidth + colGap)) - colGap, margin, margin + (cols * (imgWidth + colGap)) - colGap, margin + (rows * (imgHeight + rowGap)) - rowGap );

      }


      for (let i = 0; i < quantity; i++) {
        if (x + imgWidth > pageWidth - margin + 0.1) {
          x = margin;
          y += imgHeight + rowGap;
        }

        if (y + imgHeight > pageHeight - margin + 0.1) {
          drawCutLines();
          doc.addPage();
          x = margin;
          y = margin;
        }

        doc.addImage(croppedImage, 'JPEG', x, y, imgWidth, imgHeight);
        x += imgWidth + colGap;
      }
      
      drawCutLines();


      doc.save("foto-chaveiro.pdf");
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
      toast({
        variant: "destructive",
        title: "Falha na Geração do PDF",
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const aspect = SIZES_MM[keychainSize].width / SIZES_MM[keychainSize].height;

  return (
    <main className="min-h-screen w-full bg-background font-body text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              <CardHeader className="p-0 mb-6">
                <CardTitle className="font-headline text-3xl font-bold text-primary">FotoChaveiro</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Transforme suas fotos em chaveiros prontos para impressão.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="font-headline text-lg">1. Escolha sua Imagem</Label>
                  <Input id="file-upload" type="file" onChange={onFileChange} accept="image/*" className="hidden" />
                  <Label htmlFor="file-upload" className={cn(buttonVariants({ variant: 'outline' }), "w-full cursor-pointer bg-transparent hover:bg-primary/5 border-primary/30 text-primary hover:text-primary")}>
                    <Upload className="mr-2 h-4 w-4" />
                    {imageSrc ? "Trocar Imagem" : "Selecionar Imagem"}
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="keychain-size" className="font-headline text-lg">2. Tamanho</Label>
                      <Select value={keychainSize} onValueChange={setKeychainSize}>
                        <SelectTrigger id="keychain-size">
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SIZES_MM).map(([key, { name }]) => (
                            <SelectItem key={key} value={key}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="font-headline text-lg">3. Quantidade</Label>
                      <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" />
                    </div>
                </div>
                {imageSrc && (
                  <div className="space-y-2">
                    <Label htmlFor="zoom" className="font-headline text-lg">4. Ajuste o Zoom</Label>
                    <Slider id="zoom" value={[zoom]} onValueChange={([val]) => setZoom(val)} min={1} max={3} step={0.1} />
                  </div>
                )}
              </CardContent>
            </div>
            <CardFooter className="p-0 mt-8">
              <Button onClick={generatePdf} disabled={!imageSrc || isGenerating} className="w-full text-lg py-6">
                {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                Gerar PDF
              </Button>
            </CardFooter>
          </div>
          <div className="bg-muted/30 p-4 md:p-6 flex flex-col items-center justify-center min-h-[300px] md:min-h-0">
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-background shadow-inner">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  style={{
                    containerStyle: { borderRadius: '0.5rem' },
                    mediaStyle: { transition: 'all 0.3s ease-in-out' },
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                  <Scissors className="h-16 w-16 mb-4 text-primary/20" />
                  <h3 className="font-headline text-xl font-semibold text-primary/80">Área de Corte</h3>
                  <p>Sua imagem aparecerá aqui para você ajustar o corte.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
