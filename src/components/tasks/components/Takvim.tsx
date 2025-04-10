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
import { ref, get, onValue, off } from 'firebase/database';
import { database } from '../../../firebase';
import TakvimDetailModal from './TakvimDetailModal';

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

// Görev durumu için renk tanımlamaları
const getTaskStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#4CAF50'; // Yeşil
    case 'pending':
      return '#FF9800'; // Turuncu
    case 'missed':
      return '#F44336'; // Kırmızı
    case 'accepted':
      return '#9C27B0'; // Mor
    case 'started':
      return '#2196F3'; // Mavi
    default:
      return '#757575'; // Gri
  }
};

const Takvim: React.FC<TakvimProps> = ({ companyId }) => {
  const [view, setView] = useState<string>('dayGridMonth');
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const calendarRef = React.useRef<FullCalendar>(null);
  
  // Modal için state'ler
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<any[]>([]);
  const [monthlyTasks, setMonthlyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Tüm görevleri saklayan state
  const [allTasks, setAllTasks] = useState<any[]>([]);

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

  // Firebase'den görevleri çek
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    
    // Görevleri dinle
    const tasksRef = ref(database, `companies/${companyId}/tasks`);
    const weeklyTasksRef = ref(database, `companies/${companyId}/weeklyTasks`);
    
    const handleTasksData = (snapshot: any) => {
      if (!snapshot.exists()) {
        setAllTasks([]);
        setEvents([]);
        setLoading(false);
        return;
      }
      
      const tasksData = snapshot.val();
      const tasksArray = Object.keys(tasksData).map(key => ({
        id: key,
        ...tasksData[key]
      }));
      
      setAllTasks(tasksArray);
      
      // Haftalık görevler için
      get(weeklyTasksRef).then((weeklySnapshot) => {
        let weeklyTasksData: any[] = [];
        
        if (weeklySnapshot.exists()) {
          const data = weeklySnapshot.val();
          weeklyTasksData = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
        }
        
        // Günlük görevleri bul
        const dailyTasks = tasksArray.filter(task => 
          task.isRecurring && task.repeatType === 'daily'
        );
        
        // Takvim eventlerini oluştur
        const calendarEvents = [];
        
        // Bugün
        const today = new Date();
        
        // Geçmiş ve gelecek tarih aralığı
        const pastDays = 90;
        const futureDays = 180;
        
        // Her gün için event oluştur
        for (let i = -pastDays; i <= futureDays; i++) {
          const date = new Date();
          date.setDate(today.getDate() + i);
          
          const currentDay = date.getDay(); // 0: Pazar, 1: Pazartesi, ...
          
          // O güne ait haftalık görevleri bul
          const weeklyTasksForDay = weeklyTasksData.filter(task => {
            if (!task.days) return false;
            
            // task.days nesnesinde gün numarası (0-6) key olarak var mı kontrol et
            return task.days[currentDay] !== undefined;
          });
          
          // Haftalık görevler için event oluştur
          if (weeklyTasksForDay.length > 0) {
            calendarEvents.push({
              id: `weekly-tasks-${i}`,
              title: 'Haftalık Görevler',
              start: new Date(date.setHours(0, 0, 0, 0)),
              end: new Date(date.setHours(23, 59, 59, 999)),
              allDay: true,
              backgroundColor: '#9C27B0', // Mor
              borderColor: '#7B1FA2',
              extendedProps: {
                taskCount: weeklyTasksForDay.length,
                taskType: 'weekly',
                date: new Date(date),
                dayOfWeek: currentDay
              }
            });
          }
          
          // Eğer günlük görevler varsa
          if (dailyTasks.length > 0) {
            calendarEvents.push({
              id: `daily-tasks-${i}`,
              title: 'Günlük Görevler',
              start: new Date(date.setHours(0, 0, 0, 0)),
              end: new Date(date.setHours(23, 59, 59, 999)),
              allDay: true,
              backgroundColor: '#2196F3', // Mavi
              borderColor: '#1976D2',
              extendedProps: {
                taskCount: dailyTasks.length,
                taskType: 'daily',
                date: new Date(date)
              }
            });
          }
        }
        
        setEvents(calendarEvents);
        setLoading(false);
      }).catch(error => {
        console.error("Haftalık görevleri yüklerken hata:", error);
        setLoading(false);
      });
    };
    
    // Görevi çek
    onValue(tasksRef, handleTasksData);
    
    // Cleanup
    return () => {
      off(tasksRef, 'value', handleTasksData);
    };
  }, [companyId]);

  // Tarih tıklamasını işle - günün görevlerini göster
  const handleDateClick = (info: any) => {
    setSelectedDate(info.date);
    setLoading(true);
    
    // Seçilen tarihin başlangıcı ve sonu
    const selectedDateStart = new Date(info.date);
    selectedDateStart.setHours(0, 0, 0, 0);
    
    const selectedDateEnd = new Date(info.date);
    selectedDateEnd.setHours(23, 59, 59, 999);
    
    // Seçilen günün haftanın kaçıncı günü olduğunu bul (0: Pazar, 1: Pazartesi, ...)
    const selectedDayOfWeek = selectedDateStart.getDay();
    
    // Günlük görevleri filtrele
    const dayTasks = allTasks.filter(task => {
      if (task.isRecurring && task.repeatType === 'daily') {
        return true; // Günlük tekrar eden görevler her gün için geçerli
      }
      return false;
    });
    
    // Haftalık görevleri çek
    const weeklyTasksRef = ref(database, `companies/${companyId}/weeklyTasks`);
    
    get(weeklyTasksRef).then((snapshot) => {
      let weeklyTasks: any[] = [];
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Tüm haftalık görevleri dön
        Object.keys(data).forEach(taskId => {
          const task = data[taskId];
          
          // Görevin seçilen güne (haftanın günü olarak) ait olup olmadığını kontrol et
          if (task.days && task.days[selectedDayOfWeek]) {
            weeklyTasks.push({
              id: taskId,
              ...task,
              // Tekrarlama zamanlarını da ekle
              repetitionTimes: task.days[selectedDayOfWeek].repetitionTimes || []
            });
          }
        });
      }
      
      setDailyTasks(dayTasks);
      setWeeklyTasks(weeklyTasks);
      setMonthlyTasks([]);
      setModalOpen(true);
      setLoading(false);
    }).catch(error => {
      console.error("Haftalık görevleri yüklerken hata:", error);
      setDailyTasks(dayTasks);
      setWeeklyTasks([]);
      setMonthlyTasks([]);
      setModalOpen(true);
      setLoading(false);
    });
  };

  // Modal kapatma işleyici
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <Box sx={{ 
      mt: 2, 
      p: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 'calc(100vh - 120px)', 
    }}>
      <Paper sx={{ 
        p: 2, 
        borderRadius: 2, 
        flex: 1,
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
            eventClick={(info) => {
              // Bir event'a tıklandığında ilgili günün detayını göster
              setSelectedDate(info.event.start || new Date());
              handleDateClick({ date: info.event.start || new Date() });
            }}
            dateClick={handleDateClick}
            height='auto' // İçeriğin tam yüksekliğini alır
            contentHeight='auto' // İçeriğe göre otomatik boyutlandırma
            dayMaxEvents={3} // 3'ten fazla etkinlik varsa "daha fazla" bağlantısı göster
            moreLinkClick="popover" // Fazla etkinlikler için pop-up
            nowIndicator={true}
            editable={false} // Etkinlikleri düzenleme kapalı
            droppable={false} // Sürükle-bırak kapalı
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
      
      {/* Takvim Detay Modalı */}
      <TakvimDetailModal
        open={modalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        dailyTasks={dailyTasks}
        weeklyTasks={weeklyTasks}
        monthlyTasks={monthlyTasks}
        loading={loading}
      />
    </Box>
  );
};

export default Takvim; 