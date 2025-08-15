
"use client";

import { useState, useCallback, useRef, MouseEvent, TouchEvent } from "react";
import Cropper, { type Area } from 'react-easy-crop';
import { jsPDF } from "jspdf";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import getCroppedImg from "@/lib/cropImage";
import { Upload, Download, Scissors, Loader2, Image as ImageIcon, Trash2, Crop, Camera, Type, Sticker, PaintBucket, Smile, Heart, Star, Copy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  originalSrc: string;
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
                <CardTitle className="font-headline text-3xl font-bold text-primary">Foto Única</CardTitle>
                <CardDescription className="text-muted-foreground">
                Grid de imagens 3x4 para impressão.
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

  const [editingImage, setEditingImage] = useState<GridImage | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newImages: GridImage[] = [];
      for (const file of files) {
        const imageDataUrl = await readFile(file);
        newImages.push({
          id: `${file.name}-${Date.now()}`,
          src: imageDataUrl,
          originalSrc: imageDataUrl,
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

  const openEditor = (image: GridImage) => {
    setEditingImage(image);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!editingImage || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(editingImage.originalSrc, croppedAreaPixels);
      if (croppedImage) {
        setImages(images.map(img => 
          img.id === editingImage.id ? { ...img, src: croppedImage } : img
        ));
      }
      setEditingImage(null);
    } catch(e) {
      console.error("Error cropping image", e);
      toast({
        variant: "destructive",
        title: "Erro ao Cortar",
        description: "Não foi possível cortar a imagem.",
      });
    }
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

  const aspect = SIZES_MM[keychainSize].width / SIZES_MM[keychainSize].height;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="font-headline text-3xl font-bold text-primary">Grid de Imagens Variadas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Permite ajustar cada imagem individual conforme desejado.
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
          <CardFooter className="p-0 mt-8 self-end">
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
                     <Button variant="ghost" size="icon" onClick={() => openEditor(image)} className="text-primary hover:bg-primary/10">
                        <Crop className="h-4 w-4" />
                     </Button>
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
      {editingImage && (
        <Dialog open={!!editingImage} onOpenChange={(isOpen) => !isOpen && setEditingImage(null)}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Ajustar Imagem</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-background shadow-inner">
                        <Cropper
                            image={editingImage.originalSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            cropShape="rect"
                        />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="zoom-dialog">Zoom</Label>
                            <Slider id="zoom-dialog" value={[zoom]} onValueChange={([val]) => setZoom(val)} min={1} max={3} step={0.1} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingImage(null)}>Cancelar</Button>
                    <Button onClick={handleCropSave}>Salvar Corte</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}

const SYMBOLS = {
  Hearts: ['♥', '♡', '❤', '❥', '❣'],
  Music: ['♪', '♫', '♩', '♬', '♭', '♮', '♯'],
  Stars: ['★', '☆', '✪', '✯', '✡', '✶'],
  Arrows: ['→', '←', '↑', '↓', '↔', '↵'],
  Misc: ['☺', '☻', '☼', '☁', '⚡', '✿', '❄', '✔', '✖', 'ツ', '✓', '✘'],
  Mystical: ['𖤐', '✞', '✿', '𓆩𓆪', '☽', '♀', '❥', '𓂀', '⛧', '∞', '♕', '❀', '✦'],
};

function PolaroidTransformer() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedImageSrc, setCroppedImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [text, setText] = useState("");
  const { toast } = useToast();
  const finalImageRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const polaroidRef = useRef<HTMLDivElement>(null);
  const [symbolsPopoverOpen, setSymbolsPopoverOpen] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setCroppedImageSrc(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  };

  const onCropComplete = useCallback(async (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
    if(imageSrc) {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            setCroppedImageSrc(croppedImage);
        } catch (e) {
            console.error(e);
        }
    }
  }, [imageSrc]);
  
  const downloadPolaroid = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast({
        title: "Imagem Faltando",
        description: "Por favor, carregue e ajuste uma imagem primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    try {
        const { default: html2canvas } = await import('html2canvas');
        const element = finalImageRef.current;
        if (!element) return;
        
        const canvas = await html2canvas(element, { 
            useCORS: true, 
            allowTaint: true,
            backgroundColor: null,
        });

        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = 'polaroid.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch(e) {
      console.error(e);
       toast({
        title: "Erro ao Gerar Imagem",
        description: "Ocorreu um erro ao tentar gerar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleCopySymbol = (symbol: string) => {
    navigator.clipboard.writeText(symbol);
    toast({
      title: "Copiado!",
      description: `O símbolo "${symbol}" foi copiado para a área de transferência.`,
    });
    setSymbolsPopoverOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="font-headline text-3xl font-bold text-primary">Transformador de Fotos em Polaroid</CardTitle>
              <CardDescription className="text-muted-foreground">
                Recrie a estética de uma foto Polaroid com textos e símbolos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="polaroid-upload" className="font-headline text-lg">1. Carregar Foto</Label>
                <Input id="polaroid-upload" type="file" onChange={onFileChange} accept="image/*" className="hidden" />
                <Label htmlFor="polaroid-upload" className={cn(buttonVariants({ variant: 'outline' }), "w-full cursor-pointer bg-transparent hover:bg-primary/5 border-primary/30 text-primary hover:text-primary")}>
                  <Upload className="mr-2 h-4 w-4" />
                  {imageSrc ? "Trocar Imagem" : "Selecionar Imagem"}
                </Label>
              </div>
              
              {imageSrc && (
                  <>
                      <div className="space-y-2">
                          <Label htmlFor="polaroid-zoom" className="font-headline text-lg">2. Ajuste o Zoom</Label>
                          <Slider id="polaroid-zoom" value={[zoom]} onValueChange={([val]) => setZoom(val)} min={1} max={3} step={0.1} />
                      </div>
                       <div className="space-y-2">
                          <Label htmlFor="polaroid-text" className="font-headline text-lg">3. Adicionar Texto</Label>
                          <Input id="polaroid-text" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva algo..." />
                      </div>
                  </>
              )}
               <div className="space-y-2">
                  <Label className="font-headline text-lg">4. Ferramentas</Label>
                  <div className="flex gap-2">
                      <Popover open={symbolsPopoverOpen} onOpenChange={setSymbolsPopoverOpen}>
                        <PopoverTrigger asChild>
                           <Button variant="outline" disabled={!imageSrc}>
                              <Copy className="mr-2 h-4 w-4"/> Símbolos
                           </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 md:w-80 max-h-96">
                            <ScrollArea className="h-72 w-full">
                              <div className="grid gap-4 p-4">
                                  <h4 className="font-medium leading-none">Copiar Símbolo</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Clique em um símbolo para copiá-lo e cole no campo de texto.
                                  </p>
                                  {Object.entries(SYMBOLS).map(([category, list]) => (
                                      <div key={category}>
                                          <p className="text-sm text-muted-foreground mb-2">{category}</p>
                                          <div className="flex flex-wrap gap-1">
                                              {list.map((symbol) => (
                                                  <Button key={symbol} variant="ghost" size="icon" className="text-lg" onClick={() => handleCopySymbol(symbol)}>
                                                      {symbol}
                                                  </Button>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                            </ScrollArea>
                        </PopoverContent>
                      </Popover>
                  </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="p-0 mt-8">
              <Button onClick={downloadPolaroid} disabled={!imageSrc || isGenerating} className="w-full text-lg py-6">
                   {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                  Baixar Polaroid
              </Button>
          </CardFooter>
        </div>

        <div className="bg-muted/30 p-4 md:p-6 flex flex-col items-center justify-center min-h-[300px] md:min-h-0">
          <div 
            ref={polaroidRef}
            className="relative w-[300px] h-[360px] bg-white shadow-lg rounded-sm p-4 flex flex-col items-center select-none"
            style={{fontFamily: "'Gloria Hallelujah', cursive"}}
          >
            <div className="relative w-[268px] h-[268px] bg-gray-200 overflow-hidden aspect-square">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                    <Camera className="h-16 w-16 mb-4 text-primary/20" />
                  </div>
              )}
            </div>
            <div className="w-full flex-grow flex items-center justify-center pt-2">
              <p className="text-center text-lg text-gray-800 whitespace-pre-wrap">{text}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden element for canvas capture */}
      <div
          className="absolute -z-10"
          style={{left: '-9999px', top: '0px' }}
      >
          <div 
              ref={finalImageRef}
              className="relative w-[300px] h-[360px] bg-white p-4 flex flex-col items-center"
              style={{fontFamily: "'Gloria Hallelujah', cursive"}}
            >
              <div className="w-[268px] h-[268px] bg-gray-200">
                  {croppedImageSrc && <img src={croppedImageSrc} className="w-full h-full object-cover" alt="cropped preview" />}
              </div>
              <div className="w-full flex-grow flex items-center justify-center pt-2">
                <p className="text-center text-lg text-gray-800 whitespace-pre-wrap">{text}</p>
              </div>
          </div>
      </div>
    </>
  );
}


export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background font-body text-foreground flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-center text-primary mb-8">
        Transforme suas fotos em polaroid ou gere PDF com fotos 3x4 para impressão
      </h1>
      <Card className="w-full max-w-5xl shadow-2xl overflow-hidden">
        <Tabs defaultValue="polaroid" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="polaroid">Polaroid</TabsTrigger>
                <TabsTrigger value="grid-chaveiro">Grid de Imagens</TabsTrigger>
                <TabsTrigger value="foto-chaveiro">Foto Única</TabsTrigger>
            </TabsList>
            <TabsContent value="polaroid">
              <PolaroidTransformer />
            </TabsContent>
            <TabsContent value="grid-chaveiro">
                <GridChaveiro />
            </TabsContent>
            <TabsContent value="foto-chaveiro">
                <FotoChaveiro />
            </TabsContent>
        </Tabs>
      </Card>
      <footer className="text-center text-muted-foreground text-sm mt-4">
        © {new Date().getFullYear()} Idealizado por Mailson RG. Desenvolvido com IA.
      </footer>
    </main>
  );
}
