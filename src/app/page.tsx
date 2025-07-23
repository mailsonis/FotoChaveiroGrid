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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import getCroppedImg from "@/lib/cropImage";
import { Upload, Download, Scissors, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
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

type GridImage = {
  id: string;
  src: string;
  quantity: number;
};

function FotoChaveiro() {
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
      
      const drawCutLinesOnPage = (cols: number, rows: number) => {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(150, 150, 150); // Gray color for lines
        doc.setLineWidth(0.1);

        // Draw horizontal lines
        for(let i = 1; i < rows; i++) {
            const lineY = margin + i * (imgHeight + rowGap);
            doc.line(margin, lineY, margin + cols * (imgWidth + colGap) - colGap, lineY);
        }

        // Draw vertical lines
        for (let j = 1; j < cols; j++) {
            const lineX = margin + j * (imgWidth + colGap);
            doc.line(lineX, margin, lineX, margin + rows * (imgHeight + rowGap) - rowGap);
        }
      };
      
      const cols = Math.floor((pageWidth - 2 * margin + colGap) / (imgWidth + colGap));
      let imagesOnPage = 0;


      for (let i = 0; i < quantity; i++) {
        if (x + imgWidth > pageWidth - margin + 0.1) {
          x = margin;
          y += imgHeight + rowGap;
        }

        if (y + imgHeight > pageHeight - margin + 0.1) {
          const rowsOnThisPage = Math.ceil(imagesOnPage / cols);
          drawCutLinesOnPage(cols, rowsOnThisPage);
          doc.addPage();
          x = margin;
          y = margin;
          imagesOnPage = 0;
        }

        doc.addImage(croppedImage, 'JPEG', x, y, imgWidth, imgHeight);
        x += imgWidth + colGap;
        imagesOnPage++;
      }
      
      const rowsOnLastPage = Math.ceil(imagesOnPage / cols);
      drawCutLinesOnPage(cols, rowsOnLastPage);

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
  )
}

