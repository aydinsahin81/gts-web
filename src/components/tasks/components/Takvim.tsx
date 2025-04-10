import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { styled } from '@mui/material/styles';
import { 
  Today as TodayIcon, 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon,
  Event as EventIcon,
  ViewDay as ViewDayIcon,
  ViewWeek as ViewWeekIcon,
  CalendarMonth as MonthIcon
} from '@mui/icons-material';

// Türkçe ay ve gün adları
const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 
  'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const gunlerKisa = ['Paz', 'Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
const aylarKisa = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Takvim başlığını Türkçe olarak biçimlendirmek için
const formatTarih = (date: Date, view: string): string => {
  if (view === 'dayGridMonth') {
    return `${aylar[date.getMonth()]} ${date.getFullYear()}`;
  } else if (view === 'timeGridWeek') {
    return `${date.getDate()} ${aylar[date.getMonth()]} ${date.getFullYear()} Haftası`;
  } else {
    return `${date.getDate()} ${aylar[date.getMonth()]} ${date.getFullYear()}`;
  }
};

// Style için çeşitli bileşenler
const CalendarContainer = styled(Box)(({ theme }) => ({
  minHeight: 'calc(100vh - 230px)', // Minimum yükseklik tanımlıyorum, içerik artınca genişleyebilir
  width: '100%',
  '& .fc': {
    '--fc-border-color': theme.palette.divider,
    '--fc-button-text-color': theme.palette.primary.main,
    '--fc-button-bg-color': 'transparent',
    '--fc-button-border-color': theme.palette.primary.main,
    '--fc-button-hover-bg-color': theme.palette.primary.main,
    '--fc-button-hover-text-color': theme.palette.common.white,
    '--fc-button-active-bg-color': theme.palette.primary.dark,
    '--fc-today-bg-color': `${theme.palette.primary.main}10`,
    '--fc-event-bg-color': theme.palette.primary.main,
    '--fc-event-border-color': theme.palette.primary.dark,
    '--fc-page-bg-color': theme.palette.background.paper,
    '--fc-neutral-bg-color': theme.palette.background.default,
    fontFamily: theme.typography.fontFamily,
  },
  '& .fc .fc-toolbar': {
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '1rem'
  },
  '& .fc .fc-toolbar-title': {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: theme.palette.text.primary
  },
  '& .fc-theme-standard td, .fc-theme-standard th': {
    borderColor: theme.palette.divider
  },
  '& .fc .fc-day-today': {
    backgroundColor: `${theme.palette.primary.main}10`,
  },
  '& .fc-day-header': {
    fontWeight: 600,
    padding: '10px 0'
  },
  '& .fc-event': {
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    borderWidth: '0',
    boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
    transition: 'transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out',
    '&:hover': {
      transform: 'translateY(-1px) scale(1.01)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
    }
  },
  '& .fc-col-header-cell': {
    padding: '8px 0'
  },
  '& .fc-day-number': {
    fontWeight: 500,
    padding: '5px'
  },
  '& .fc-daygrid-event': {
    whiteSpace: 'normal'
  },
  // Mobil uyumluluk için
  [theme.breakpoints.down('sm')]: {
    '& .fc-toolbar': {
      flexDirection: 'column',
      alignItems: 'center'
    },
    '& .fc-dayGridMonth-view .fc-daygrid-day-events': {
      margin: '0 2px'
    },
    '& .fc-header-toolbar .fc-toolbar-chunk': {
      marginBottom: '8px'
    }
  }
}));

