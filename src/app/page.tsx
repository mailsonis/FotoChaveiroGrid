
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import getCroppedImg from "@/lib/cropImage";
import { Upload, Download, Scissors, Loader2, Image as ImageIcon, Trash2, Crop, Camera, Copy, FileText, Images, Type } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const SIZES_MM: Record<string, { width: number; height: number; name: string }> = {
  '3x4': { width: 30, height: 40, name: '3x4 cm' },
  '3.5x4.5': { width: 35, height: 45, name: '3,5x4,5 cm' },
  '2.5x3.5': { width: 25, height: 35, name: '2,5x3,5 cm' },
  '10x15': { width: 100, height: 150, name: '10x15 cm' },
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

      doc.save("foto-3x4.pdf");
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
                          {Object.entries(SIZES_MM).filter(([key]) => key !== '10x15').map(([key, { name }]) => (
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
      const allImagesToPrint: string[] = [];
      images.forEach(img => {
        for(let i=0; i < img.quantity; i++) {
          allImagesToPrint.push(img.src);
        }
      });
      
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      if (keychainSize === '10x15') {
          const imgWidth = 100;
          const imgHeight = 150;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          const cols = Math.floor(pageWidth / imgWidth);
          const rows = Math.floor(pageHeight / imgHeight);
          const imagesPerPage = cols * rows;

          const xMargin = (pageWidth - (cols * imgWidth)) / (cols + 1);
          const yMargin = (pageHeight - (rows * imgHeight)) / (rows + 1);

          for (let i = 0; i < allImagesToPrint.length; i++) {
              if (i > 0 && i % imagesPerPage === 0) {
                  doc.addPage();
              }
              
              const indexOnPage = i % imagesPerPage;
              const colIndex = indexOnPage % cols;
              const rowIndex = Math.floor(indexOnPage / cols);
              
              const x = xMargin + (colIndex * (imgWidth + xMargin));
              const y = yMargin + (rowIndex * (imgHeight + yMargin));

              doc.addImage(allImagesToPrint[i], 'JPEG', x, y, imgWidth, imgHeight);
          }
        doc.save("grid-10x15.pdf");

      } else {
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
        doc.save("grid-3x4.pdf");
      }

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

  const aspect = keychainSize === '10x15' 
    ? SIZES_MM[keychainSize].width / SIZES_MM[keychainSize].height
    : SIZES_MM[keychainSize].width / SIZES_MM[keychainSize].height;

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
              <ScrollArea className="flex-grow pr-2">
                <div className="space-y-4">
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
              </ScrollArea>
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
  Misc: ['☺', '☻', '☼', '☁', '⚡', '✿', '❄'],
  Mystical: ['𖤐', '✞', '✿', '𓆩𓆪', '♀', '❥', '𓂀', '⛧', '∞', '♕', '❀', '✦'],
};

const FONTS = [
  { name: "Manuscrita", value: "'Gloria Hallelujah', cursive" },
  { name: "Amatic", value: "'Amatic SC', cursive" },
  { name: "Patrick", value: "'Patrick Hand', cursive" },
  { name: "Shadows", value: "'Shadows Into Light', cursive" },
  { name: "Dancing", value: "'Dancing Script', cursive" },
  { name: "Rock", value: "'Rock Salt', cursive" },
]

type Polaroid = {
  id: string;
  originalSrc: string;
  croppedSrc: string | null;
  text: string;
  crop: Area;
  zoom: number;
  croppedAreaPixels: Area | null;
  showBorder: boolean;
  fontFamily: string;
};

function PolaroidTransformer() {
  const [polaroids, setPolaroids] = useState<Polaroid[]>([]);
  const [editingPolaroidId, setEditingPolaroidId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [symbolsPopoverOpen, setSymbolsPopoverOpen] = useState(false);

  const finalImageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newPolaroids: Polaroid[] = [];
      for (const file of files) {
        const imageDataUrl = await readFile(file);
        const newPolaroid = {
          id: `${file.name}-${Date.now()}`,
          originalSrc: imageDataUrl,
          croppedSrc: imageDataUrl, // Initially set cropped to original
          text: "",
          crop: { x: 0, y: 0, width: 0, height: 0 },
          zoom: 1,
          croppedAreaPixels: null,
          showBorder: true,
          fontFamily: FONTS[0].value,
        };
        newPolaroids.push(newPolaroid);
      }
      setPolaroids((prev) => [...prev, ...newPolaroids]);
      if (newPolaroids.length > 0) {
        setEditingPolaroidId(newPolaroids[0].id);
      }
    }
  };
  
  const updatePolaroid = (id: string, updates: Partial<Polaroid>) => {
      setPolaroids(prev => prev.map(p => p.id === id ? {...p, ...updates} : p));
  };
  
  const removePolaroid = (id: string) => {
      setPolaroids(prev => {
        const newPolaroids = prev.filter(p => p.id !== id);
        if (editingPolaroidId === id) {
          setEditingPolaroidId(newPolaroids.length > 0 ? newPolaroids[0].id : null);
        }
        return newPolaroids;
      });
  };

  const onCropComplete = useCallback(async (id: string, _croppedArea: Area, croppedAreaPixels: Area) => {
    const polaroid = polaroids.find(p => p.id === id);
    if(polaroid) {
        try {
            const croppedImage = await getCroppedImg(polaroid.originalSrc, croppedAreaPixels);
            updatePolaroid(id, { croppedAreaPixels, croppedSrc: croppedImage });
        } catch (e) {
            console.error(e);
        }
    }
  }, [polaroids]);
  
  const downloadAllAsPNG = async () => {
    if (polaroids.length === 0) {
      toast({ title: "Nenhuma Polaroid", description: "Adicione imagens para começar.", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    try {
        const { default: html2canvas } = await import('html2canvas');
        
        for(const polaroid of polaroids) {
            const element = finalImageRefs.current[polaroid.id];
            if (!element) continue;
            
            const canvas = await html2canvas(element, { scale: 4, useCORS: true, allowTaint: true, backgroundColor: null });
            const data = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = data;
            link.download = `polaroid-${polaroid.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        toast({ title: "Download Concluído", description: "Suas polaroids foram baixadas."});

    } catch(e) {
      console.error(e);
       toast({ title: "Erro ao Gerar Imagens", description: "Ocorreu um erro. Tente novamente.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const downloadAsPDF = async () => {
     if (polaroids.length === 0) {
      toast({ title: "Nenhuma Polaroid", description: "Adicione imagens para começar.", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const margin = 10;
      const polaroidWidthMM = 60;
      const polaroidHeightMM = 72;
      const gap = 5;
      
      const cols = Math.floor((pageWidth - 2 * margin + gap) / (polaroidWidthMM + gap));
      const rows = Math.floor((pageHeight - 2 * margin + gap) / (polaroidHeightMM + gap));
      const imagesPerPage = cols * rows;

      let x = margin;
      let y = margin;

      for (let i = 0; i < polaroids.length; i++) {
        const polaroid = polaroids[i];
        const element = finalImageRefs.current[polaroid.id];
        if (!element) continue;

        if (i > 0 && i % imagesPerPage === 0) {
          doc.addPage();
        }
        
        const currentImageIndexInPage = i % imagesPerPage;
        const colIndex = currentImageIndexInPage % cols;
        const rowIndex = Math.floor(currentImageIndexInPage / cols);

        x = margin + colIndex * (polaroidWidthMM + gap);
        y = margin + rowIndex * (polaroidHeightMM + gap);

        const canvas = await html2canvas(element, { scale: 4, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        
        doc.addImage(imgData, 'PNG', x, y, polaroidWidthMM, polaroidHeightMM);
      }
      
      doc.save('polaroids-grid.pdf');

    } catch(e) {
      console.error(e);
      toast({ title: "Erro ao Gerar PDF", description: "Ocorreu um erro. Tente novamente.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCopySymbol = (symbol: string) => {
    if (editingPolaroidId) {
        const polaroid = polaroids.find(p => p.id === editingPolaroidId);
        if (polaroid) {
            updatePolaroid(editingPolaroidId, { text: polaroid.text + symbol });
            navigator.clipboard.writeText(symbol);
            toast({
              title: "Copiado!",
              description: `O símbolo "${symbol}" foi adicionado e copiado.`,
            });
            setSymbolsPopoverOpen(false);
        }
    } else {
         toast({ title: "Selecione uma Polaroid", description: "Clique em uma imagem para adicionar símbolos.", variant: "destructive" });
    }
  };

  const editingPolaroid = polaroids.find(p => p.id === editingPolaroidId);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="font-headline text-3xl font-bold text-primary">Transformador de Fotos em Polaroid</CardTitle>
              <CardDescription className="text-muted-foreground">
                Crie múltiplas polaroids, adicione legendas e baixe como quiser.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="polaroid-upload" className="font-headline text-lg">1. Carregar Fotos</Label>
                <Input id="polaroid-upload" type="file" onChange={onFileChange} accept="image/*" className="hidden" multiple/>
                <Label htmlFor="polaroid-upload" className={cn(buttonVariants({ variant: 'outline' }), "w-full cursor-pointer bg-transparent hover:bg-primary/5 border-primary/30 text-primary hover:text-primary")}>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Imagens
                </Label>
              </div>
            </CardContent>
            <div className="mt-6 mb-6">
              <Label className="font-headline text-lg">2. Editar Polaroids</Label>
               {polaroids.length > 0 ? (
                <ScrollArea className="h-72 w-full mt-2 pr-4">
                  <div className="space-y-4">
                      {polaroids.map(p => (
                          <div key={p.id} className={cn("flex items-center gap-4 bg-background p-2 rounded-lg shadow-sm cursor-pointer border-2", editingPolaroidId === p.id ? "border-primary" : "border-transparent")} onClick={() => setEditingPolaroidId(p.id)}>
                              <img src={p.croppedSrc || p.originalSrc} alt="thumbnail" className="w-16 h-16 object-cover rounded-md" />
                              <div className="flex-grow">
                                  <Input 
                                      type="text" 
                                      value={p.text} 
                                      onChange={(e) => updatePolaroid(p.id, { text: e.target.value })}
                                      placeholder="Adicionar legenda..."
                                      className="border-0 bg-transparent focus-visible:ring-0"
                                      onClick={(e) => e.stopPropagation()}
                                  />
                              </div>
                              <div className="flex items-center">
                                <Switch checked={p.showBorder} onCheckedChange={(checked) => updatePolaroid(p.id, {showBorder: checked})} onClick={(e) => e.stopPropagation()}/>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removePolaroid(p.id)}} className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                          </div>
                      ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4 bg-muted/20 rounded-lg mt-2 mb-4">
                  <Camera className="h-16 w-16 mb-4 text-primary/20" />
                  <p>Suas fotos aparecerão aqui.</p>
                </div>
              )}
            </div><br/>
             <div className="space-y-2 mt-auto">
                <Label className="font-headline text-lg">3. Ferramentas de Edição</Label>
                <div className="flex flex-col sm:flex-row gap-4">
                    {editingPolaroid && (
                      <div className="space-y-2 flex-1">
                          <Label htmlFor="polaroid-zoom">Zoom</Label>
                          <Slider id="polaroid-zoom" value={[editingPolaroid.zoom]} onValueChange={([val]) => updatePolaroid(editingPolaroid.id, {zoom: val})} min={1} max={3} step={0.1} />
                      </div>
                    )}
                    {editingPolaroid && (
                       <div className="space-y-2 flex-1">
                          <Label htmlFor="polaroid-font">Fonte</Label>
                          <Select value={editingPolaroid.fontFamily} onValueChange={(value) => updatePolaroid(editingPolaroid.id, { fontFamily: value })}>
                            <SelectTrigger id="polaroid-font">
                              <SelectValue placeholder="Selecione a fonte" />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map(font => (
                                <SelectItem key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                       </div>
                    )}
                     <Popover open={symbolsPopoverOpen} onOpenChange={setSymbolsPopoverOpen}>
                        <PopoverTrigger asChild>
                           <Button variant="outline" disabled={!editingPolaroidId}>
                              <Copy className="mr-2 h-4 w-4"/> Símbolos
                           </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 md:w-80 max-h-96">
                            <ScrollArea className="h-72 w-full">
                              <div className="grid gap-4 p-4">
                                  <h4 className="font-medium leading-none">Copiar Símbolo</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Clique em um símbolo para adicioná-lo à legenda.
                                  </p>
                                  {Object.entries(SYMBOLS).map(([category, list]) => (
                                      <div key={category}>
                                          <p className="text-sm text-muted-foreground mb-2">{category}</p>
                                          <div className="flex flex-wrap gap-1">
                                              {list.map((symbol, index) => (
                                                  <Button key={`${symbol}-${index}`} variant="ghost" size="icon" className="text-lg" onClick={() => handleCopySymbol(symbol)}>
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
            <CardFooter className="p-0 mt-auto pt-8">
              <Dialog>
                  <DialogTrigger asChild>
                      <Button disabled={polaroids.length === 0 || isGenerating} className="w-full text-lg py-6">
                          <Download className="mr-2 h-5 w-5" />
                          Baixar
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Escolha o formato de download</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                          <Button variant="outline" onClick={downloadAllAsPNG} disabled={isGenerating}>
                              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Images className="mr-2 h-4 w-4"/>}
                              PNGs Individuais
                          </Button>
                          <Button variant="outline" onClick={downloadAsPDF} disabled={isGenerating}>
                              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                              Grid em PDF (A4)
                          </Button>
                      </div>
                      <DialogFooter>
                          <DialogClose asChild>
                              <Button variant="ghost">Fechar</Button>
                          </DialogClose>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
          </CardFooter>
        </div>

        <div className="bg-muted/30 p-4 md:p-6 flex flex-col items-center justify-center min-h-[400px] md:min-h-0 gap-8">
            {editingPolaroid ? (
                <>
                    <div className="relative w-full max-w-[300px] aspect-square bg-gray-200 rounded-lg shadow-inner overflow-hidden">
                        <Cropper
                            image={editingPolaroid.originalSrc}
                            crop={editingPolaroid.crop as {x: number, y: number}}
                            zoom={editingPolaroid.zoom}
                            aspect={1}
                            onCropChange={(crop) => updatePolaroid(editingPolaroid.id, { crop })}
                            onZoomChange={(zoom) => updatePolaroid(editingPolaroid.id, { zoom })}
                            onCropComplete={(...args) => onCropComplete(editingPolaroid.id, ...args)}
                            />
                    </div>
                    <div>
                        <h3 className="text-center font-headline text-lg mb-2">Pré-visualização</h3>
                        <div 
                            className={cn(
                                "relative w-[250px] h-[300px] bg-white p-3 flex flex-col items-center shadow-lg",
                                editingPolaroid.showBorder && "border border-black/80"
                            )}
                            style={{fontFamily: editingPolaroid.fontFamily }}
                            >
                            <div className="w-full h-[220px] bg-gray-300">
                                {editingPolaroid.croppedSrc && <img src={editingPolaroid.croppedSrc} className="w-full h-full object-cover" alt="cropped preview" />}
                            </div>
                            <div className="w-full flex-grow flex items-center justify-center pt-2">
                                <p className="text-center text-base text-gray-800 whitespace-pre-wrap">{editingPolaroid.text}</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                  <Crop className="h-16 w-16 mb-4 text-primary/20" />
                  <h3 className="font-headline text-xl font-semibold text-primary/80">Área de Edição</h3>
                  <p>Selecione uma imagem da lista para ajustar o corte e o zoom.</p>
                </div>
            )}
        </div>
      </div>

      {/* Hidden elements for canvas capture */}
      <div className="absolute -z-10" style={{left: '-9999px', top: '0px' }}>
          {polaroids.map(p => (
              <div 
                  key={p.id}
                  ref={(el) => { finalImageRefs.current[p.id] = el; }}
                  className={cn(
                    "relative w-[300px] h-[360px] bg-white p-4 flex flex-col items-center",
                    p.showBorder && "border border-black"
                  )}
                  style={{fontFamily: p.fontFamily }}
                >
                  <div className="w-[268px] h-[268px] bg-gray-200">
                      {p.croppedSrc && <img src={p.croppedSrc} className="w-full h-full object-cover" alt="cropped preview" />}
                  </div>
                  <div className="w-full flex-grow flex items-center justify-center pt-2">
                    <p className="text-center text-lg text-gray-800 whitespace-pre-wrap">{p.text}</p>
                  </div>
              </div>
          ))}
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