function GridChaveiro() {
  const [images, setImages] = useState<GridImage[]>([]);
  const [keychainSize, setKeychainSize] = useState('3x4');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newImages: GridImage[] = [];
      for (const file of files) {
        const imageDataUrl = await readFile(file);
        newImages.push({
          id: `${file.name}-${Date.now()}`,
          src: imageDataUrl,
          quantity: 1,
        });
      }
      setImages((prev) => [...prev, ...newImages]);
    }
  };
  
  const updateQuantity = (id: string, quantity: number) => {
      setImages(images.map(img => img.id === id ? {...img, quantity: Math.max(1, quantity) } : img));
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };


  const generatePdf = async () => {
    if (images.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, adicione uma ou mais imagens.",
      });
      return;
    }

    setIsGenerating(true);
    try {
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

      const allImagesToPrint: string[] = [];
      images.forEach(img => {
        for(let i=0; i < img.quantity; i++) {
          allImagesToPrint.push(img.src);
        }
      });
      
      let x = margin;
      let y = margin;
      
      const drawCutLinesOnPage = (cols: number, rows: number) => {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.1);

        for(let i = 1; i < rows; i++) {
            const lineY = margin + i * (imgHeight + rowGap);
            doc.line(margin, lineY, margin + cols * (imgWidth + colGap) - colGap, lineY);
        }

        for (let j = 1; j < cols; j++) {
            const lineX = margin + j * (imgWidth + colGap);
            doc.line(lineX, margin, lineX, margin + rows * (imgHeight + rowGap) - rowGap);
        }
      };
      
      const cols = Math.floor((pageWidth - 2 * margin + colGap) / (imgWidth + colGap));
      let imagesOnPage = 0;

      for (const imageSrc of allImagesToPrint) {
        if (x + imgWidth > pageWidth - margin + 0.1) {
          x = margin;
          y += imgHeight + rowGap;
        }

        if (y + imgHeight > pageHeight - margin + 0.1) {
          const rowsOnThisPage = Math.ceil(imagesOnPage / cols);
          drawCutLinesOnPage(cols, rowsOnThisPage);
          doc.addPage();
          x = margin;
          y = margin;
          imagesOnPage = 0;
        }

        doc.addImage(imageSrc, 'JPEG', x, y, imgWidth, imgHeight);
        x += imgWidth + colGap;
        imagesOnPage++;
      }
      
      const rowsOnLastPage = Math.ceil(imagesOnPage / cols);
      drawCutLinesOnPage(cols, rowsOnLastPage);

      doc.save("grid-chaveiro.pdf");
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <div className="p-6 md:p-8 flex flex-col justify-between">
        <div>
          <CardHeader className="p-0 mb-6">
            <CardTitle className="font-headline text-3xl font-bold text-primary">Grid de Imagens para Chaveiro</CardTitle>
            <CardDescription className="text-muted-foreground">
              Crie uma grade com várias fotos para seus chaveiros.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="grid-file-upload" className="font-headline text-lg">1. Escolha suas Imagens</Label>
              <Input id="grid-file-upload" type="file" onChange={onFileChange} accept="image/*" className="hidden" multiple />
              <Label htmlFor="grid-file-upload" className={cn(buttonVariants({ variant: 'outline' }), "w-full cursor-pointer bg-transparent hover:bg-primary/5 border-primary/30 text-primary hover:text-primary")}>
                <Upload className="mr-2 h-4 w-4" />
                Adicionar Imagens
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid-keychain-size" className="font-headline text-lg">2. Tamanho</Label>
              <Select value={keychainSize} onValueChange={setKeychainSize}>
                <SelectTrigger id="grid-keychain-size">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SIZES_MM).map(([key, { name }]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </div>
        <CardFooter className="p-0 mt-8">
          <Button onClick={generatePdf} disabled={images.length === 0 || isGenerating} className="w-full text-lg py-6">
            {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            Gerar PDF do Grid
          </Button>
        </CardFooter>
      </div>
      <div className="bg-muted/30 p-4 md:p-6 flex flex-col min-h-[300px] md:min-h-0">
          <h3 className="font-headline text-xl font-semibold text-primary/80 mb-4">Imagens Selecionadas</h3>
          {images.length > 0 ? (
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
              {images.map(image => (
                <div key={image.id} className="flex items-center gap-4 bg-background p-2 rounded-lg shadow-sm">
                  <img src={image.src} alt="thumbnail" className="w-16 h-16 object-cover rounded-md" />
                  <div className="flex-grow">
                     <p className="text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap w-32" title={image.id.split('-')[0]}>{image.id.split('-')[0]}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <Label htmlFor={`quantity-${image.id}`} className="text-xs">Qtd:</Label>
                        <Input 
                            id={`quantity-${image.id}`} 
                            type="number" 
                            value={image.quantity} 
                            onChange={(e) => updateQuantity(image.id, parseInt(e.target.value))}
                            min="1"
                            className="w-20 h-8"
                        />
                     </div>
                  </div>
                   <Button variant="ghost" size="icon" onClick={() => removeImage(image.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4 bg-background rounded-lg">
                <ImageIcon className="h-16 w-16 mb-4 text-primary/20" />
                <p>Nenhuma imagem selecionada.</p>
            </div>
          )}
      </div>
    </div>
  );
}


export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background font-body text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-2xl overflow-hidden">
        <Tabs defaultValue="foto-chaveiro" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="foto-chaveiro">Foto Chaveiro</TabsTrigger>
                <TabsTrigger value="grid-chaveiro">Grid de Imagens</TabsTrigger>
            </TabsList>
            <TabsContent value="foto-chaveiro">
                <FotoChaveiro />
            </TabsContent>
            <TabsContent value="grid-chaveiro">
                <GridChaveiro />
            </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
}