// Özel toolbar bileşeni
const CalendarToolbar = ({ 
  calendarRef, 
  view, 
  setView 
} : { 
  calendarRef: React.RefObject<FullCalendar | null>, 
  view: string, 
  setView: (view: string) => void 
}) => {
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      const api = calendar.getApi();
      setCurrentDate(api.getDate());
    }
  }, [calendarRef, view]);
  
  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const changeView = (newView: string) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(newView);
      setView(newView);
      
      // Görünüm değiştiğinde sayfanın boyutunu ayarlayalım
      setTimeout(() => {
        if (newView === 'timeGridDay' || newView === 'timeGridWeek') {
          // Günlük veya haftalık görünümde daha fazla yükseklik
          document.querySelector('.fc-view-harness')?.setAttribute('style', 'height: auto !important; min-height: 1200px !important');
        } else {
          // Aylık görünümde normal yükseklik
          document.querySelector('.fc-view-harness')?.removeAttribute('style');
        }
      }, 100);
    }
  };
  
  const formatCurrentDate = () => {
    let result = '';
    
    if (view === 'timeGridDay') {
      result = `${currentDate.getDate()} ${aylar[currentDate.getMonth()]} ${currentDate.getFullYear()}, ${gunler[currentDate.getDay()]}`;
    } else if (view === 'timeGridWeek') {
      result = `${aylar[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      result = `${aylar[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    
    return result;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Önceki">
            <IconButton onClick={handlePrev} color="primary" size="small">
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bugün">
            <IconButton onClick={handleToday} color="primary" size="small">
              <TodayIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sonraki">
            <IconButton onClick={handleNext} color="primary" size="small">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="h5" sx={{ fontWeight: 600, ml: 2 }}>
            {formatCurrentDate()}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Gün Görünümü">
            <IconButton 
              onClick={() => changeView('timeGridDay')} 
              color={view === 'timeGridDay' ? 'secondary' : 'default'}
              size="small"
            >
              <ViewDayIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Hafta Görünümü">
            <IconButton 
              onClick={() => changeView('timeGridWeek')} 
              color={view === 'timeGridWeek' ? 'secondary' : 'default'}
              size="small"
            >
              <ViewWeekIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ay Görünümü">
            <IconButton 
              onClick={() => changeView('dayGridMonth')} 
              color={view === 'dayGridMonth' ? 'secondary' : 'default'}
              size="small"
            >
              <MonthIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

interface TakvimProps {
  companyId: string | null;
}

const Takvim: React.FC<TakvimProps> = ({ companyId }) => {
  const [view, setView] = useState<string>('dayGridMonth');
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const calendarRef = React.useRef<FullCalendar>(null);

  // Bir başlangıç tarihini ayarla
  useEffect(() => {
    const timer = setTimeout(() => {
      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        setCurrentDate(api.getDate());
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // View değişikliğini izle
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.changeView(view);
      
      // Görünüm değiştiğinde sayfanın boyutunu ayarlayalım
      setTimeout(() => {
        if (view === 'timeGridDay' || view === 'timeGridWeek') {
          // Günlük veya haftalık görünümde daha fazla yükseklik
          document.querySelector('.fc-view-harness')?.setAttribute('style', 'height: auto !important; min-height: 1200px !important');
        } else {
          // Aylık görünümde normal yükseklik
          document.querySelector('.fc-view-harness')?.removeAttribute('style');
        }
      }, 100);
    }
  }, [view, calendarRef]);

  // Örnek etkinlikler
  useEffect(() => {
    // Burada normalde Firebase'den etkinlikleri çekeceğiz
    setEvents([]); // Boş dizi ile başlatıyoruz
  }, []);

  // Etkinlik tıklama
  const handleEventClick = (info: any) => {
    console.log('Etkinlik tıklandı:', info.event);
    // Burada etkinlik detay modalı açılabilir
    alert(`Etkinlik: ${info.event.title}`);
  };

  // Tarih tıklama - yeni etkinlik ekleme
  const handleDateClick = (info: any) => {
    console.log('Tarih tıklandı:', info.date);
    // Burada yeni etkinlik ekleme modalı açılabilir
    const title = prompt('Etkinlik adı:');
    if (title) {
      const newEvent = {
        id: Math.random().toString(),
        title,
        start: info.date,
        allDay: info.allDay,
        backgroundColor: '#4caf50',
        borderColor: '#388e3c',
      };
      
      setEvents([...events, newEvent]);
    }
  };

  return (
    <Box sx={{ 
      mt: 2, 
      p: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 'calc(100vh - 120px)', // Minimum yükseklik, içerik artarsa büyüyebilir
    }}>
      <Paper sx={{ 
        p: 2, 
        borderRadius: 2, 
        flex: 1, // Esnek büyüme
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        // Günlük ve haftalık görünümlerde daha fazla alan
        ...(view === 'timeGridDay' || view === 'timeGridWeek' ? {
          minHeight: '1400px' // Günlük ve haftalık görünüm için daha fazla yükseklik
        } : {})
      }}>
        <CalendarToolbar calendarRef={calendarRef} view={view} setView={setView} />
        
        <CalendarContainer sx={{ 
          flex: 1,
          // Günlük ve haftalık görünümlerde daha fazla alan
          ...(view === 'timeGridDay' || view === 'timeGridWeek' ? {
            minHeight: '1300px' // Günlük ve haftalık görünüm için daha fazla yükseklik
          } : {})
        }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false} // Özel toolbar kullanıyoruz
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height='auto' // İçeriğin tam yüksekliğini alır
            contentHeight='auto' // İçeriğe göre otomatik boyutlandırma
            dayMaxEvents={3} // 3'ten fazla etkinlik varsa "daha fazla" bağlantısı göster
            moreLinkClick="popover" // Fazla etkinlikler için pop-up
            nowIndicator={true}
            editable={true}
            droppable={true}
            selectable={true}
            selectMirror={true}
            weekends={true}
            firstDay={1} // Pazartesi
            slotMinTime="00:00:00" // Gün başlangıcı 00:00
            slotMaxTime="24:00:00" // Gün sonu 24:00 (bir sonraki günün başlangıcı)
            allDaySlot={true}
            slotDuration="01:00:00" // Her hücre 1 saat
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              omitZeroMinute: false, // Dakika sıfır olsa da göster (01:00)
              meridiem: false, // AM/PM gösterme
              hour12: false // 24 saat formatı
            }}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5], // Pazartesi - Cuma
              startTime: '09:00',
              endTime: '17:00',
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false
            }}
            dayHeaderFormat={{
              weekday: 'long' // Gün adları uzun format (Pazartesi, Salı, vb.)
            }}
            buttonText={{
              today: 'Bugün',
              month: 'Ay',
              week: 'Hafta',
              day: 'Gün',
              list: 'Liste'
            }}
            locale="tr"
            weekText="Hft"
            allDayText="Tüm gün"
            moreLinkText="daha fazla"
            noEventsText="Gösterilecek etkinlik yok"
            datesSet={(dateInfo) => {
              // Tarih değişikliklerinde currentDate state'ini güncelle
              setCurrentDate(dateInfo.view.currentStart);
            }}
          />
        </CalendarContainer>
      </Paper>
      
      {/* Sayfanın altında ekstra boşluk */}
      <Box sx={{ height: '100px', width: '100%' }} />
    </Box>
  );
};

export default Takvim; 