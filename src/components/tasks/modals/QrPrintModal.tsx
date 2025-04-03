import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Grid,
  Slider,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  SelectChangeEvent,
  ButtonGroup,
  Menu
} from '@mui/material';
import {
  Close as CloseIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
  Image as ImageIcon,
  TextFields as TextFieldsIcon,
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon,
  Download as DownloadIcon,
  FormatAlignLeftOutlined,
  FormatAlignCenterOutlined,
  FormatAlignRightOutlined,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import domtoimage from 'dom-to-image';
import { v4 as uuidv4 } from 'uuid';

// A5 boyutları (piksel olarak)
const a5Dimensions = {
  portrait: { width: 420, height: 595 }, // Dikey A5
  landscape: { width: 595, height: 420 } // Yatay A5
};

interface QrPrintModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
}

const QrPrintModal: React.FC<QrPrintModalProps> = ({ open, onClose, task }) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageColor, setPageColor] = useState('#ffffff');
  const printRef = useRef<HTMLDivElement>(null);
  const [qrSize, setQrSize] = useState(120);
  const [position, setPosition] = useState({ x: 150, y: 150 });
  const [dragging, setDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [showQrCode, setShowQrCode] = useState(false);
  // Dosya girişi için ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Metin düzenleme için state'ler
  const [textContent, setTextContent] = useState('Yeni Metin');
  const [textFont, setTextFont] = useState('Roboto');
  const [textSize, setTextSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  
  // Yeniden boyutlandırma işlemleri için gerekli state'ler
  const [resizing, setResizing] = useState(false);
  const [resizeItemId, setResizeItemId] = useState<string | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState({ x: 0, y: 0 });
  const [initialWidth, setInitialWidth] = useState(0);
  
  // Yeni state'ler
  const [pageItems, setPageItems] = useState<Array<{
    id: string;
    type: 'qr' | 'logo' | 'text';
    position: { x: number, y: number };
    size?: number;
    width?: number; // Metin genişliği için yeni alan ekledik
    content?: string;
    imageUrl?: string;
    selected?: boolean;
    font?: string;
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    textAlign?: 'left' | 'center' | 'right';
  }>>([]);
  
  // Tasarım kaydetme ve seçme için eklenen state'ler
  const [saveLayoutDialogOpen, setSaveLayoutDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [savedLayouts, setSavedLayouts] = useState<Array<{id: string, name: string}>>([]);
  const [selectLayoutMenuAnchor, setSelectLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Modal açıldığında lokalden kaydedilmiş düzeni yükle
  useEffect(() => {
    if (open && task) {
      // Debug bilgisi set etmeyi kaldırıyorum
      loadSavedLayout();
      loadSavedLayoutsList();
    }
  }, [open, task]);

  // Kaydedilmiş tasarımların listesini yükle
  const loadSavedLayoutsList = () => {
    try {
      const savedLayoutsStr = localStorage.getItem('savedQrLayouts');
      if (savedLayoutsStr) {
        const layouts = JSON.parse(savedLayoutsStr);
        setSavedLayouts(layouts);
      } else {
        setSavedLayouts([]);
      }
    } catch (error) {
      console.error('Kaydedilmiş tasarımlar yüklenirken hata:', error);
      setSavedLayouts([]);
    }
  };

  // Düzeni localStorage'dan yükle
  const loadSavedLayout = () => {
    if (!task || !task.id) return;

    try {
      const savedLayout = localStorage.getItem(`qrLayout_${task.id}`);
      if (savedLayout) {
        const layoutData = JSON.parse(savedLayout);
        setPageItems(layoutData.items || []);
        setOrientation(layoutData.orientation || 'portrait');
        setPageColor(layoutData.pageColor || '#ffffff');
        
        // QR kodu göster
        const hasQrCode = layoutData.items.some((item: any) => item.type === 'qr');
        setShowQrCode(hasQrCode);
      } else {
        // İlk defa açılıyorsa varsayılan değerleri ayarla
        setPageItems([]);
        setShowQrCode(false);
      }
    } catch (error) {
      console.error('Kaydedilmiş düzeni yükleme hatası:', error);
      setPageItems([]);
      setShowQrCode(false);
    }
  };

  // Düzeni localStorage'a kaydet
  const saveLayout = () => {
    if (!task || !task.id) return;

    try {
      const layoutData = {
        items: pageItems,
        orientation,
        pageColor
      };
      localStorage.setItem(`qrLayout_${task.id}`, JSON.stringify(layoutData));
    } catch (error) {
      console.error('Düzen kaydetme hatası:', error);
    }
  };

  // QR Kod ekleme fonksiyonu
  const handleAddQrCode = useCallback(() => {
    if (!task || !task.id) {
      console.error("Geçerli görev veya görev ID'si yok:", task);
      return;
    }
    
    // QR kodu pageItems'a ekle
    const newItem = {
      id: `qr-${Date.now()}`,
      type: 'qr' as const,
      position: { x: a5Dimensions.width / 2, y: a5Dimensions.height / 2 },
      size: qrSize,
      content: `https://gts.mt-teknoloji.com/#/surveys/${task.id}`,
      selected: false
    };
    
    setPageItems(prev => [...prev, newItem]);
    setShowQrCode(true);
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  }, [task, qrSize]);

  // Metin ekleme işlevi
  const handleAddText = () => {
    const newId = uuidv4();
    setPageItems([...pageItems, {
      id: newId,
      type: 'text',
      position: { x: a5Dimensions.width / 2, y: a5Dimensions.height / 2 },
      content: 'Yeni Metin',
      font: 'Roboto',
      fontSize: 16,
      color: '#000000',
      bold: false,
      italic: false,
      textAlign: 'left',
      width: 200, // Varsayılan genişlik
      selected: true
    }]);
    
    // Sadece yeni eklenen öğe seçili olsun
    setPageItems(prev => prev.map(item => ({
      ...item,
      selected: item.id === newId
    })));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // Metin içeriğini güncelleme
  const handleTextContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = e.target.value;
    setTextContent(newContent);
    
    // Seçili metni güncelle
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          content: newContent
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // Yazı tipini güncelleme
  const handleFontChange = (event: SelectChangeEvent) => {
    const newFont = event.target.value;
    setTextFont(newFont);
    
    // Seçili metni güncelle
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          font: newFont
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // Yazı boyutunu güncelleme
  const handleFontSizeChange = (event: Event, newValue: number | number[]) => {
    const newSize = newValue as number;
    setTextSize(newSize);
    
    // Seçili metni güncelle
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          fontSize: newSize
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // Yazı rengini güncelleme
  const handleColorChange = (color: string) => {
    setTextColor(color);
    
    // Seçili metni güncelle
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          color: color
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // Kalın yazıyı açıp kapatma
  const handleToggleBold = () => {
    const newBold = !textBold;
    setTextBold(newBold);
    
    // Seçili metni güncelle
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          bold: newBold
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // İtalik yazıyı açıp kapatma
  const handleToggleItalic = () => {
    const newItalic = !textItalic;
    setTextItalic(newItalic);
    
    // Seçili metni güncelle
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          italic: newItalic
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  // Öğe seçildiğinde düzenleme alanlarını güncelle
  useEffect(() => {
    const selectedItem = pageItems.find(item => item.selected && item.type === 'text');
    if (selectedItem && selectedItem.type === 'text') {
      // Text ayarlarını güncelle
      setTextContent(selectedItem.content || 'Metin');
      setTextFont(selectedItem.font || 'Roboto');
      setTextSize(selectedItem.fontSize || 16);
      setTextColor(selectedItem.color || '#000000');
      setTextBold(selectedItem.bold || false);
      setTextItalic(selectedItem.italic || false);
      // textAlign değerini de burada güncelle
    }
  }, [pageItems]);

  // Logo ekleme işlevi
  const handleAddLogo = () => {
    // Dosya seçme dialogunu aç
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Dosya yükleme fonksiyonu
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !task) return;
    
    // Sadece resim dosyalarını kabul et
    if (!file.type.startsWith('image/')) {
      alert('Lütfen sadece resim dosyası yükleyin (PNG, JPG, JPEG).');
      return;
    }
    
    // Resmi URL olarak oku
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      
      // Sayfaya logo ekle
      const newItem = {
        id: `logo-${Date.now()}`,
        type: 'logo' as const,
        position: { x: a5Dimensions.width / 2, y: a5Dimensions.height / 4 },
        size: 100,
        content: file.name,
        imageUrl,
        selected: false
      };
      
      setPageItems(prev => [...prev, newItem]);
      
      // Düzeni kaydet
      setTimeout(saveLayout, 100);
    };
    
    reader.readAsDataURL(file);
    
    // Input değerini sıfırla (aynı dosyayı tekrar seçebilmek için)
    event.target.value = '';
  };

  // Öğe seçme işlevi
  const handleSelectItem = (id: string) => {
    setPageItems(prev => prev.map(item => ({
      ...item,
      selected: item.id === id
    })));
  };

  // Seçili öğeyi silme işlevi
  const handleDeleteSelected = () => {
    setPageItems(prev => {
      const newItems = prev.filter(item => !item.selected);
      
      // QR kodu silindi mi kontrol et
      const hasQrCode = newItems.some(item => item.type === 'qr');
      if (!hasQrCode) {
        setShowQrCode(false);
      }
      
      // Düzeni kaydet
      setTimeout(saveLayout, 100);
      
      return newItems;
    });
  };

  // A5 boyutları (piksel olarak)
  const a5Dimensions = orientation === 'portrait' 
    ? { width: 420, height: 595 } // Dikey A5
    : { width: 595, height: 420 }; // Yatay A5

  // Sürükleme işlemleri
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, itemId: string) => {
    // Olayı durdurup varsayılan eylemleri engelle
    e.preventDefault();
    e.stopPropagation();
    
    // Öğeyi seç
    handleSelectItem(itemId);
    
    // Öğeyi sürükleme moduna al
    setDragging(true);
    
    // Seçilen öğenin pozisyonunu bul
    const item = pageItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Tıklama noktası ile öğe konumu arasındaki farkı hesapla
    // Bu, sürükleme sırasında öğenin göreceli pozisyonunu korumamızı sağlar
    setStartPoint({
      x: e.clientX - item.position.x,
      y: e.clientY - item.position.y
    });
  };

  // Boyutlandırma başlangıç fonksiyonu
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Öğeyi seç
    handleSelectItem(itemId);
    
    // Yeniden boyutlandırma modunu aç
    setResizing(true);
    setResizeItemId(itemId);
    
    // Başlangıç noktasını kaydet
    setResizeStartPoint({
      x: e.clientX,
      y: e.clientY
    });
    
    // Öğenin başlangıç genişliğini kaydet
    const item = pageItems.find(i => i.id === itemId);
    if (item) {
      setInitialWidth(item.width || 200);
    }
  };

  // Fare hareketi fonksiyonu - hem sürükleme hem boyutlandırma için
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Varsayılan eylemleri ve metin seçimini engelle
    e.preventDefault();
    e.stopPropagation();
    
    // Yeniden boyutlandırma modu
    if (resizing && resizeItemId) {
      const item = pageItems.find(i => i.id === resizeItemId);
      if (!item) return;
      
      // Hareket miktarını hesapla
      const dx = e.clientX - resizeStartPoint.x;
      
      // Minimum 100px, maksimum A5 genişliği kadar olabilir
      let newWidth = Math.max(100, Math.min(a5Dimensions.width - 40, initialWidth + dx));
      
      // Sadece genişliği güncelle, pozisyon ve diğer özellikleri koru
      setPageItems(prev => prev.map(item => {
        if (item.id === resizeItemId) {
          return {
            ...item,
            width: newWidth
          };
        }
        return item;
      }));
      return;
    }
    
    // Normal sürükleme modu
    if (!dragging) return;
    
    // Seçili öğeyi bul
    const selectedItem = pageItems.find(item => item.selected);
    if (!selectedItem) return;
    
    // Yeni pozisyonu hesapla
    const newX = e.clientX - startPoint.x;
    const newY = e.clientY - startPoint.y;
    
    // Sınırlar için kullanılacak değerleri hesapla
    let minEdgeDistance = 20; // Minimum kenar mesafesi
    
    if (selectedItem.type === 'qr') {
      minEdgeDistance = (selectedItem.size || qrSize) / 2;
    } else if (selectedItem.type === 'logo') {
      minEdgeDistance = (selectedItem.size || 100) / 2;
    } else if (selectedItem.type === 'text') {
      // Metin için daha büyük bir sınır kullan ki tamamen görünür kalsın
      minEdgeDistance = 50;
    }
    
    // A5 sayfa sınırları içinde kal
    const boundedX = Math.max(minEdgeDistance, Math.min(a5Dimensions.width - minEdgeDistance, newX));
    const boundedY = Math.max(minEdgeDistance, Math.min(a5Dimensions.height - minEdgeDistance, newY));
    
    // Öğenin SADECE pozisyonunu güncelle, boyutunu değiştirme
    setPageItems(prev => prev.map(item => {
      if (item.selected) {
        return {
          ...item,
          position: { x: boundedX, y: boundedY }
        };
      }
      return item;
    }));
  };

  // Fare bırakma fonksiyonu
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Yeniden boyutlandırma modunu kapat
    if (resizing) {
      setResizing(false);
      setResizeItemId(null);
      saveLayout(); // Değişiklikleri kaydet
      return;
    }
    
    // Normal sürükleme işlemi
    if (dragging) {
      // Varsayılan eylemleri ve metin seçimini engelle
      e.preventDefault();
      e.stopPropagation();
      
      // Sürükleme modunu kapat
      setDragging(false);
      
      // Değişiklikleri kaydet
      saveLayout();
    }
  };

  // Yazdırma fonksiyonu
  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Geçici olarak seçili öğeleri sakla
    const selectedItems = pageItems.filter(item => item.selected);
    
    try {
      // Seçimleri geçici olarak kaldır
      setPageItems(prevItems => prevItems.map(item => ({
        ...item,
        selected: false
      })));
      
      // DOM'un güncellenmesi için kısa bir gecikme ekle
      setTimeout(() => {
        if (!printRef.current) return;
        
        // dom-to-image ile A5 sayfasını JPG olarak oluştur
        domtoimage.toJpeg(printRef.current, { 
          quality: 0.95,
          bgcolor: pageColor,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            width: `${printRef.current.offsetWidth}px`,
            height: `${printRef.current.offsetHeight}px`
          }
        })
        .then(function (dataUrl) {
          // JPG'yi yazdır
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert('Lütfen popup pencerelerine izin verin.');
            
            // Seçimleri geri yükle
            setPageItems(prevItems => prevItems.map(item => ({
              ...item,
              selected: selectedItems.some(selItem => selItem.id === item.id)
            })));
            return;
          }
          
          const printCSS = `
            @page {
              size: ${orientation === 'portrait' ? 'A5 portrait' : 'A5 landscape'};
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: white;
            }
            img {
              width: ${orientation === 'portrait' ? '148mm' : '210mm'};
              height: ${orientation === 'portrait' ? '210mm' : '148mm'};
              object-fit: contain;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `;
          
          // Yazdırma penceresi içeriğini oluştur
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${task?.name || 'Görev'} QR Kodu</title>
                <style>${printCSS}</style>
              </head>
              <body>
                <img src="${dataUrl}" alt="QR Kod Sayfası" />
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          
          printWindow.document.close();
          
          // Seçimleri geri yükle
          setTimeout(() => {
            setPageItems(prevItems => prevItems.map(item => ({
              ...item,
              selected: selectedItems.some(selItem => selItem.id === item.id)
            })));
          }, 1000);
        })
        .catch(function (error) {
          console.error('Dom-to-image hatası:', error);
          alert('Sayfa görüntüsü oluşturulurken bir hata oluştu.');
          
          // Seçimleri geri yükle
          setPageItems(prevItems => prevItems.map(item => ({
            ...item,
            selected: selectedItems.some(selItem => selItem.id === item.id)
          })));
        });
      }, 300); // Daha uzun gecikme ile DOM'un tamamen yüklenmesini bekle
    } catch (error) {
      console.error('Yazdırma hatası:', error);
      alert('Yazdırma sırasında bir hata oluştu.');
      
      // Hata durumunda seçimleri geri yükle
      setPageItems(prevItems => prevItems.map(item => ({
        ...item,
        selected: selectedItems.some(selItem => selItem.id === item.id)
      })));
    }
  };

  // Yönlendirme değiştiğinde düzeni güncelle ve kaydet
  useEffect(() => {
    if (open && task) {
      saveLayout();
    }
  }, [orientation, pageColor, open, task]);

  // Tasarımı kaydet dialogunu aç
  const handleOpenSaveDialog = () => {
    setLayoutName('');
    setSaveLayoutDialogOpen(true);
  };

  // Tasarımı isimlendirerek kaydet
  const handleSaveNamedLayout = () => {
    if (!layoutName.trim()) return;
    
    try {
      const newLayoutId = `layout_${Date.now()}`;
      const layoutData = {
        items: pageItems,
        orientation,
        pageColor
      };
      
      // Yeni tasarımı kaydet
      localStorage.setItem(`qrLayout_${newLayoutId}`, JSON.stringify(layoutData));
      
      // Tasarım listesini güncelle
      const updatedLayouts = [...savedLayouts, { id: newLayoutId, name: layoutName }];
      localStorage.setItem('savedQrLayouts', JSON.stringify(updatedLayouts));
      setSavedLayouts(updatedLayouts);
      
      // Dialog'u kapat
      setSaveLayoutDialogOpen(false);
    } catch (error) {
      console.error('Tasarım kaydetme hatası:', error);
    }
  };

  // Tasarım seçme menüsünü aç
  const handleOpenSelectMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectLayoutMenuAnchor(event.currentTarget);
  };

  // Kaydedilmiş tasarımı yükle
  const handleLoadLayout = (layoutId: string) => {
    try {
      const savedLayout = localStorage.getItem(`qrLayout_${layoutId}`);
      if (savedLayout) {
        const layoutData = JSON.parse(savedLayout);
        setPageItems(layoutData.items || []);
        setOrientation(layoutData.orientation || 'portrait');
        setPageColor(layoutData.pageColor || '#ffffff');
        
        // QR kodu göster
        const hasQrCode = layoutData.items.some((item: any) => item.type === 'qr');
        setShowQrCode(hasQrCode);

        // Görev için seçilen tasarımı kaydet
        if (task && task.id) {
          localStorage.setItem(`qrLayout_${task.id}`, savedLayout);
        }
      }
    } catch (error) {
      console.error('Tasarım yükleme hatası:', error);
    }
    
    // Menüyü kapat
    setSelectLayoutMenuAnchor(null);
  };

  // Modal kapanırken güncel düzeni görev için kaydet
  const handleCloseWithSave = () => {
    if (task && task.id) {
      saveLayout(); // Mevcut tasarımı kaydet
    }
    onClose(); // Modalı kapat
  };

  // handleSaveImage fonksiyonunu ekle (yaklaşık 1200. satır civarında handlePrint fonksiyonundan sonra olmalı)
  const handleSaveImage = () => {
    if (!printRef.current) return;
    
    // Geçici olarak seçili öğeleri sakla
    const selectedItems = pageItems.filter(item => item.selected);
    
    try {
      // Seçimleri geçici olarak kaldır
      setPageItems(prevItems => prevItems.map(item => ({
        ...item,
        selected: false
      })));
      
      // DOM'un güncellenmesi için kısa bir gecikme ekle
      setTimeout(() => {
        if (!printRef.current) return;
        
        // dom-to-image ile A5 sayfasını JPG olarak oluştur
        domtoimage.toJpeg(printRef.current, { 
          quality: 0.95,
          bgcolor: pageColor,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            width: `${printRef.current.offsetWidth}px`,
            height: `${printRef.current.offsetHeight}px`
          }
        })
        .then(function (dataUrl) {
          // İndirme bağlantısı oluştur
          const link = document.createElement('a');
          link.download = `${task?.name || 'Görev'}_QR_Kodu.jpg`;
          link.href = dataUrl;
          link.click();
          
          // Seçimleri geri yükle
          setPageItems(prevItems => prevItems.map(item => ({
            ...item,
            selected: selectedItems.some(selItem => selItem.id === item.id)
          })));
        })
        .catch(function (error) {
          console.error('Dom-to-image hatası:', error);
          alert('Görüntü oluşturulurken bir hata oluştu.');
          
          // Seçimleri geri yükle
          setPageItems(prevItems => prevItems.map(item => ({
            ...item,
            selected: selectedItems.some(selItem => selItem.id === item.id)
          })));
        });
      }, 300);
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Görüntü kaydedilirken bir hata oluştu.');
      
      // Hata durumunda seçimleri geri yükle
      setPageItems(prevItems => prevItems.map(item => ({
        ...item,
        selected: selectedItems.some(selItem => selItem.id === item.id)
      })));
    }
  };

  // Hizalama fonksiyonlarını ekle - handleToggleBold fonksiyonundan sonra
  const handleTextAlign = (align: 'left' | 'center' | 'right') => {
    setPageItems(prev => prev.map(item => {
      if (item.selected && item.type === 'text') {
        return {
          ...item,
          textAlign: align
        };
      }
      return item;
    }));
    
    // Düzeni kaydet
    setTimeout(saveLayout, 100);
  };

  if (!task) return null;

  return (
    <Dialog
      open={open}
      onClose={handleCloseWithSave} // onClose yerine handleCloseWithSave kullan
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          height: '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2
      }}>
        <Typography variant="h6" fontWeight="bold">QR Kod Sayfası Tasarla</Typography>
        <IconButton onClick={handleCloseWithSave} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
          {/* Sol Bölüm - A5 Tasarım Alanı */}
          <Box 
            sx={{ 
              flex: 2, 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'grey.100',
              overflow: 'auto'
            }}
          >
            <Paper
              ref={printRef}
              elevation={3}
              sx={{
                width: a5Dimensions.width,
                height: a5Dimensions.height,
                backgroundColor: pageColor,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                userSelect: 'none', // Tüm içerik için metin seçimini engelle
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* A5 sayfasına eklenen öğeler */}
              {pageItems.map(item => {
                if (item.type === 'qr' && task.id) {
                  return (
                    <Box 
                      key={item.id}
                      sx={{ 
                        position: 'absolute',
                        top: item.position.y,
                        left: item.position.x,
                        transform: 'translate(-50%, -50%)',
                        cursor: dragging && item.selected ? 'grabbing' : 'grab',
                        backgroundColor: '#ffffff',
                        padding: '10px',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: item.selected ? '2px solid #1976d2' : 'none',
                        zIndex: item.selected ? 10 : 1
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Metin seçimini engelle
                        handleMouseDown(e, item.id);
                      }}
                      className={item.selected ? "no-print" : ""}
                    >
                      <QRCodeCanvas 
                        value={`https://gts.mt-teknoloji.com/#/surveys/${task.id}`}
                        size={item.size || qrSize}
                        level="H" // Yüksek hata düzeltme seviyesi
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        id={`qr-${item.id}`}
                      />
                    </Box>
                  );
                } else if (item.type === 'text') {
                  return (
                    <Box
                      key={item.id}
                      sx={{ 
                        position: 'absolute',
                        top: item.position.y,
                        left: item.position.x,
                        transform: 'translate(-50%, -50%)', // Merkezi hizalama korundu
                        cursor: dragging && item.selected ? 'grabbing' : 'grab',
                        padding: '10px',
                        background: item.selected ? 'rgba(255,255,255,0.9)' : 'transparent',
                        borderRadius: '4px',
                        border: item.selected ? '2px solid #1976d2' : 'none',
                        zIndex: item.selected ? 10 : 1,
                        userSelect: 'none', // Metin seçimini engelle
                        WebkitUserSelect: 'none', // Safari için
                        MozUserSelect: 'none', // Firefox için
                        msUserSelect: 'none', // IE/Edge için
                        width: `${item.width || 200}px`, // Dinamik genişlik kullan
                        boxSizing: 'border-box', // Genişliğin padding dahil olması için
                        '&:hover': {
                          outline: item.selected ? '1px dashed #1976d2' : 'none',
                        },
                        '&:hover::after': item.selected ? {
                          content: '""',
                          position: 'absolute',
                          right: '-4px',
                          bottom: '-4px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#1976d2',
                          borderRadius: '50%',
                          cursor: 'nwse-resize'
                        } : {}
                      }}
                      onMouseDown={(e) => {
                        // Varsayılan metin seçme davranışını engelle
                        e.preventDefault();
                        
                        // Köşe noktasından yeniden boyutlandırma
                        const rect = e.currentTarget.getBoundingClientRect();
                        const isResizeHandle = 
                          e.clientX > rect.right - 15 && 
                          e.clientY > rect.bottom - 15;
                        
                        if (isResizeHandle) {
                          // Yeniden boyutlandırma modu aktif
                          handleResizeStart(e, item.id);
                        } else {
                          // Normal sürükleme modu
                          handleMouseDown(e, item.id);
                        }
                      }}
                      className={item.selected ? "no-print" : ""}
                    >
                      <Typography 
                        variant="body1"
                        sx={{
                          fontFamily: item.font || 'Roboto',
                          fontSize: `${item.fontSize || 16}px`,
                          color: item.color || '#000000',
                          fontWeight: item.bold ? 'bold' : 'normal',
                          fontStyle: item.italic ? 'italic' : 'normal',
                          whiteSpace: 'pre-wrap',
                          pointerEvents: 'none', // İçeriğin fare etkileşimini engelle
                          textAlign: item.textAlign || 'left', // Metin hizalama özelliğini ekle
                          width: '100%', // Yüzde 100 genişlik belirledik
                          display: 'block' // Blok element olarak görüntülenecek
                        }}
                      >
                        {item.content || 'Metin'}
                      </Typography>
                    </Box>
                  );
                } else if (item.type === 'logo') {
                  return (
                    <Box
                      key={item.id}
                      sx={{ 
                        position: 'absolute',
                        top: item.position.y,
                        left: item.position.x,
                        transform: 'translate(-50%, -50%)',
                        cursor: dragging && item.selected ? 'grabbing' : 'grab',
                        width: `${item.size}px`,
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        border: item.selected ? '2px solid #1976d2' : 'none',
                        zIndex: item.selected ? 10 : 1,
                        overflow: 'hidden'
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Metin seçimini engelle
                        handleMouseDown(e, item.id);
                      }}
                      className={item.selected ? "no-print" : ""}
                    >
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.content || 'Logo'} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            pointerEvents: 'none' // Resim etkileşimini engelle
                          }} 
                        />
                      ) : (
                        <ImageIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                      )}
                    </Box>
                  );
                }
                return null;
              })}
            </Paper>
          </Box>

          {/* Sağ Bölüm - Araçlar */}
          <Box sx={{ 
            flex: 1, 
            borderLeft: '1px solid', 
            borderColor: 'divider',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            overflowY: 'auto'
          }}>
            {/* Sayfa Yönlendirmesi */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Sayfa Yönlendirmesi
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup 
                  row 
                  value={orientation} 
                  onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                >
                  <FormControlLabel 
                    value="portrait" 
                    control={<Radio />} 
                    label="Dikey" 
                  />
                  <FormControlLabel 
                    value="landscape" 
                    control={<Radio />} 
                    label="Yatay" 
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            <Divider />

            {/* Seçili öğeyi silme butonu */}
            {pageItems.some(item => item.selected) && (
              <Box>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  startIcon={<DeleteIcon />}
                  sx={{ py: 1.5, mb: 2 }}
                  onClick={handleDeleteSelected}
                >
                  Seçili Öğeyi Sil
                </Button>
              </Box>
            )}

            {/* QR Ekle Butonu */}
            <Box>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<QrCodeIcon />}
                sx={{ py: 1.5, mb: 2 }}
                onClick={handleAddQrCode}
                disabled={pageItems.some(item => item.type === 'qr')}
              >
                QR Ekle
              </Button>
              
              {pageItems.some(item => item.type === 'qr') && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    QR Kod Boyutu:
                  </Typography>
                  <Slider
                    min={80}
                    max={200}
                    step={10}
                    value={qrSize}
                    onChange={(_, value) => {
                      setQrSize(value as number);
                      // Seçili QR kodunun boyutunu güncelle
                      setPageItems(prev => prev.map(item => {
                        if (item.type === 'qr' && item.selected) {
                          return {
                            ...item,
                            size: value as number
                          };
                        }
                        return item;
                      }));
                      // Değişiklikleri kaydet
                      setTimeout(saveLayout, 100);
                    }}
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>

            {/* Logo Ekle Butonu */}
            <Box>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<ImageIcon />}
                sx={{ py: 1.5, mb: 2 }}
                onClick={handleAddLogo}
              >
                Logo Ekle
              </Button>
              
              {/* Gizli dosya girişi */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileUpload}
              />
              
              {pageItems.some(item => item.type === 'logo' && item.selected) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Logo Boyutu:
                  </Typography>
                  <Slider
                    min={50}
                    max={300}
                    step={10}
                    value={pageItems.find(item => item.type === 'logo' && item.selected)?.size || 100}
                    onChange={(_, value) => {
                      // Seçili logonun boyutunu güncelle
                      setPageItems(prev => prev.map(item => {
                        if (item.type === 'logo' && item.selected) {
                          return {
                            ...item,
                            size: value as number
                          };
                        }
                        return item;
                      }));
                      // Değişiklikleri kaydet
                      setTimeout(saveLayout, 100);
                    }}
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>

            {/* Metin Ekle Butonu */}
            <Box>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<TextFieldsIcon />}
                sx={{ py: 1.5, mb: 2 }}
                onClick={handleAddText}
              >
                Metin Ekle
              </Button>
              
              {/* Metin Düzenleme Paneli */}
              {pageItems.some(item => item.type === 'text' && item.selected) && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Metin Düzenleme
                  </Typography>
                  
                  {/* Metin İçeriği */}
                  <TextField
                    fullWidth
                    label="Metin"
                    value={textContent}
                    onChange={handleTextContentChange}
                    margin="dense"
                    size="small"
                    multiline
                    rows={2}
                  />
                  
                  {/* Yazı Tipi */}
                  <FormControl fullWidth margin="dense" size="small">
                    <InputLabel>Yazı Tipi</InputLabel>
                    <Select
                      value={textFont}
                      label="Yazı Tipi"
                      onChange={handleFontChange}
                    >
                      <MenuItem value="Roboto">Roboto</MenuItem>
                      <MenuItem value="Arial">Arial</MenuItem>
                      <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                      <MenuItem value="Courier New">Courier New</MenuItem>
                      <MenuItem value="Georgia">Georgia</MenuItem>
                      <MenuItem value="Verdana">Verdana</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {/* Yazı Boyutu */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" gutterBottom>
                      Yazı Boyutu: {textSize}px
                    </Typography>
                    <Slider
                      min={8}
                      max={48}
                      step={1}
                      value={textSize}
                      onChange={handleFontSizeChange}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  
                  {/* Metin Formatı ve Rengi */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', mt: 2, gap: 1 }}>
                    {/* Yazı Hizalama - YENİ */}
                    <Typography variant="caption" gutterBottom>
                      Yazı Hizalama
                    </Typography>
                    <ButtonGroup size="small" fullWidth>
                      <Button 
                        onClick={() => handleTextAlign('left')}
                        variant={
                          pageItems.find(item => item.selected && item.type === 'text')?.textAlign === 'left' 
                            ? 'contained' 
                            : 'outlined'
                        }
                      >
                        <FormatAlignLeftOutlined />
                      </Button>
                      <Button 
                        onClick={() => handleTextAlign('center')}
                        variant={
                          pageItems.find(item => item.selected && item.type === 'text')?.textAlign === 'center' 
                            ? 'contained' 
                            : 'outlined'
                        }
                      >
                        <FormatAlignCenterOutlined />
                      </Button>
                      <Button 
                        onClick={() => handleTextAlign('right')}
                        variant={
                          pageItems.find(item => item.selected && item.type === 'text')?.textAlign === 'right' 
                            ? 'contained' 
                            : 'outlined'
                        }
                      >
                        <FormatAlignRightOutlined />
                      </Button>
                    </ButtonGroup>

                    {/* Kalın/İtalik butonları */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" gutterBottom>
                        Yazı Stili
                      </Typography>
                      <Box>
                        <IconButton 
                          size="small" 
                          onClick={handleToggleBold}
                          color={textBold ? "primary" : "default"}
                          sx={{ border: textBold ? '1px solid' : 'none' }}
                        >
                          <Typography sx={{ fontWeight: 'bold' }}>B</Typography>
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={handleToggleItalic}
                          color={textItalic ? "primary" : "default"}
                          sx={{ border: textItalic ? '1px solid' : 'none', ml: 1 }}
                        >
                          <Typography sx={{ fontStyle: 'italic' }}>I</Typography>
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* Genişletilmiş Renk Paleti - GENİŞLETİLDİ */}
                    <Typography variant="caption" gutterBottom display="block" sx={{ mt: 1 }}>
                      Yazı Rengi
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {[
                        '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
                        '#FF0000', '#FF6600', '#FFCC00', '#FFFF00', '#CCFF00', '#66FF00',
                        '#00FF00', '#00FF66', '#00FFCC', '#00FFFF', '#00CCFF', '#0066FF',
                        '#0000FF', '#6600FF', '#CC00FF', '#FF00FF', '#FF00CC', '#FF0066'
                      ].map(color => (
                        <Box
                          key={color}
                          onClick={() => handleColorChange(color)}
                          sx={{
                            width: 18,
                            height: 18,
                            bgcolor: color,
                            borderRadius: '2px',
                            cursor: 'pointer',
                            border: textColor === color ? '2px solid #1976d2' : '1px solid #e0e0e0',
                            '&:hover': { opacity: 0.8 }
                          }}
                        />
                      ))}
                      {/* Özel Renk Seçici */}
                      <Box
                        onClick={() => document.getElementById('custom-color-picker')?.click()}
                        sx={{
                          width: 18,
                          height: 18,
                          border: '1px dashed #aaa',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>+</span>
                      </Box>
                      <input
                        type="color"
                        id="custom-color-picker"
                        value={textColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Arkaplan Rengi */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Arkaplan Rengi
              </Typography>
              <Grid container spacing={1}>
                {['#ffffff', '#f5f5f5', '#fafafa', '#eeeeee', '#e0e0e0', '#FFEBEE', '#E3F2FD', '#E8F5E9', '#FFF8E1'].map((color) => (
                  <Grid item xs={4} key={color}>
                    <Box 
                      onClick={() => setPageColor(color)}
                      sx={{
                        width: '100%',
                        height: 40,
                        bgcolor: color,
                        border: pageColor === color ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleOpenSaveDialog}
          >
            Tasarımı Kaydet
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FolderOpenIcon />}
            onClick={handleOpenSelectMenu}
            disabled={savedLayouts.length === 0}
          >
            Tasarım Seç
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<PrintIcon />} 
            onClick={handlePrint}
            sx={{ minWidth: '150px' }}
          >
            Yazdır
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<DownloadIcon />} 
            onClick={handleSaveImage}
            sx={{ minWidth: '150px' }}
          >
            Bilgisayara Kaydet
          </Button>
        </Box>
      </DialogActions>
      
      {/* Tasarım Kaydetme Dialog'u */}
      <Dialog open={saveLayoutDialogOpen} onClose={() => setSaveLayoutDialogOpen(false)}>
        <DialogTitle>Tasarımı Kaydet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tasarım Adı"
            fullWidth
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveLayoutDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleSaveNamedLayout} 
            color="primary" 
            variant="contained"
            disabled={!layoutName.trim()}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Tasarım Seçme Menüsü */}
      <Menu
        anchorEl={selectLayoutMenuAnchor}
        open={Boolean(selectLayoutMenuAnchor)}
        onClose={() => setSelectLayoutMenuAnchor(null)}
      >
        {savedLayouts.length > 0 ? (
          savedLayouts.map((layout) => (
            <MenuItem 
              key={layout.id} 
              onClick={() => handleLoadLayout(layout.id)}
            >
              {layout.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>Kayıtlı tasarım bulunamadı</MenuItem>
        )}
      </Menu>
    </Dialog>
  );
};

export default QrPrintModal; 